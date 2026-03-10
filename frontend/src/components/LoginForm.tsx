import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import useAppToast from "../hooks/useAppToast";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import {
  setStoredSessionUser,
  syncStoredUserFromWhoAmI,
} from "../utils/sessionUser";
import AppToast from "./AppToast";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const galleryColumns = [
  [
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCOHMHdiOHIXi4SZ-FO8dvhZlV81ZI7mzQIS4WS6oa3RJUQT1IENbneJYICKpQ7sUGOGNWqPsMTdLRT_qQh5Sqwstacq6vcniB4rdoPsJi5XPPpiQOMqvMH_VeiNT4Zxs6TQ2u-e8zHjUW6qQQTZeoqYIfyqigzK7naRf-rMQLMBIntaGchpXfW6sytzwfJOIv07rx-caiKZrBY3f6kPmMMJCT_7p15120mwVcMl8j-nmUuazesILFqR2DoXNdd1On2-f2xSfNDHo0j",
      flex: 1.45,
    },
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCqMLcz1w6e3vCqZblYSw0Phfd7ZpSA8D4VgwlaAUHYtpjZkQjO_wS_kEQI_Bz5gVrzeH1ARzV8GGkXwytN6htxGwpdGDkWTN54_ONFJ0Vzd5xUPc4YEDeTK1U25BfhvRZxLrwFTgCLnmtLhFIABGgz5171brXf6bZlSRtqOpa4U6f6sCm0DXmh23pbPjC3u6jE5KLNhEUKtLqKS_7bKcy1qUBe3LLlx7qhWm6F3dppOV0l4h6ftlYzGghRUECFgTNWezyxT3hZmfiT",
      flex: 0.95,
    },
  ],
  [
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA8RKczcMCvjDTUhNBfJr7_YfzprkyMQV5E_ecsLcmDyxKaUU7OrxYmMdKXMws09tyQE6NHsTqXwMIptwlJzXRz5aivlt_76lE3VmNJdAQUXSmFB2Dqku2kkXlUx6HPf1Vaspn0UsIz8UnSD6WCPvjbGtU0knk_tZ_9ONb7CQL1Froa_KHvDqnroL0nyaPFrb3eETNGVOU1qk9KQ9HwpfVnSfAHxQDobSQt8fewDdO5kyVwSQo0VHTCE61qVfq2k05G4Tv_DAx3_w7E",
      flex: 1.35,
    },
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB_FkCtbm_rYpH0X1_mFoLr7S22FwBvmCAPRhssZtuk-a2T9Tlm43myW56kukkyHo3tbmJwSnvnuHvmYQVFqYOR7hWakRhQ3r8mgqTj5qSiDwUw2EQ7qSQ9DRsDBD99eV0sznMV_SR0aTeshVwuvzViiDMmgjuyuylrhR2XjHH_h_-WDapPQv_VUF8wguujZk1246HxMahw65jJavymouqfHPA0s6TgOdBpxGdxIGZr167cVeEtSGCkyuxIVhxpXY2WwsRglrdwqR5M",
      flex: 1,
    },
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDR0I1vAlEMwSgfx7BiHv6a_x6ZRha6b4cYIM_trjCFigXv0PJLtVI04AFWp7d-7Ueif0MBBktaWsO06QWHSL3SeDvRl06rfBDCr19w5QgcS2kWmGl25YMroSna8jtOCjQuLq9QoiZ8lfyNuqsfGe43iWt9hf3lyYSR8RFPHrAwB82k08se-X_1WK4M7tYNIbJE2SQyN7i7smEzLuvFp8c53F0qetIbNikhd6lJ2-xDXfKJsg7NicG_cLe6_P8B-36dzzSW3sD_XRfx",
      flex: 1.6,
    },
  ],
  [
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBGDURaWjMzUXSwQiw_Iw_dKlMb58D8PIZalDWJGkagkRl-tJar0gSww6uLzA3rx658NUvlXgcpz8vPBIED15Md5wd3KYJ6WTEzeOuqEuxNuBwQnUXblwuUiOrAqK5z3wOVgMbn0nihr3JFN3WHXU44Sw6cUnTBlq2mk7nuu6w0FH2gmY9Gtd4sWY-05bgLzTXsk4-16liQOwo3uUDhPNJKiItCcodp76AypV-UyBIQIv59Wjp5aFUe0amXzI5UtwtH9FOksBaa3Exk",
      flex: 0.9,
    },
    {
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCKdj9853J9pcCCudEom82lu4lQnA2nIT7wMyxeDotFAX9jbz-Uhub-WT0_q3kV2znORVJAvyG4zlo_Xz5KNCRVBS1UXP7Vz00hOgYjmlJdAvJ8AnGHBXV755Ziy2owZfeaMDUJFhix7BKc4rQ1Wge_z9yMpufij9aUsgEfwwwKAyba7exa5gVM3vTWsJLqO6Fo4OsHdTumFCGBJ5BxkHsidQg3cjtMAyv12owBAiwh2PFjcfA7kK-q_ecE16N279OZ3DbdBMS3BTGo",
      flex: 1.1,
    },
  ],
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
        email: data.email,
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
      showFailed(
        getUserFriendlyApiError(
          error,
          "Login failed. Please check your credentials.",
        ),
      );
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
        backgroundColor: "#f3f4f8",
        fontFamily: '"Spline Sans", sans-serif',
      }}
    >
      <AppToast toasts={toasts} onClose={removeToast} />
      <div className="row g-0 min-vh-100">
        <section
          className="login-gallery-panel col-lg-7 d-none d-lg-flex position-relative align-items-center justify-content-center px-4 px-xl-5 py-3 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #f4f6fb 0%, #eef2f7 100%)",
          }}
        >
          <div className="login-gallery-fade position-absolute top-0 end-0 h-100" />
          <div
            className="login-gallery-canvas position-relative w-100"
            style={{
              maxWidth: "720px",
              transform: "rotate(-4deg) scale(0.98)",
            }}
          >
            <div className="row g-3 h-100">
              {galleryColumns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="col-4 d-flex flex-column gap-3 h-100"
                  style={{
                    marginTop:
                      columnIndex === 0
                        ? "1.75rem"
                        : columnIndex === 2
                          ? "3rem"
                          : 0,
                  }}
                >
                  {column.map((tile) => (
                    <div
                      key={tile.image}
                      className="w-100 rounded-4 shadow-sm flex-grow-1"
                      style={{
                        flex: tile.flex,
                        minHeight: 0,
                        backgroundImage: `url(${tile.image})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                        boxShadow: "0 18px 36px rgba(15, 23, 42, 0.12)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="login-form-panel col-12 col-lg-5 d-flex align-items-center justify-content-center px-4 px-sm-5 py-4 py-lg-3 overflow-hidden">
          <div className="login-form-shell w-100" style={{ maxWidth: "420px" }}>
            {/* <div className="login-brand-row d-flex align-items-center gap-3 mb-4 mb-lg-5">
              <div className="d-inline-flex align-items-center justify-content-center">
                <img
                  src={webIcon}
                  alt="VibeIS icon"
                  style={{
                    width: "2rem",
                    height: "2rem",
                    objectFit: "contain",
                  }}
                />
              </div>
              <span
                className="fw-semibold"
                style={{ color: "#6d4dff", letterSpacing: "-0.02em" }}
              >
                VibeIS
              </span>
            </div> */}

            <div className="login-heading-block mb-4 pb-1">
              <h1
                className="login-page-title fw-bold mb-2"
                style={{
                  color: "#111827",
                  fontSize: "clamp(2.2rem, 4vw, 3rem)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.04em",
                }}
              >
                Join the VibeIS community
              </h1>
              <p
                className="login-page-subtitle mb-0"
                style={{ color: "#667085", fontSize: "1.02rem" }}
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
                  htmlFor="email"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937" }}
                >
                  Email address
                </label>
                <div className="input-group input-group-lg">
                  <span
                    className={`input-group-text bg-white border-end-0 rounded-start-4 px-3 ${errors.email ? "border-danger" : "border-secondary-subtle"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
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
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    aria-invalid={Boolean(errors.email)}
                    className={`login-input form-control form-control-lg border-start-0 rounded-end-4 shadow-none ${errors.email ? "border-danger" : "border-secondary-subtle"}`}
                    style={{ color: "#475467" }}
                    {...register("email")}
                  />
                </div>
                <p
                  className="small text-danger mt-2 mb-0"
                  style={{ minHeight: "1.25rem" }}
                >
                  {errors.email?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937" }}
                >
                  Password
                </label>
                <div className="input-group input-group-lg">
                  <span
                    className={`input-group-text bg-white border-end-0 rounded-start-4 px-3 ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
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
                    className={`login-input form-control form-control-lg border-start-0 border-end-0 rounded-0 shadow-none ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                    style={{ color: "#475467" }}
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
                      width="18"
                      height="18"
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
                  className="small text-danger mt-2 mb-0"
                  style={{ minHeight: "1.25rem" }}
                >
                  {errors.password?.message || "\u00A0"}
                </p>
              </div>

              <button
                type="submit"
                className="login-submit-button btn w-100 rounded-4 fw-bold text-white border-0 py-3 mt-2 shadow"
                style={{
                  background:
                    "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.26)",
                  fontSize: "1.08rem",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>

              <div className="login-separator d-flex align-items-center gap-3 my-2 pt-1">
                <div className="flex-grow-1 border-top border-secondary-subtle" />
                <span
                  className="small fw-semibold text-uppercase"
                  style={{ color: "#98A2B3", letterSpacing: "0.14em" }}
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
                    width="388"
                  />
                </div>
              </div>

              <p
                className="login-signup-copy text-center mb-0 mt-3"
                style={{ color: "#667085", fontSize: "0.98rem" }}
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
