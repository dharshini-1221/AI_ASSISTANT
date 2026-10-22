
const TOKEN_KEY = "token";
const USER_KEY = "user";
const ROLE_COOKIE = "auth_role";
const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const isSecureContext = (): boolean =>
  typeof window !== "undefined" &&
  window.location.protocol === "https:";

// Mirrors the signed-in role into a cookie so proxy.ts can gate routes
// before the client bundle loads. This is a UX affordance, not a security
// boundary: the value is user-editable and every API route still verifies
// the JWT, the active session, and the required permissions.
const writeRoleCookie = (role: string): void => {
  if (typeof document === "undefined") return;

  const secure = isSecureContext() ? "; Secure" : "";

  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(
    role
  )}; Path=/; Max-Age=${ROLE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
};

export const clearRoleCookie = (): void => {
  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export type BuiltInRole = "Student" | "Mentor" | "Administrator";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  emailVerified?: boolean;
  requirePasswordChange?: boolean;
}

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
};

export const getStoredUser = (): StoredUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    const user = JSON.parse(raw);

    if (
      !user ||
      typeof user.id !== "string" ||
      typeof user.role !== "string"
    ) {
      return null;
    }

    return user as StoredUser;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: StoredUser): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  writeRoleCookie(user.role);
};

export const removeStoredUser = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  clearRoleCookie();
};

export const clearAuth = (): void => {
  removeToken();
  removeStoredUser();
};

export const isAuthenticated = (): boolean => !!getToken();

// Convenience role check for UI rendering.
// Backend authorization remains the security boundary.
export const hasRole = (...roles: string[]): boolean => {
  const user = getStoredUser();
  return !!user && roles.includes(user.role);
};

// Convenience permission check for UI rendering.
// Always enforce permissions on the backend as well.
export const hasPermission = (permission: string): boolean => {
  const user = getStoredUser();
  if (!user || !permission) return false;

  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  return permissions.includes("*") || permissions.includes(permission);
};
