import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_COOKIE = "auth_role";

// Coarse route gating, run before the app renders so a signed-out visitor
// never sees a flash of protected UI. The same rules are enforced inside each
// page; the API remains the real authorization boundary.
const ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["Administrator"] },
  { prefix: "/mentor", roles: ["Mentor"] },
];

const readRole = (value: string | undefined): string | null => {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const matchesPrefix = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = readRole(request.cookies.get(ROLE_COOKIE)?.value);

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const rule = ROLE_RULES.find((entry) =>
    matchesPrefix(pathname, entry.prefix)
  );

  if (rule && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/mentor/:path*",
    "/interview/:path*",
    "/placement/:path*",
    "/peer-challenge/:path*",
    "/practice/:path*",
    "/history/:path*",
    "/recruiter/:path*",
    "/security-history/:path*",
    "/active-sessions/:path*",
  ],
};
