import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicPages = ["/login", "/register", "/"];
const publicApiRoutes = ["/api/auth", "/api/public", "/api/health"];

// Routes that should be accessible without auth (for guests)
const guestAccessibleRoutes = [
  "/chat",
  "/faq", 
  "/video",
  "/knowledgebase",
  "/calculator",
  "/tips",
  "/home",
];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Skip middleware for static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/sw.js") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }
  
  // Always allow API auth routes (NextAuth needs these)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow public pages
  if (publicPages.some(page => pathname === page || pathname.startsWith(page + "/"))) {
    return NextResponse.next();
  }
  
  // Allow guest accessible routes (chat, faq, etc.)
  if (guestAccessibleRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }
  
  // For protected routes (admin, account), check auth via cookie presence
  // Full auth check happens server-side in the route handlers
  const sessionToken = req.cookies.get("next-auth.session-token") || 
                       req.cookies.get("__Secure-next-auth.session-token");
  
  // Admin routes require authentication
  if (pathname.startsWith("/admin") || pathname.startsWith("/account")) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
