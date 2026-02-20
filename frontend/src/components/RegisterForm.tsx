import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import apiClient from "../services/api-client";

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

function RegisterForm() {
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError("");
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

        const uploadedPhotoUrl =
          uploadResponse.data?.url ??
          uploadResponse.data?.photoUrl ??
          uploadResponse.data?.imageUrl;

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

      localStorage.setItem("accessToken", registerResponse.data.accessToken);
      localStorage.setItem("refreshToken", registerResponse.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(registerResponse.data.user));
      navigate("/home");
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const serverMessage =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Registration failed. Please try again.";
        setApiError(serverMessage);
      } else {
        setApiError("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    setApiError("");
    setIsLoading(true);

    try {
      const response = await apiClient.post("/auth/google", {
        credential: credentialResponse.credential,
      });

      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/home");
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const serverMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Google Login Failed";
        setApiError(serverMessage);
        console.log("Google Login Failed");
      } else {
        setApiError("Google Login Failed");
        console.log("Google Login Failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setApiError("Google Login Failed");
    console.log("Google Login Failed");
  };

  return (
    <main className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-4 bg-light">
      <div
        className="card border-0 shadow-lg w-100"
        style={{ maxWidth: "1100px" }}
      >
        <div className="row g-0">
          <div className="col-md-6 d-none d-md-block position-relative">
            <div
              className="h-100 w-100"
              style={{
                minHeight: "700px",
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDmApdlBnWJh6TuTk4fpYKK00N3q6hJ7Z8w9Nuyzwbjssll0GFwdnbyQGsSQEWXSLnIfU8fQqX23Y1OMiL6EjpSEbBN5lQIYGV2u3_GbOyrBNGkWkxcv35VNF01Q-stwWzSPKaTfmZmfkfJVMs2xhuHtwNY7SLw0DogUZKjl81bNo797ACMdqCHrI0emGSzne4NOfhGsym5xte5HgYdWZ34qEAkVCLI1GHNhazdBsSKe42TLdXdDLFbSt8e4KKARMznLvVewvnfAs2e')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end p-4 p-lg-5 text-white bg-dark bg-opacity-25">
              <h2 className="fw-bold mb-2">Connect with your world.</h2>
              <p className="mb-0 fs-5">
                Join a community of creators and friends sharing moments that
                matter.
              </p>
            </div>
          </div>

          <div className="col-12 col-md-6 d-flex align-items-center">
            <div className="w-100 p-4 p-lg-5">
              <div className="mx-auto" style={{ maxWidth: "440px" }}>
                <div className="mb-4">
                  <h1 className="h2 fw-bold mb-2">Create account</h1>
                  <p className="text-muted mb-0">
                    Enter your details to get started.
                  </p>
                </div>

                {apiError && (
                  <div className="alert alert-danger">{apiError}</div>
                )}

                <form
                  className="d-flex flex-column gap-3"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <div>
                    <label htmlFor="username" className="form-label">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      className="form-control"
                      {...register("username")}
                    />
                    {errors.username && (
                      <p className="text-danger small mt-1">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-danger small mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="form-control"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-danger small mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="profilePicture" className="form-label">
                      Profile Picture
                    </label>
                    <input
                      id="profilePicture"
                      type="file"
                      accept="image/*"
                      className="form-control"
                      {...register("profilePicture")}
                    />
                    {errors.profilePicture && (
                      <p className="text-danger small mt-1">
                        {errors.profilePicture.message}
                      </p>
                    )}
                    <p className="text-muted small mt-1 mb-0">Optional</p>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? "Registering..." : "Register"}
                  </button>

                  <div className="d-flex align-items-center gap-3 my-1">
                    <hr className="flex-grow-1 my-0" />
                    <span className="text-muted small">Or continue with</span>
                    <hr className="flex-grow-1 my-0" />
                  </div>

                  <div className="d-flex justify-content-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      width="360"
                    />
                  </div>

                  <p className="text-center text-muted mt-2 mb-0">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="btn btn-link p-0 text-decoration-none fw-semibold"
                    >
                      Sign in
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default RegisterForm;
