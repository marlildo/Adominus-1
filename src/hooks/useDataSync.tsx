import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";

/**
 * DataSync — renders nothing, loads all user data from the database
 * into the Zustand store whenever the authenticated user changes.
 * Clears all persisted state before loading a new user to prevent data leaks.
 */
export function DataSync() {
  const { user, loading } = useAuth();
  const loadFromDB = useAppStore((s) => s.loadFromDB);
  const clearUserData = useAppStore((s) => s.clearUserData);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't act while auth is still resolving
    if (loading) return;

    if (!user) {
      // Only clear if we actually had a user before (real logout, not initial load)
      if (prevUserIdRef.current !== null) {
        clearUserData();
      }
      prevUserIdRef.current = null;
    } else if (user.id !== prevUserIdRef.current) {
      // New user or account switch: clear stale data first, then load
      if (prevUserIdRef.current !== null) {
        clearUserData();
      }
      prevUserIdRef.current = user.id;
      loadFromDB(user.id, user.email ?? "");
    }
  }, [user?.id, loading]);

  return null;
}
