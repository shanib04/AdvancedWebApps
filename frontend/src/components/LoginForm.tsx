import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { z } from "zod";
import apiClient from "../services/api-client";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError("");

    try {
      const response = await apiClient.post("/auth/login", {
        email: data.email,
        password: data.password,
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
          "Login failed. Please check your credentials.";
        setApiError(serverMessage);
        return;
      }

      setApiError("Login failed. Please check your credentials.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    setApiError("");

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
        return;
      }

      setApiError("Google Login Failed");
      console.log("Google Login Failed");
    }
  };

  const handleGoogleError = () => {
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
                  <h1 className="h2 fw-bold mb-2">Welcome back</h1>
                  <p className="text-muted mb-0">
                    Please enter your details to sign in.
                  </p>
                </div>

                {apiError && <p className="text-danger mb-3">{apiError}</p>}

                <form
                  className="d-flex flex-column gap-3"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                >
                  <div>
                    <label htmlFor="email" className="form-label">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      placeholder="Email address"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-danger">{errors.email.message}</p>
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
                      placeholder="Password"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-danger">{errors.password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
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
                    Don&apos;t have an account?{" "}
                    <Link
                      to="/register"
                      className="btn btn-link p-0 text-decoration-none fw-semibold"
                    >
                      Sign up
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

export default LoginForm;
