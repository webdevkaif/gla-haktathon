-- ============================================================================
-- ExpensePilot AI - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ============================================================================
-- Run this script in your Supabase Dashboard: SQL Editor -> New query -> Run.
-- This script configures user tables, enables RLS, and creates strict security
-- policies ensuring each user can ONLY view, insert, update, or delete their own data.
-- ============================================================================

-- 1. Create Expenses Table with Web Crypto Payload Hash Integrity Column
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'UPI',
    is_unusual BOOLEAN DEFAULT false,
    anomaly_reason TEXT,
    payload_hash TEXT, -- Browser Web Crypto SHA-256 seal for tamper detection
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    total_budget NUMERIC(12, 2) NOT NULL CHECK (total_budget >= 0),
    category_limits JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_month UNIQUE (user_id, month)
);

-- 3. Create Saving Goals Table
CREATE TABLE IF NOT EXISTS public.saving_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    current_saved NUMERIC(12, 2) DEFAULT 0.0 CHECK (current_saved >= 0),
    monthly_target NUMERIC(12, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. ROW LEVEL SECURITY POLICIES FOR EXPENSES
-- ============================================================================
-- Policy: Users can only select/read their own expense rows
DROP POLICY IF EXISTS "Users can only read own expenses" ON public.expenses;
CREATE POLICY "Users can only read own expenses"
    ON public.expenses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert expense rows for themselves
DROP POLICY IF EXISTS "Users can only insert own expenses" ON public.expenses;
CREATE POLICY "Users can only insert own expenses"
    ON public.expenses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own expense rows
DROP POLICY IF EXISTS "Users can only update own expenses" ON public.expenses;
CREATE POLICY "Users can only update own expenses"
    ON public.expenses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own expense rows
DROP POLICY IF EXISTS "Users can only delete own expenses" ON public.expenses;
CREATE POLICY "Users can only delete own expenses"
    ON public.expenses
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES FOR BUDGETS
-- ============================================================================
DROP POLICY IF EXISTS "Users can only read own budgets" ON public.budgets;
CREATE POLICY "Users can only read own budgets"
    ON public.budgets
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert own budgets" ON public.budgets;
CREATE POLICY "Users can only insert own budgets"
    ON public.budgets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update own budgets" ON public.budgets;
CREATE POLICY "Users can only update own budgets"
    ON public.budgets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only delete own budgets" ON public.budgets;
CREATE POLICY "Users can only delete own budgets"
    ON public.budgets
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES FOR SAVING GOALS
-- ============================================================================
DROP POLICY IF EXISTS "Users can only read own goals" ON public.saving_goals;
CREATE POLICY "Users can only read own goals"
    ON public.saving_goals
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert own goals" ON public.saving_goals;
CREATE POLICY "Users can only insert own goals"
    ON public.saving_goals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update own goals" ON public.saving_goals;
CREATE POLICY "Users can only update own goals"
    ON public.saving_goals
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only delete own goals" ON public.saving_goals;
CREATE POLICY "Users can only delete own goals"
    ON public.saving_goals
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 8. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (user_id, category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets (user_id, month);
CREATE INDEX IF NOT EXISTS idx_saving_goals_user ON public.saving_goals (user_id);

