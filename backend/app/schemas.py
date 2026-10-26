from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in currency")
    category: str = Field(..., min_length=1, description="Category name (Food, Transport, etc.)")
    description: str = Field(..., min_length=1, description="Description of the expense")
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    payment_method: Optional[str] = "Unknown"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    is_unusual: Optional[bool] = None
    anomaly_reason: Optional[str] = None

class ExpenseOut(ExpenseBase):
    id: Union[int, str]
    user_id: str
    is_unusual: bool = False
    anomaly_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BudgetCreate(BaseModel):
    month: str  # YYYY-MM
    total_budget: float
    category_limits: Optional[Dict[str, float]] = {}

class BudgetOut(BaseModel):
    id: Union[int, str]
    user_id: str
    month: str
    total_budget: float
    category_limits: Dict[str, float]
    total_spent: float = 0.0
    remaining_budget: float = 0.0
    percentage_used: float = 0.0
    days_left_in_month: int = 0
    daily_budget_remaining: float = 0.0

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: Union[int, str]
    user_id: str
    type: str
    severity: str
    title: str
    message: str
    action_options: List[str] = []
    is_read: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SavingGoalCreate(BaseModel):
    title: str
    target_amount: float
    target_months: int = 3
    current_saved: Optional[float] = 0.0

class SavingGoalOut(BaseModel):
    id: Union[int, str]
    user_id: str
    title: str
    target_amount: float
    current_saved: float
    target_months: int
    monthly_target: float
    category_suggestions: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AgentChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "user_default"

class AgentChatResponse(BaseModel):
    reply: str
    tool_called: Optional[str] = None
    tool_result: Optional[Any] = None
    structured_expenses_added: Optional[List[Dict[str, Any]]] = None
    suggested_actions: Optional[List[str]] = None

class WhatIfRequest(BaseModel):
    category: str
    percent_reduction: Optional[float] = 0.0
    amount_reduction: Optional[float] = 0.0
    upcoming_purchase_amount: Optional[float] = 0.0
    upcoming_purchase_category: Optional[str] = "General"

class WhatIfResponse(BaseModel):
    category: str
    historical_spending: float
    projected_savings: float
    new_projected_total: float
    runway_impact: str
    advice: str
