# ⚡ ExpensePilot AI — Autonomous Financial Management Agent

> **GLA Hackathon Edition** | Option C: Advanced Autonomous AI Finance Agent

**ExpensePilot AI** is an autonomous expense management agent that doesn't just tell users where their money went—it actively analyzes spending velocity, predicts future trajectory, flags statistical anomalies, runs what-if financial simulations, and formulates personalized savings plans.

---

## 🌟 Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    ExpensePilot AI Frontend (React)   │
                      │  Tailwind CSS • Recharts • Glass UI  │
                      └──────────────────┬───────────────────┘
                                         │ HTTP / JSON
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    FastAPI Autonomous Backend Engine │
                      │       Python 3.9+ • Async SQLite     │
                      └──────────────────┬───────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌───────────────┐              ┌───────────────────┐            ┌───────────────────┐
│ NLU & Agent   │              │ Predictive Engine │            │ Anomaly Auditing  │
│ Tool Calling  │              │ Velocity & Forecast│            │ Z-Score Outliers  │
│ Engine        │              │ Weekday vs Weekend│            │ Explainable Alerts│
└───────┬───────┘              └───────────────────┘            └───────────────────┘
        ▼
┌───────────────┐
│ What-If Engine│
│ Affordability │
│ Run-rate Trim │
└───────────────┘
```

---

## 🚀 Key Features

### 1. Smart Multi-Expense Natural Language Tracking
Users can log single or multiple expenses naturally. The backend validates and categorizes them automatically before persisting to the database.
- *"Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping."*
- *"I spent ₹350 on dinner yesterday."*

### 2. Autonomous Action-Taking Agent
The agent follows the core cycle:
**Observe → Analyze → Decide → Act → Verify**
- Observes database transactions and monthly limits.
- Detects accelerated spending velocity.
- Triggers proactive warnings and recommends explicit actionable steps (e.g. *"Cap Shopping spending to ₹500 for remaining 10 days; limit daily discretionary spend to ₹150/day"*).

### 3. Predictive Spending Forecasting
- Analyzes daily spending velocity, separating **weekday velocity** from **weekend velocity**.
- Calculates day-by-day cumulative trajectory charts against a linear budget ceiling.
- Computes month-end forecast with confidence range ($\pm 8\%$).

### 4. Statistical Anomaly & Unusual Transaction Detection
- Computes historical category mean ($\mu$) and standard deviation ($\sigma$).
- Flags outliers where $amount > \mu + 2\sigma$ or single purchases exceeding $40\%$ of monthly budget.
- Provides interactive **Confirm & Dismiss** or **Edit** actions for user verification.

### 5. Conversational Financial Assistant
Full tool execution with deterministic calculations:
- `tool_add_expense()`
- `tool_get_monthly_spending()`
- `tool_get_category_breakdown()`
- `tool_calculate_remaining_budget()`
- `tool_predict_monthly_spending()`
- `tool_detect_unusual_expenses()`
- `tool_simulate_what_if()`
- `tool_create_saving_plan()`

---

## 🏆 Hackathon Standout Features

### Feature A: Financial What-If Scenario Simulator
- Interactive category reduction slider: *"What if I reduce Shopping expenses by 20% next month?"*
- Computes exact historical spend, monthly savings in ₹, annualized savings in ₹, and revised budget impact.
- **Affordability Checker**: *"Can I afford a ₹1,500 purchase?"* projects remaining runway and computes the new safe daily limit for the remaining days of the month.

### Feature B: Explainable Spending Diagnostics
- Rather than vague alerts, gives root-cause diagnostics comparing current period to previous period.
- Highlights driving categories with exact variance and percentage shifts.

### Feature C: Personalized Savings Goal Planner
- Set target goals: *"I want to save ₹15,000 in 3 months"*.
- AI computes monthly target (₹5,000/mo) and daily run-rate (~₹167/day).
- Automatically inspects user spending history to propose trims specifically from discretionary categories (Dining, Shopping, Entertainment).
- Interactive **Deposit** with celebratory confetti animation (`canvas-confetti`).

---

## 💻 Quick Start & Running Locally

### 1. Backend Setup
```bash
# From workspace root
cd backend

# Configure your MongoDB Atlas password in .env:
# Open backend/.env and replace <db_password> with your actual MongoDB user password

# Virtual environment is located at backend/.venv
./.venv/bin/python run.py
```
> Server starts on `http://127.0.0.1:8000`. Connected to MongoDB Atlas (`cluster0.cllnh1c.mongodb.net`) and auto-seeded with realistic financial demo data.

### 2. Frontend Setup
```bash
# From workspace root
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite dev server
npm run dev -- --host 127.0.0.1 --port 5173
```
> Open `http://127.0.0.1:5173` in your browser.

---

## 🧪 Try These Prompts in the Agent Chat

1. **Multi-Expense Log**:
   ```
   Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping.
   ```
2. **Single Expense with Context**:
   ```
   I spent ₹350 on dinner yesterday.
   ```
3. **Monthly Spending Query**:
   ```
   How much did I spend this month?
   ```
4. **Category Breakdown**:
   ```
   Where did most of my money go?
   ```
5. **Daily Benchmark**:
   ```
   How much can I spend per day?
   ```
6. **Affordability What-If**:
   ```
   Can I afford a ₹1,200 purchase?
   ```
7. **Category Cut What-If**:
   ```
   What if I reduce shopping expenses by 20% next month?
   ```
8. **Goal Creation**:
   ```
   I want to save ₹5,000 in the next three months.
   ```
9. **Anomaly Audit**:
   ```
   Detect unusual expenses
   ```

---

## 📦 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── engine.py       # Reasoning loop, NLU & tool calling
│   │   │   └── tools.py        # Deterministic financial functions
│   │   ├── services/
│   │   │   ├── analytics.py    # Summary, MoM diffs, category breakdowns
│   │   │   ├── anomaly.py      # Statistical Z-score anomaly audit
│   │   │   ├── forecasting.py  # Weekday/weekend velocity & trajectory
│   │   │   ├── simulator.py    # What-if & affordability simulations
│   │   │   └── seed_data.py    # Demo data generator
│   │   ├── routers/            # Expenses, Budgets, Analytics, Goals, Agent
│   │   ├── config.py           # App configuration
│   │   ├── database.py         # SQLAlchemy async engine
│   │   ├── models.py           # Database entities
│   │   └── main.py             # FastAPI entrypoint
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Navigation and demo seeder
│   │   │   ├── DashboardOverview.jsx   # KPI cards, Area & Donut charts
│   │   │   ├── ExpenseList.jsx         # Transactions table with CSV export
│   │   │   ├── ForecastingCard.jsx     # Trajectory chart & anomaly hub
│   │   │   ├── WhatIfSimulator.jsx     # Standout What-If sandbox
│   │   │   ├── SavingsGoalPlanner.jsx  # Savings planner with confetti
│   │   │   ├── AddExpenseModal.jsx     # AI Natural language + Form
│   │   │   ├── AgentChat.jsx           # Conversational AI drawer
│   │   │   └── AnomalyAlerts.jsx       # Explainable alerts drawer
│   │   ├── api.js                      # Backend API client
│   │   ├── App.jsx                     # Root application
│   │   └── index.css                   # Glassmorphism & custom typography
│   └── package.json
└── README.md
```
