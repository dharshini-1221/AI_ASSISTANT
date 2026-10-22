
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { clearAuth } from "@/lib/auth";

const TOKEN_KEY = "token";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
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
