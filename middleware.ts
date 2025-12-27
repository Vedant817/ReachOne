import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth();
  const isAuthenticated = !!session;
  const onboardingCompleted = session?.user?.onboardingCompleted as boolean;

  if (!isAuthenticated && pathname !== "/login" && pathname !== "/signup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && !onboardingCompleted && pathname !== "/onboarding" && pathname !== "/") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isAuthenticated && onboardingCompleted && (pathname === "/login" || pathname === "/signup" || pathname === "/onboarding")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
