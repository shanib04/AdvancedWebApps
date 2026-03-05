import { useEffect, useState } from "react";
import { getStoredSessionUser, type SessionUser } from "../utils/sessionUser";

/**
 * Custom hook that listens for session user updates via custom events.
 * Returns the current user from storage and subscribes to the "sessionUserUpdated" event.
 * When the session user is updated anywhere in the app, this hook will update.
 */
export function useSessionUserListener() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(
    getStoredSessionUser(),
  );

  useEffect(() => {
    const handleSessionUserUpdate = (event: CustomEvent) => {
      setCurrentUser(event.detail);
    };

    window.addEventListener(
      "sessionUserUpdated",
      handleSessionUserUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "sessionUserUpdated",
        handleSessionUserUpdate as EventListener,
      );
    };
  }, []);

  return currentUser;
}
