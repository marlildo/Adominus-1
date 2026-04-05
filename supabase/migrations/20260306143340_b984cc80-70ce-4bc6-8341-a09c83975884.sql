
-- Enable Realtime for all user data tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.addictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.focus_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
