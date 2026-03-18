import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import photo1 from "../../assets/authPhotos/photo1.png";
import photo2 from "../../assets/authPhotos/photo2.png";
import photo3 from "../../assets/authPhotos/photo3.png";
import photo4 from "../../assets/authPhotos/photo4.png";
import photo5 from "../../assets/authPhotos/photo5.png";
import photo6 from "../../assets/authPhotos/photo6.png";
import photo7 from "../../assets/authPhotos/photo7.png";
import webLogo from "../../assets/web-logo.png";
import useAppToast from "../../hooks/useAppToast";
import apiClient from "../../services/api-client";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import {
  setStoredSessionUser,
  syncStoredUserFromWhoAmI,
} from "../../utils/sessionUser";
import AppToast from "../shared/AppToast";
import AuthPhotoGallery from "./AuthPhotoGallery";

const USERNAME_MAX_LENGTH = 15;
const DISPLAY_NAME_MAX_LENGTH = 20;

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .max(
        USERNAME_MAX_LENGTH,
        `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
      )
      .regex(
        /^[a-zA-Z0-9\-_]+$/,
        "Username can only contain letters, numbers, hyphens, and underscores.",
      )
      .transform((val) => val.toLowerCase()),
    displayName: z
      .string()
      .max(
        DISPLAY_NAME_MAX_LENGTH,
        `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
      )
      .optional(),
    email: z.email("Please enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    profilePicture: z
      .instanceof(FileList)
      .optional()
      .refine((files) => {
        if (!files || files.length === 0) return true;
        const file = files[0];
        return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
      }, "Only PNG, JPG, JPEG, and WEBP formats are allowed."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const authGalleryImages = [
  photo1,
  photo2,
  photo3,
  photo4,
  photo5,
  photo6,
  photo7,
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

  // revoke blob url on unmount
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
      // upload profile photo first, then register
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
        displayName?: string;
        photoUrl?: string;
      } = {
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName || data.username,
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

        <section className="register-form-panel col-12 col-lg-5 d-flex flex-column align-items-center px-4 px-sm-5 py-4 py-lg-5">
          <div
            className="register-screen-shell w-100 flex-shrink-0"
            style={{ maxWidth: "380px" }}
          >
            <div className="login-brand-row d-flex align-items-center justify-content-center gap-3 mb-4 mb-lg-4">
              <div className="d-inline-flex align-items-center justify-content-center">
                <img
                  src={webLogo}
                  alt="VibeIS icon"
                  style={{
                    width: "14rem",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>

            <div className="register-heading-block text-center mb-4">
              <h1
                className="register-page-title fw-bold mb-2"
                style={{
                  color: "#111827",
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                }}
              >
                Create your account
              </h1>
              <p
                className="register-page-subtitle mb-0"
                style={{ color: "#667085", fontSize: "0.9rem" }}
              >
                Join the VibeIS community and share your vision.
              </p>
            </div>

            <form
              className="register-form-content d-flex flex-column gap-2 gap-lg-3"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div className="register-upload-panel d-flex flex-column align-items-start text-start mb-2">
                <label
                  htmlFor="profilePicture"
                  className="register-upload-title form-label fw-semibold mb-2"
                  style={{ color: "#1f2937", fontSize: "0.9rem" }}
                >
                  Profile Image{" "}
                  <span style={{ color: "#98A2B3", fontWeight: "normal" }}>
                    (Optional)
                  </span>
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
                      accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
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
                  style={{ color: "#1f2937", fontSize: "0.95rem" }}
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  maxLength={USERNAME_MAX_LENGTH}
                  placeholder="Username"
                  aria-invalid={Boolean(errors.username)}
                  className={`register-input form-control rounded-4 shadow-none ${errors.username ? "border-danger" : "border-secondary-subtle"}`}
                  style={{ fontSize: "0.95rem" }}
                  {...register("username")}
                />
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.85rem" }}
                >
                  {errors.username?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="displayName"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937", fontSize: "0.95rem" }}
                >
                  Display Name{" "}
                  <span
                    style={{
                      color: "#98A2B3",
                      fontWeight: "normal",
                      fontSize: "0.85rem",
                    }}
                  >
                    (Optional)
                  </span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  placeholder="Display name"
                  aria-invalid={Boolean(errors.displayName)}
                  className={`register-input form-control rounded-4 shadow-none ${errors.displayName ? "border-danger" : "border-secondary-subtle"}`}
                  style={{ fontSize: "0.95rem" }}
                  {...register("displayName")}
                />
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.85rem" }}
                >
                  {errors.displayName?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937", fontSize: "0.95rem" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  aria-invalid={Boolean(errors.email)}
                  className={`register-input form-control rounded-4 shadow-none ${errors.email ? "border-danger" : "border-secondary-subtle"}`}
                  style={{ fontSize: "0.95rem" }}
                  {...register("email")}
                />
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.85rem" }}
                >
                  {errors.email?.message || "\u00A0"}
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
                <input
                  id="password"
                  type="password"
                  placeholder="Password"
                  aria-invalid={Boolean(errors.password)}
                  className={`register-input form-control rounded-4 shadow-none ${errors.password ? "border-danger" : "border-secondary-subtle"}`}
                  style={{ fontSize: "0.95rem" }}
                  {...register("password")}
                />
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.85rem" }}
                >
                  {errors.password?.message || "\u00A0"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="form-label fw-semibold mb-2"
                  style={{ color: "#1f2937", fontSize: "0.95rem" }}
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={`register-input form-control rounded-4 shadow-none ${errors.confirmPassword ? "border-danger" : "border-secondary-subtle"}`}
                  style={{ fontSize: "0.95rem" }}
                  {...register("confirmPassword")}
                />
                <p
                  className="small text-danger mt-1 mb-0"
                  style={{ minHeight: "1rem", fontSize: "0.85rem" }}
                >
                  {errors.confirmPassword?.message || "\u00A0"}
                </p>
              </div>

              <button
                type="submit"
                className="register-submit-button btn w-100 rounded-4 fw-bold text-white border-0 py-2 mt-2 shadow"
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
                    text="signup_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    logo_alignment="left"
                    width="340"
                  />
                </div>
              </div>

              <p
                className="register-signin-copy text-center mb-0 mt-2"
                style={{ color: "#667085", fontSize: "0.875rem" }}
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
