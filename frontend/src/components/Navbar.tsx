import webLogo from "../assets/web-logo.png";
import { useEffect, useMemo } from "react";
import { clearFeedCache } from "../utils/feedCache";
import {
  getStoredSessionUser,
  syncStoredUserFromWhoAmI,
  type SessionUser,
} from "../utils/sessionUser";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../utils/photoUtils";
import { useSessionUserListener } from "../hooks/useSessionUserListener";

interface NavbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  hideSearch?: boolean;
}

function Navbar({ searchValue, onSearchChange, hideSearch }: NavbarProps) {
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    clearFeedCache();
    window.location.href = "/login";
  };

  const initialUser = useMemo(() => getStoredSessionUser(), []);

  const sessionUser = useSessionUserListener();

  useEffect(() => {
    const abortController = new AbortController();

    const syncUser = async () => {
      try {
        await syncStoredUserFromWhoAmI(initialUser);
      } catch {
        // Ignore errors - sessionUser will remain as initial value
      }
    };

    syncUser();

    // Listen for storage changes to update user data when profile is updated
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
      abortController.abort();
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

  return (
    <nav className="navbar navbar-expand-lg glass-navbar sticky-top mb-4">
      <div className="container">
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
                <span className="material-symbols-outlined text-primary">
                  search
                </span>
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
          <div className="d-flex align-items-center gap-2">
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
          </div>
          <button
            type="button"
            className="btn btn-sm rounded-pill px-3 d-flex align-items-center gap-1 logout-btn"
            onClick={handleLogout}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              logout
            </span>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
