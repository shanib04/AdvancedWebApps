import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getStoredSessionUser,
  syncStoredUserFromWhoAmI,
  type SessionUser,
} from "../utils/sessionUser";

interface NavbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onLogout: () => void;
}

function Navbar({ searchValue, onSearchChange, onLogout }: NavbarProps) {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
  const defaultPhotoUrl = `${apiBaseUrl}/public/images/default-user.svg`;

  const normalizePhotoUrl = useCallback(
    (value?: string) => {
      if (!value) {
        return defaultPhotoUrl;
      }

      if (/^https?:\/\//i.test(value)) {
        return value;
      }

      if (value.startsWith("/")) {
        return `${apiBaseUrl}${value}`;
      }

      return value;
    },
    [apiBaseUrl, defaultPhotoUrl],
  );

  const initialUser = useMemo(() => getStoredSessionUser(), []);

  const [userData, setUserData] = useState<SessionUser | null>(initialUser);

  useEffect(() => {
    const abortController = new AbortController();

    const syncUser = async () => {
      try {
        const mergedUser = await syncStoredUserFromWhoAmI(
          initialUser,
          normalizePhotoUrl,
        );
        if (!abortController.signal.aborted) {
          setUserData(mergedUser);
        }
      } catch {
        if (!abortController.signal.aborted) {
          setUserData(initialUser);
        }
      }
    };

    syncUser();

    return () => {
      abortController.abort();
    };
  }, [initialUser, normalizePhotoUrl]);

  const userPhotoUrl = normalizePhotoUrl(userData?.photoUrl);
  const displayName =
    userData?.displayName ||
    userData?.username ||
    userData?.name ||
    userData?.email ||
    "User";

  return (
    <nav className="navbar navbar-expand-lg glass-navbar sticky-top mb-4">
      <div className="container">
        <a
          className="navbar-brand d-flex align-items-center gap-2 text-decoration-none text-dark"
          href="/home"
        >
          <img
            src="src/assets/web-logo.png"
            alt="VibeIS Logo"
            height={40}
            className="rounded"
            style={{ objectFit: "contain" }}
          />
        </a>

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
                if (element.src !== defaultPhotoUrl) {
                  element.src = defaultPhotoUrl;
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
            onClick={onLogout}
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
