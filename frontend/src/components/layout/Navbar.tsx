import { LogOut, Search } from "lucide-react";
import { useEffect, useMemo } from "react";
import webLogo from "../../assets/web-logo.png";
import { useSessionUserListener } from "../../hooks/useSessionUserListener";
import apiClient, { clearAuthStateAndRedirect } from "../../services/api-client";
import { defaultUserPhotoUrl, normalizePhotoUrl } from "../../utils/photoUtils";
import {
  getStoredSessionUser,
  syncStoredUserFromWhoAmI,
  type SessionUser,
} from "../../utils/sessionUser";

interface NavbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  hideSearch?: boolean;
}

function Navbar({ searchValue, onSearchChange, hideSearch }: NavbarProps) {
  // call logout endpoint and wipe local tokens
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (
        refreshToken &&
        refreshToken !== "undefined" &&
        refreshToken !== "null"
      ) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Always continue with local logout even if server logout fails.
    } finally {
      clearAuthStateAndRedirect();
    }
  };

  const initialUser = useMemo(() => getStoredSessionUser(), []);

  const sessionUser = useSessionUserListener();

  useEffect(() => {
    const syncUser = async () => {
      try {
        // sync profile data from server on mount
        await syncStoredUserFromWhoAmI(initialUser);
      } catch {
        // Ignore errors - sessionUser will remain as initial value
      }
    };

    syncUser();

    // propagate storage changes (e.g. from another tab) to session user state
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user" && event.newValue) {
        try {
          const updatedUser = JSON.parse(event.newValue) as SessionUser;
          window.dispatchEvent(
            new CustomEvent("sessionUserUpdated", { detail: updatedUser }),
          );
        } catch {
          // Ignore invalid JSON
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [initialUser]);

  const userPhotoUrl = normalizePhotoUrl(sessionUser?.photoUrl);
  const displayName =
    sessionUser?.displayName ||
    sessionUser?.username ||
    sessionUser?.name ||
    sessionUser?.email ||
    "User";
  const profileUserId = sessionUser?._id || initialUser?._id;
  const profileHref = profileUserId ? `/profile/${profileUserId}` : "/home";

  return (
    <nav className="navbar navbar-expand-lg glass-navbar sticky-top mb-4">
      <div className="container-fluid px-4 px-md-5">
        <a
          className="navbar-brand d-flex align-items-center gap-2 text-decoration-none text-dark"
          href="/home"
        >
          <img
            src={webLogo}
            alt="VibeIS Logo"
            height={40}
            className="rounded"
            style={{ objectFit: "contain" }}
          />
        </a>

        {!hideSearch && (
          <div
            className="mx-auto w-100 px-3 d-none d-md-block search-glow rounded-pill"
            style={{ maxWidth: "520px" }}
          >
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent border-0 pe-0">
                <Search size={18} strokeWidth={2.2} className="text-primary" />
              </span>
              <input
                type="text"
                className="form-control bg-transparent border-0 shadow-none rounded-pill"
                placeholder="Search posts or people"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </div>
        )}

        <div className="d-flex align-items-center gap-2">
          <a
            className="d-flex align-items-center gap-2 text-decoration-none"
            href={profileHref}
            aria-label="Go to profile"
          >
            <img
              src={userPhotoUrl}
              alt="Profile"
              className="border rounded-circle"
              width={36}
              height={36}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(event) => {
                const element = event.currentTarget;
                if (element.src !== defaultUserPhotoUrl) {
                  element.src = defaultUserPhotoUrl;
                }
              }}
              style={{
                objectFit: "cover",
                backgroundColor: "#fff",
              }}
            />
            <span className="fw-bold text-dark d-none d-md-inline">
              {displayName}
            </span>
          </a>
          <button
            type="button"
            className="btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1 logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} strokeWidth={2.2} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
