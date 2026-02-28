import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAppToast from "../hooks/useAppToast";
import AppToast from "./AppToast";
import apiClient from "../services/api-client";

interface LoggedInUser {
  username?: string;
  photoUrl?: string;
}

function HomeScreen() {
  const navigate = useNavigate();
  const { toasts, removeToast, showFailed } = useAppToast();
  const accessToken = localStorage.getItem("accessToken");
  const storedUser = localStorage.getItem("user");
  const user: LoggedInUser = storedUser ? JSON.parse(storedUser) : {};
  const username = user.username || "User";
  const fallbackImage = "http://localhost:3000/public/images/default-user.svg";
  const profileImage = user.photoUrl || fallbackImage;

  useEffect(() => {
    if (!accessToken || !storedUser) {
      navigate("/login", { replace: true });
    }
  }, [accessToken, storedUser, navigate]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch {
      showFailed("Logout completed locally, but server logout failed.");
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  };

  return (
    <main className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light overflow-auto">
      <AppToast toasts={toasts} onClose={removeToast} />
      <div
        className="card border-0 shadow-sm p-4 text-center"
        style={{ maxWidth: "360px", width: "100%" }}
      >
        <img
          src={profileImage}
          alt="Profile"
          className="rounded-circle mx-auto mb-3"
          style={{ width: "96px", height: "96px", objectFit: "cover" }}
        />
        <h1 className="h5 fw-bold mb-2">{username}</h1>
        <p className="text-muted mb-4">Login successful</p>
        <div className="d-grid gap-2">
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

export default HomeScreen;
