import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import useAppToast from "../hooks/useAppToast";
import AppToast from "./AppToast";
import apiClient from "../services/api-client";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import {
  setStoredSessionUser,
  syncStoredUserFromWhoAmI,
} from "../utils/sessionUser";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be at most 30 characters."),
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  profilePicture: z.instanceof(FileList).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const registerGalleryColumns = [
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

function RegisterForm() {
  const { toasts, removeToast, showFailed } = useAppToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const profilePictureRegistration = register("profilePicture");

  useEffect(() => {
    return () => {
      if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
      }
    };
  }, [profilePreviewUrl]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      let photoUrl: string | undefined;
      const selectedImage = data.profilePicture?.[0];

      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);

        const uploadResponse = await apiClient.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const uploadedPhotoUrl = uploadResponse.data?.imageUrl;

        if (!uploadedPhotoUrl || typeof uploadedPhotoUrl !== "string") {
          throw new Error("Image upload did not return a valid URL.");
        }

        photoUrl = uploadedPhotoUrl;
      }

      const registerPayload: {
        username: string;
        email: string;
        password: string;
        photoUrl?: string;
      } = {
        username: data.username,
        email: data.email,
        password: data.password,
      };

      if (photoUrl) {
        registerPayload.photoUrl = photoUrl;
      }

      const registerResponse = await apiClient.post(
        "/auth/register",
        registerPayload,
      );

      const accessToken = registerResponse.data.accessToken;
      if (!accessToken) {
        showFailed("Registration failed. Missing access token.");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", registerResponse.data.refreshToken);
      const rawUser = registerResponse.data.user ?? {};
      setStoredSessionUser(rawUser);
      navigate("/home");
    } catch (err: unknown) {
      showFailed(
        getUserFriendlyApiError(err, "Registration failed. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    setIsLoading(true);

    try {
      const response = await apiClient.post("/auth/google", {
        credential: credentialResponse.credential,
      });

      const accessToken = response.data.accessToken;
      if (!accessToken) {
        showFailed("Google Login Failed");
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    showFailed("Google Login Failed");
  };

  return (
    <main
      className="login-page register-scroll-page container-fluid min-vh-100 px-0"
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
              transform: "rotate(-4deg) scale(0.96)",
            }}
          >
            <div className="row g-3 h-100">
              {registerGalleryColumns.map((column, columnIndex) => (
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

        <section className="register-form-panel col-12 col-lg-5 d-flex align-items-start justify-content-center px-4 px-sm-5 py-3 py-lg-4">
          <div
            className="register-screen-shell w-100"
            style={{ maxWidth: "410px" }}
          >
            <div className="register-heading-block mb-3">
              <h1
                className="register-page-title fw-bold mb-2"
                style={{
                  color: "#111827",
                  fontSize: "clamp(1.9rem, 3vw, 2.45rem)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.04em",
                }}
              >
                Create your account
              </h1>
              <p
                className="register-page-subtitle mb-3"
                style={{ color: "#667085" }}
              >
                Join the VibeIS community and share your vision.
              </p>
            </div>

            <form
              className="register-form-content d-flex flex-column gap-2"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div className="register-upload-panel d-flex flex-column align-items-start text-start">
                <label
                  htmlFor="profilePicture"
                  className="register-upload-title form-label fw-semibold mb-2"
                  style={{ color: "#1f2937" }}
                >
                  Profile Image{" "}
                  <span style={{ color: "#98A2B3" }}>(Optional)</span>
                </label>
                <label
                  htmlFor="profilePicture"
                  className={`register-upload-trigger position-relative d-flex w-100 align-items-center gap-3 rounded-4 text-decoration-none ${profilePreviewUrl ? "register-upload-trigger--filled" : ""}`}
                  style={{ cursor: "pointer" }}
                >
                  <span
                    className={`register-upload-circle d-flex flex-column align-items-center justify-content-center rounded-circle bg-white position-relative overflow-hidden ${profilePreviewUrl ? "register-upload-circle--filled" : ""}`}
                    style={
                      profilePreviewUrl
                        ? {
                            backgroundImage: `url(${profilePreviewUrl})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                          }
                        : undefined
                    }
                  >
                    <input
                      id="profilePicture"
                      type="file"
                      accept="image/*"
                      style={{ cursor: "pointer" }}
                      className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                      {...profilePictureRegistration}
                      onChange={(event) => {
                        profilePictureRegistration.onChange(event);
                        const nextFile = event.target.files?.[0] ?? null;
                        setProfilePreviewUrl((currentUrl) => {
                          if (currentUrl) {
                            URL.revokeObjectURL(currentUrl);
                          }

                          return nextFile
                            ? URL.createObjectURL(nextFile)
                            : null;
                        });
                      }}
                    />
                    <span
                      className="register-upload-icon d-inline-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        cursor: "pointer",
                        opacity: profilePreviewUrl ? 0 : 1,
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="26"
                        height="26"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M7 8.25A2.25 2.25 0 0 1 9.25 6h5.5A2.25 2.25 0 0 1 17 8.25v.58l.4.12A2.75 2.75 0 0 1 19.25 11.6v4.15A2.25 2.25 0 0 1 17 18H7a2.25 2.25 0 0 1-2.25-2.25V11.6A2.75 2.75 0 0 1 6.6 8.95l.4-.12v-.58Zm1.5 0v.9a.75.75 0 0 1-.54.72l-.92.27c-.48.14-.79.58-.79 1.08v4.53c0 .41.34.75.75.75h10c.41 0 .75-.34.75-.75v-4.53c0-.5-.31-.94-.79-1.08l-.92-.27a.75.75 0 0 1-.54-.72v-.9a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75Zm3.5 2a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Zm0 1.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm4.75-4a.75.75 0 0 1 .75.75v.25h.25a.75.75 0 0 1 0 1.5h-.25v.25a.75.75 0 0 1-1.5 0v-.25h-.25a.75.75 0 0 1 0-1.5h.25V8.5a.75.75 0 0 1 .75-.75Z"
                          fill="#94A3B8"
                        />
                      </svg>
                    </span>
                  </span>
                  <span className="register-upload-copy d-flex flex-column justify-content-center">
                    <span className="register-upload-copy-title fw-semibold">
                      {profilePreviewUrl
                        ? "Change profile photo"
                        : "Upload profile photo"}
                    </span>
                    <span className="register-upload-copy-subtitle">
                      Add a photo to complete your vibe
                    </span>
                  </span>
                </label>
                <p className="register-upload-error small text-danger mt-2 mb-0">
                  {errors.profilePicture?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937" }}
                >
                  Display Name
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  aria-invalid={Boolean(errors.username)}
                  className={`register-input form-control form-control-lg rounded-4 shadow-none ${errors.username ? "border-danger" : "border-secondary-subtle"}`}
                  {...register("username")}
                />
                <p
                  className="small text-danger mt-2 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.78rem" }}
                >
                  {errors.username?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  aria-invalid={Boolean(errors.email)}
                  className={`register-input form-control form-control-lg rounded-4 shadow-none ${errors.email ? "border-danger" : "border-secondary-subtle"}`}
                  {...register("email")}
                />
                <p
                  className="small text-danger mt-2 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.78rem" }}
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
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  aria-invalid={Boolean(errors.password)}
                  className={`register-input form-control form-control-lg rounded-4 shadow-none ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                  {...register("password")}
                />
                <p
                  className="small text-danger mt-2 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.78rem" }}
                >
                  {errors.password?.message || "\u00A0"}
                </p>
              </div>

              <button
                type="submit"
                className="register-submit-button btn w-100 rounded-4 fw-bold text-white border-0 py-3 mt-2 shadow"
                style={{
                  background:
                    "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.26)",
                  fontSize: "1rem",
                }}
                disabled={isLoading}
              >
                {isLoading ? "Registering..." : "Sign Up"}
              </button>

              <div className="register-separator d-flex align-items-center gap-3 my-2 pt-1">
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
                    text="signup_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    logo_alignment="left"
                    width="388"
                  />
                </div>
              </div>

              <p
                className="register-signin-copy text-center mb-0 mt-2"
                style={{ color: "#667085", fontSize: "0.92rem" }}
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="fw-bold text-decoration-none"
                  style={{ color: "#2563eb" }}
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RegisterForm;
