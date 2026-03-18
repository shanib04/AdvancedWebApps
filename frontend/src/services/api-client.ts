import axios from "axios";

type RetriableRequestConfig = {
  _retry?: boolean;
  url?: string;
  headers?: Record<string, string>;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL?.trim(),
});

export const clearAuthStateAndRedirect = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");

  if (accessToken && accessToken !== "undefined" && accessToken !== "null") {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthRefreshCall = requestUrl.includes("/auth/refresh");
    const isAuthLogoutCall = requestUrl.includes("/auth/logout");

    if (originalRequest._retry || isAuthRefreshCall || isAuthLogoutCall) {
      clearAuthStateAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = localStorage.getItem("refreshToken");

    if (
      !refreshToken ||
      refreshToken === "undefined" ||
      refreshToken === "null"
    ) {
      clearAuthStateAndRedirect();
      return Promise.reject(error);
    }

    try {
      const refreshResponse = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL?.trim()}/auth/refresh`,
        { refreshToken },
      );

      const newAccessToken = refreshResponse.data?.accessToken;
      const newRefreshToken = refreshResponse.data?.refreshToken;

      if (!newAccessToken) {
        clearAuthStateAndRedirect();
        return Promise.reject(error);
      }

      localStorage.setItem("accessToken", newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken);
      }

      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${newAccessToken}`,
      };

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAuthStateAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
