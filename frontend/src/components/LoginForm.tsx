import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import useAppToast from "../hooks/useAppToast";
import apiClient from "../services/api-client";
import axios from "axios";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import {
  setStoredSessionUser,
  syncStoredUserFromWhoAmI,
} from "../utils/sessionUser";
import AppToast from "./AppToast";
import AuthPhotoGallery from "./AuthPhotoGallery";
import webLogo from "../assets/web-logo.png";
import photo1 from "../assets/authPhotos/photo1.png";
import photo2 from "../assets/authPhotos/photo2.png";
import photo3 from "../assets/authPhotos/photo3.png";
import photo4 from "../assets/authPhotos/photo4.png";
import photo5 from "../assets/authPhotos/photo5.png";
import photo6 from "../assets/authPhotos/photo6.png";
import photo7 from "../assets/authPhotos/photo7.png";

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Please enter a valid username or email address.")
    .refine((val) => {
      const isEmail = z.email().safeParse(val).success;
      const isUsername = /^[a-zA-Z0-9\-_]+$/.test(val);
      return isEmail || isUsername;
    }, "Invalid email or username format."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const authGalleryImages = [
  photo1,
  photo2,
  photo3,
  photo4,
  photo5,
  photo6,
  photo7,
] as const;

function LoginForm() {
  const { toasts, removeToast, showFailed } = useAppToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiClient.post("/auth/login", {
        identifier: data.identifier,
        password: data.password,
      });

      const accessToken = response.data.accessToken;
      if (!accessToken) {
        showFailed("Login failed. Missing access token.");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      const rawUser = response.data.user ?? {};
      setStoredSessionUser(rawUser);
      navigate("/home");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        showFailed(
          error.response.data?.error ||
            "Incorrect username, email, or password",
        );
      } else {
        showFailed(
          getUserFriendlyApiError(
            error,
            "Login failed. Please check your credentials.",
          ),
        );
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    try {
      const response = await apiClient.post("/auth/google", {
        credential: credentialResponse.credential,
      });

      const accessToken = response.data.accessToken;
      if (!accessToken) {
        showFailed("Google login failed. Missing access token.");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);

      const baseUser = response.data.user ?? {};
      const normalizedUser = setStoredSessionUser(baseUser);

      if (!normalizedUser.photoUrl) {
        await syncStoredUserFromWhoAmI(normalizedUser);
      }
      navigate("/home");
    } catch (error: unknown) {
      showFailed(getUserFriendlyApiError(error, "Google Login Failed"));
    }
  };

  const handleGoogleError = () => {
    showFailed("Google sign-in was canceled or failed.");
  };

  return (
    <main
      className="login-page container-fluid min-vh-100 px-0"
      style={{
        fontFamily: '"Spline Sans", sans-serif',
      }}
    >
      <AppToast toasts={toasts} onClose={removeToast} />
      <div className="row g-0 min-vh-100">
        <AuthPhotoGallery
          images={authGalleryImages}
          counts={[2, 3, 2]}
          canvasTransform="rotate(-4deg) scale(0.98)"
        />

        <section className="login-form-panel col-12 col-lg-5 d-flex flex-column align-items-center px-4 px-sm-5 py-4 py-lg-5 overflow-auto">
          <div
            className="login-form-shell w-100 my-auto flex-shrink-0"
            style={{ maxWidth: "380px" }}
          >
            <div className="login-brand-row d-flex align-items-center justify-content-center gap-3 mb-5 mb-lg-4">
              <div className="d-inline-flex align-items-center justify-content-center">
                <img
                  src={webLogo}
                  alt="VibeIS icon"
                  style={{
                    width: "16rem",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>

            <div className="login-heading-block text-center mb-4 pb-1">
              <h1
                className="login-page-title fw-bold mb-2"
                style={{
                  color: "#111827",
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                }}
              >
                Join the community
              </h1>
              <p
                className="login-page-subtitle mb-0"
                style={{ color: "#667085", fontSize: "0.9rem" }}
              >
                Enter your details to access your global community.
              </p>
            </div>

            <form
              className="login-form-content d-flex flex-column gap-2 gap-lg-3"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div>
                <label
                  htmlFor="identifier"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937", fontSize: "0.95rem" }}
                >
                  Username or email address
                </label>
                <div className="input-group">
                  <span
                    className={`input-group-text bg-white border-end-0 rounded-start-4 px-3 ${errors.identifier ? "border-danger" : "border-secondary-subtle"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4 7.75A1.75 1.75 0 0 1 5.75 6h12.5A1.75 1.75 0 0 1 20 7.75v8.5A1.75 1.75 0 0 1 18.25 18H5.75A1.75 1.75 0 0 1 4 16.25v-8.5Zm1.5.33v.17l6.03 4.48a.8.8 0 0 0 .94 0L18.5 8.25v-.17a.25.25 0 0 0-.25-.25H5.75a.25.25 0 0 0-.25.25Zm13 1.98-5.13 3.81a2.3 2.3 0 0 1-2.74 0L5.5 10.06v6.19c0 .14.11.25.25.25h12.5a.25.25 0 0 0 .25-.25v-6.19Z"
                        fill="#98A2B3"
                      />
                    </svg>
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    placeholder="Enter username or email"
                    aria-invalid={Boolean(errors.identifier)}
                    className={`login-input form-control border-start-0 rounded-end-4 shadow-none ${errors.identifier ? "border-danger" : "border-secondary-subtle"}`}
                    style={{ color: "#475467", fontSize: "0.95rem" }}
                    {...register("identifier")}
                  />
                </div>
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1.25rem", fontSize: "0.85rem" }}
                >
                  {errors.identifier?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937", fontSize: "0.95rem" }}
                >
                  Password
                </label>
                <div className="input-group">
                  <span
                    className={`input-group-text bg-white border-end-0 rounded-start-4 px-3 ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M8.75 10V8.5a3.25 3.25 0 1 1 6.5 0V10h.5A2.25 2.25 0 0 1 18 12.25v5.5A2.25 2.25 0 0 1 15.75 20h-7.5A2.25 2.25 0 0 1 6 17.75v-5.5A2.25 2.25 0 0 1 8.25 10h.5Zm5 0V8.5a1.75 1.75 0 1 0-3.5 0V10h3.5Z"
                        fill="#98A2B3"
                      />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(errors.password)}
                    className={`login-input form-control border-start-0 border-end-0 rounded-0 shadow-none ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                    style={{ color: "#475467", fontSize: "0.95rem" }}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className={`btn bg-white border border-start-0 rounded-end-4 px-3 ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 5c5.23 0 8.31 4.3 9.16 5.7a1.3 1.3 0 0 1 0 1.36C20.31 13.45 17.23 17.75 12 17.75S3.69 13.45 2.84 12.05a1.3 1.3 0 0 1 0-1.36C3.69 9.3 6.77 5 12 5Zm0 1.5c-4.16 0-6.85 3.4-7.67 4.88.82 1.48 3.5 4.87 7.67 4.87s6.85-3.4 7.67-4.87C18.85 9.9 16.16 6.5 12 6.5Zm0 1.75a3.13 3.13 0 1 1 0 6.25 3.13 3.13 0 0 1 0-6.25Zm0 1.5a1.63 1.63 0 1 0 0 3.25 1.63 1.63 0 0 0 0-3.25Z"
                        fill="#98A2B3"
                      />
                    </svg>
                  </button>
                </div>
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1.25rem", fontSize: "0.85rem" }}
                >
                  {errors.password?.message || "\u00A0"}
                </p>
              </div>

              <button
                type="submit"
                className="login-submit-button btn w-100 rounded-4 fw-bold text-white border-0 py-2 mt-2 shadow"
                style={{
                  background:
                    "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.26)",
                  fontSize: "1rem",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>

              <div className="login-separator d-flex align-items-center gap-3 my-2 pt-1">
                <div className="flex-grow-1 border-top border-secondary-subtle" />
                <span
                  className="small fw-semibold text-uppercase"
                  style={{
                    color: "#98A2B3",
                    letterSpacing: "0.14em",
                    fontSize: "0.75rem",
                  }}
                >
                  Or continue with
                </span>
                <div className="flex-grow-1 border-top border-secondary-subtle" />
              </div>

              <div className="google-login-shell">
                <div className="d-flex justify-content-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signin_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    logo_alignment="left"
                    width="340"
                  />
                </div>
              </div>

              <p
                className="login-signup-copy text-center mb-0 mt-3"
                style={{ color: "#667085", fontSize: "0.875rem" }}
              >
                Don&apos;t have an account?{" "}
                <Link
                  to="/register"
                  className="fw-bold text-decoration-none"
                  style={{ color: "#2563eb" }}
                >
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginForm;
