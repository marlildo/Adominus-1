
-- Create forest_trees table to persist each completed focus tree
CREATE TABLE public.forest_trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  duration INTEGER NOT NULL,
  stage TEXT NOT NULL DEFAULT 'complete',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_date TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.forest_trees ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own trees
CREATE POLICY "Users can manage own trees"
  ON public.forest_trees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast user queries
CREATE INDEX idx_forest_trees_user_date ON public.forest_trees (user_id, session_date);
