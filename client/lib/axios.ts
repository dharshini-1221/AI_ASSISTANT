
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { clearAuth } from "@/lib/auth";

const TOKEN_KEY = "token";

// In production the client and the Express API are served from the same Vercel
// deployment (the /api/* rewrite routes to the server service), so requests use
// a relative URL and never cross origins. Locally the API runs on port 5000.
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

// No default Content-Type: axios sets "application/json" automatically for
// plain-object bodies, while a hard-coded default would make axios treat
// FormData bodies as JSON (and strip the multipart boundary).
const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
});

let isRedirecting = false;

// Attach the saved token to requests.
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Handle authentication and password-change errors.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const code = error.response?.data?.code;
    const requestUrl = error.config?.url ?? "";

    const isLogoutRequest =
      requestUrl.includes("/api/auth/logout");

    const isLoginOrRegisterRequest =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register");

    const isPasswordChangeRequest =
      requestUrl.includes("/api/auth/change-password");

    // The backend requires a password update before other operations.
    if (
      status === 403 &&
      code === "PASSWORD_CHANGE_REQUIRED" &&
      window.location.pathname !== "/change-password"
    ) {
      window.location.replace("/change-password");
      return Promise.reject(error);
    }

    // Clear invalid or expired sessions.
    if (
      status === 401 &&
      !isLogoutRequest &&
      !isLoginOrRegisterRequest &&
      !isPasswordChangeRequest &&
      !isRedirecting
    ) {
      isRedirecting = true;

      clearAuth();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      } else {
        isRedirecting = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
