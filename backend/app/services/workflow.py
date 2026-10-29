from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException
from backend.app.models import Approval, serialize_doc, serialize_docs, build_id_query
from backend.app.services.audit import write_audit
from backend.app.services.messaging import dispatch_phone_message

CLAIM_SECONDARY_APPROVAL_THRESHOLD = 10000.0  # SEC-106: claims > ₹10,000 need secondary finance sign-off
SLA_REMINDER_COOLDOWN_MINUTES = 10

def calculate_next_reimbursement_friday(ref_date: Optional[datetime] = None) -> str:
    """
    Per SEC-108:
    Reimbursement cycles run weekly on Friday.
    Claims approved by Wednesday 17:00 IST are paid that Friday.
    Claims approved Thursday/Friday/weekend are paid the subsequent Friday.
    """
    now = ref_date or datetime.utcnow()
    # weekday: Monday is 0, Tuesday 1, Wednesday 2, Thursday 3, Friday 4, Saturday 5, Sunday 6
    day = now.weekday()
    if day <= 2:  # Mon, Tue, Wed
        days_ahead = 4 - day
    elif day == 3:  # Thu
        days_ahead = 8
    elif day == 4:  # Fri
        days_ahead = 7
    elif day == 5:  # Sat
        days_ahead = 6
    else:  # Sun
        days_ahead = 5

    friday = (now + timedelta(days=days_ahead)).date()
    return friday.strftime("%Y-%m-%d")


def validate_approver_authority(approval: Dict[str, Any], user: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validates if the user is authorized to act on this approval.
    Allowed actors:
    1. The designated approver_id
    2. Any user with role 'finance' (controllers have administrative override)
    """
    user_id = user.get("id") or user.get("user_id")
    user_role = user.get("role", "")
    target_approver = approval.get("approver_id")

    if user_role == "finance":
        return True, "Authorized via Finance Controller role"

    if user_id == target_approver:
        return True, "Authorized as designated approver"

    return False, (
        f"Unauthorized: Approval {approval.get('id')} is assigned to '{target_approver}'. "
        f"User '{user_id}' ({user_role}) cannot decide this approval without Finance privileges."
    )


async def decide_approval(
    db: Any,
    approval_id: str,
    user: Dict[str, Any],
    decision: str,  # "Approved" | "Rejected"
    notes: str = ""
) -> Dict[str, Any]:
    """
    Executes approval state transition, updates corresponding claim/invoice,
    calculates payment date on approval, and writes an immutable audit record.
    """
    decision = decision.capitalize()
    if decision not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'Approved' or 'Rejected'")

    # Lookup approval record
    query = {"$or": [build_id_query(approval_id), {"approval_id": approval_id}, {"id": approval_id}]}
    approval = await db.approvals.find_one(query)
    if not approval:
        raise HTTPException(status_code=404, detail=f"Approval '{approval_id}' not found")

    if approval.get("state") != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Approval '{approval_id}' is already {approval.get('state')} and cannot be modified."
        )

    # Authority check
    user_id = user.get("id") or user.get("user_id", "unknown")
    user_role = user.get("role", "employee")
    is_auth, auth_reason = validate_approver_authority(approval, user)

    if not is_auth:
        await write_audit(
            db=db,
            actor_id=user_id,
            actor_role=user_role,
            action="APPROVAL_DECIDE_UNAUTHORIZED",
            entity_type=approval.get("entity_type", "approval"),
            entity_id=approval.get("entity_id", approval_id),
            input_data={"approval_id": approval_id, "decision": decision, "notes": notes},
            result={"reason": auth_reason},
            status="REFUSED"
        )
        raise HTTPException(status_code=403, detail=auth_reason)

    now = datetime.utcnow()
    entity_type = approval.get("entity_type")
    entity_id = approval.get("entity_id")

    # Update Approval Record
    update_approval = {
        "state": decision,
        "decided_by": user_id,
        "decided_at": now,
        "notes": notes
    }
    await db.approvals.update_one({"_id": approval["_id"]}, {"$set": update_approval})
    approval.update(update_approval)

    entity_result: Dict[str, Any] = {}

    # Update Target Entity (Claim or Invoice)
    if entity_type == "claim":
        claim = await db.claims.find_one({"$or": [{"claim_no": entity_id}, {"id": entity_id}, build_id_query(entity_id)]})
        if claim:
            amount = float(claim.get("amount", 0.0))
            if decision == "Approved":
                # Check if secondary finance approval required (SEC-106)
                if amount > CLAIM_SECONDARY_APPROVAL_THRESHOLD and user_role != "finance":
                    # Transition to Pending Finance
                    new_status = "Pending Finance"
                    # Spawn secondary approval for finance
                    sec_app = Approval.create(
                        entity_type="claim",
                        entity_id=claim.get("claim_no", entity_id),
                        approver_id="fin_alex",
                        state="Pending",
                        due_at=now + timedelta(days=2)
                    )
                    await db.approvals.insert_one(sec_app)
                    await db.claims.update_one(
                        {"_id": claim["_id"]},
                        {"$set": {"status": new_status, "approver_id": "fin_alex", "updated_at": now}}
                    )
                    entity_result = {
                        "claim_status": new_status,
                        "secondary_approval_id": sec_app["id"],
                        "message": f"Claim > ₹{CLAIM_SECONDARY_APPROVAL_THRESHOLD:,.0f}; routed to Finance for secondary approval."
                    }
                else:
                    # Fully approved! Set expected payment date
                    payment_date = calculate_next_reimbursement_friday(now)
                    await db.claims.update_one(
                        {"_id": claim["_id"]},
                        {"$set": {
                            "status": "Approved",
                            "expected_payment_date": payment_date,
                            "updated_at": now
                        }}
                    )
                    entity_result = {
                        "claim_status": "Approved",
                        "expected_payment_date": payment_date,
                        "message": f"Claim approved. Scheduled for bank disbursement on {payment_date}."
                    }
            else:
                # Rejected
                await db.claims.update_one(
                    {"_id": claim["_id"]},
                    {"$set": {"status": "Rejected", "updated_at": now}}
                )
                entity_result = {"claim_status": "Rejected", "message": "Claim has been rejected."}

    elif entity_type == "invoice":
        invoice = await db.invoices.find_one({"$or": [{"invoice_no": entity_id}, {"id": entity_id}, build_id_query(entity_id)]})
        if invoice:
            if decision == "Approved":
                await db.invoices.update_one(
                    {"_id": invoice["_id"]},
                    {"$set": {"status": "Approved", "updated_at": now}}
                )
                entity_result = {
                    "invoice_status": "Approved",
                    "due_date": invoice.get("due_date"),
                    "message": "Invoice approved for payment disbursement."
                }
            else:
                await db.invoices.update_one(
                    {"_id": invoice["_id"]},
                    {"$set": {"status": "Disputed", "updated_at": now}}
                )
                entity_result = {"invoice_status": "Disputed", "message": "Invoice marked as Disputed."}

    # Write audit log entry
    await write_audit(
        db=db,
        actor_id=user_id,
        actor_role=user_role,
        action="APPROVAL_DECIDE",
        entity_type=entity_type,
        entity_id=entity_id,
        input_data={"approval_id": approval_id, "decision": decision, "notes": notes},
        result=entity_result,
        status="SUCCESS"
    )

    return {
        "approval": serialize_doc(approval),
        "result": entity_result
    }


async def send_approval_reminder(
    db: Any,
    approval_id: str,
    user: Dict[str, Any],
    force: bool = False
) -> Dict[str, Any]:
    """
    Sends a reminder for a pending approval.
    Authorized for requester, assigned approver, or finance staff.
    Respects cooldown unless forced.
    """
    query = {"$or": [build_id_query(approval_id), {"approval_id": approval_id}, {"id": approval_id}]}
    approval = await db.approvals.find_one(query)
    if not approval:
        raise HTTPException(status_code=404, detail=f"Approval '{approval_id}' not found")

    if approval.get("state") != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot send reminder: Approval is already {approval.get('state')}."
        )

    # Cooldown check
    last_reminder = approval.get("last_reminder_at")
    now = datetime.utcnow()
    if not force and last_reminder:
        if isinstance(last_reminder, str):
            try:
                last_reminder = datetime.fromisoformat(last_reminder)
            except Exception:
                last_reminder = None

        if last_reminder and (now - last_reminder).total_seconds() < (SLA_REMINDER_COOLDOWN_MINUTES * 60):
            wait_mins = SLA_REMINDER_COOLDOWN_MINUTES - int((now - last_reminder).total_seconds() / 60)
            raise HTTPException(
                status_code=429,
                detail=f"Reminder rate limit: Please wait {max(1, wait_mins)} minute(s) before sending another reminder."
            )

    approver_id = approval.get("approver_id", "finance")
    user_id = user.get("id") or user.get("user_id", "unknown")
    user_role = user.get("role", "employee")

    # Fetch approver user profile for notification
    approver_user = await db.users.find_one({"$or": [{"id": approver_id}, {"user_id": approver_id}]})
    approver_name = approver_user.get("name", approver_id) if approver_user else approver_id

    # Dispatch simulated message via messaging service
    msg_content = (
        f"[SIMULATED] Dear {approver_name}, approval request {approval.get('id')} for "
        f"{approval.get('entity_type')} {approval.get('entity_id')} is pending your review. "
        f"Please log in to Expense Pilot to take action."
    )

    try:
        await dispatch_phone_message(
            db=db,
            user_id=approver_id,
            phone_number="+91 98765 43210",
            message_type="APPROVAL_REMINDER",
            channel="SMS",
            content=msg_content
        )
    except Exception as e:
        print(f"[Workflow Notice] Simulated dispatch logged: {e}")

    # Update approval
    reminders_count = approval.get("reminders_sent", 0) + 1
    await db.approvals.update_one(
        {"_id": approval["_id"]},
        {"$set": {
            "reminders_sent": reminders_count,
            "last_reminder_at": now
        }}
    )
    approval["reminders_sent"] = reminders_count
    approval["last_reminder_at"] = now

    # Write audit log
    await write_audit(
        db=db,
        actor_id=user_id,
        actor_role=user_role,
        action="APPROVAL_REMINDER_SENT",
        entity_type=approval.get("entity_type", "approval"),
        entity_id=approval.get("entity_id", approval_id),
        input_data={"approval_id": approval_id, "recipient": approver_id},
        result={"reminders_sent": reminders_count, "channel": "SMS (simulated)"},
        status="SUCCESS"
    )

    return {
        "success": True,
        "approval_id": approval.get("id") or approval_id,
        "recipient": approver_name,
        "reminders_sent": reminders_count,
        "message": f"Reminder sent to {approver_name} ({approver_id}). [Simulated Carrier SMS]"
    }


async def check_and_send_due_reminders(db: Any) -> Dict[str, Any]:
    """
    Scans for approvals past SLA (due_at in the past or pending >= 2 days)
    and sends automated reminders.
    Safe to run via periodic cron or manual trigger.
    """
    now = datetime.utcnow()
    # Approvals pending where due_at is passed
    cursor = db.approvals.find({
        "state": "Pending",
        "due_at": {"$lte": now}
    })
    due_approvals = await cursor.to_list(100)

    reminded = []
    for app in due_approvals:
        app_id = app.get("id") or str(app.get("_id"))
        try:
            # We pass force=True to ensure SLA reminders trigger
            res = await send_approval_reminder(
                db=db,
                approval_id=app_id,
                user={"id": "system", "role": "finance"},
                force=True
            )
            reminded.append(app_id)
        except Exception as e:
            print(f"[Workflow Reminder Warning] Could not remind {app_id}: {e}")

    return {
        "checked_at": now.isoformat(),
        "total_due_found": len(due_approvals),
        "reminders_dispatched": len(reminded),
        "reminded_approval_ids": reminded
    }

