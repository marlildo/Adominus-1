-- Create budget_goals table
CREATE TABLE public.budget_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

ALTER TABLE public.budget_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budget goals"
  ON public.budget_goals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_budget_goals_updated_at
  BEFORE UPDATE ON public.budget_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create financial_commitments table
CREATE TABLE public.financial_commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_day INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'bills',
  reminder BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own commitments"
  ON public.financial_commitments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_financial_commitments_updated_at
  BEFORE UPDATE ON public.financial_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();