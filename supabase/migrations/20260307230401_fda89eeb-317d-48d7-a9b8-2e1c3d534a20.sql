
-- Add new columns to addictions table
ALTER TABLE public.addictions 
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'médio',
  ADD COLUMN IF NOT EXISTS goal_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS start_date TEXT,
  ADD COLUMN IF NOT EXISTS motivation TEXT;

-- Create addiction_relapses table for detailed relapse tracking
CREATE TABLE IF NOT EXISTS public.addiction_relapses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addiction_id UUID NOT NULL,
  user_id UUID NOT NULL,
  relapsed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cause TEXT,
  reflection TEXT,
  streak_at_relapse INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on addiction_relapses
ALTER TABLE public.addiction_relapses ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only manage their own relapse records
CREATE POLICY "Users can manage own relapses"
  ON public.addiction_relapses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
