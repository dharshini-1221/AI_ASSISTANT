
"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  StoredUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(user: Record<string, unknown>): StoredUser {
  return {
    ...user,
    id: String(user.id ?? user._id ?? ""),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    role: String(user.role ?? "Student"),
    permissions: Array.isArray(user.permissions)
      ? user.permissions.filter(
          (permission): permission is string =>
            typeof permission === "string"
        )
      : [],
  } as StoredUser;
}

function getRoleHome(role: string): string {
  switch (role) {
    case "Administrator":
      return "/admin";
    case "Mentor":
      return "/mentor";
    default:
      return "/dashboard";
  }
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: { data?: { code?: string } };
      }
    ).response;

    return response?.data?.code;
  }

  return undefined;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore an existing session from local storage.
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      const restoredUser = normalizeUser(
        storedUser as unknown as Record<string, unknown>
      );

      setTokenState(storedToken);
      setUser(restoredUser);

      // Refresh the role cookie so proxy.ts stays in sync with local storage
      // after the cookie's 7-day lifetime lapses.
      setStoredUser(restoredUser);
    } else {
      clearAuth();
      setTokenState(null);
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  // Login.
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);

      try {
        const { data } = await axiosInstance.post(
          "/api/auth/login",
          { email, password }
        );

        if (
          typeof data?.token !== "string" ||
          !data.token ||
          !data?.user ||
          typeof data.user !== "object"
        ) {
          throw new Error("Invalid login response from server.");
        }

        const loggedInUser = normalizeUser(data.user);

        if (!loggedInUser.id) {
          throw new Error("User ID missing from login response.");
        }

        setToken(data.token);
        setStoredUser(loggedInUser);
        setTokenState(data.token);
        setUser(loggedInUser);

        router.replace(getRoleHome(loggedInUser.role));
      } catch (error) {
        if (getErrorCode(error) === "PASSWORD_CHANGE_REQUIRED") {
          router.replace("/change-password");
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Register.
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<void> => {
      setIsLoading(true);

      try {
        const { data } = await axiosInstance.post(
          "/api/auth/register",
          { name, email, password }
        );

        if (data?.token && data?.user) {
          const registeredUser = normalizeUser(data.user);

          if (!registeredUser.id) {
            throw new Error("User ID missing from registration response.");
          }

          setToken(data.token);
          setStoredUser(registeredUser);
          setTokenState(data.token);
          setUser(registeredUser);

          router.replace(getRoleHome(registeredUser.role));
        } else {
          // Registration requires email verification via OTP.
          router.replace(
            `/verify-email?email=${encodeURIComponent(email)}`
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Logout.
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (getToken()) {
        await axiosInstance.post("/api/auth/logout");
      }
    } catch (error) {
      console.error("Backend logout failed:", error);
    } finally {
      clearAuth();
      setTokenState(null);
      setUser(null);
      router.replace("/");
    }
  }, [router]);

  // Refresh the current user's server-side data.
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const { data } = await axiosInstance.get("/api/auth/me");

      if (!data?.user || typeof data.user !== "object") {
        throw new Error("User data missing from server response.");
      }

      const refreshedUser = normalizeUser(data.user);

      if (!refreshedUser.id) {
        throw new Error("User ID missing from server response.");
      }

      setStoredUser(refreshedUser);
      setUser(refreshedUser);

      if (refreshedUser.requirePasswordChange) {
        router.replace("/change-password");
      }
    } catch {
      await logout();
    }
  }, [logout, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isLoggedIn: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
