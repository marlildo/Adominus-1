
-- Create reading_history table for Leitor IA
CREATE TABLE public.reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  ai_result JSONB,
  study_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own reading history"
  ON public.reading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading history"
  ON public.reading_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading history"
  ON public.reading_history FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user queries sorted by date
CREATE INDEX idx_reading_history_user_id ON public.reading_history (user_id, created_at DESC);
