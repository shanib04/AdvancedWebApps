import { useEffect, useState } from "react";
import { getStoredSessionUser, type SessionUser } from "../utils/sessionUser";

// listens for sessionUserUpdated custom events and refreshes the current user state
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
