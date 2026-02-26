import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth", "/l/", "/api/landing/", "/api/register", "/api/logos"];
const PROTECTED_PREFIXES = ["/create", "/api/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths are always allowed (checked first — overrides protected)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protect /create and all /api/* routes by default
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  console.log(`[proxy] ${pathname} | token: ${token ? "exists" : "missing"}`);

  if (!token) {
    return redirectToLogin(request);
  }

  const session = await verifySessionToken(token);

  if (!session) {
    const response = redirectToLogin(request);
    response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand).*)",
  ],
};
