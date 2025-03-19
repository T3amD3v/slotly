import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * NextJS Middleware for Authentication and Route Protection
 * 
 * This middleware intercepts all requests and enforces authentication rules:
 * 1. Redirects unauthenticated users to sign-in page for protected routes
 * 2. Redirects authenticated users away from public pages (like sign-in)
 * 3. Allows all users to access API routes and static assets
 * 
 * The middleware is configured to run on all routes except for static assets,
 * images, and specific authentication-related API endpoints.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Allow all NextAuth API routes to pass through without middleware processing
  if (path.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/auth/signin', 
    '/auth/error'
  ];
  
  // Check if the path is public by matching against our list of public paths
  const isPublicPath = publicPaths.some(publicPath => 
    path.startsWith(publicPath) || path === publicPath
  );
  
  // Extract session token from cookies using next-auth
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  // Redirect unauthenticated users to sign-in page for protected routes
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Redirect authenticated users to home page if they try to access public pages
  // This prevents authenticated users from seeing the sign-in page
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Allow the request to proceed normally
  return NextResponse.next();
}

/**
 * Middleware Matcher Configuration
 * 
 * Defines which routes the middleware should run on.
 * This configuration makes the middleware run on all routes EXCEPT:
 * - Next.js static files (_next/static)
 * - Next.js image optimization files (_next/image)
 * - Favicon
 * - Public assets in the public directory
 * - API auth routes (to avoid interfering with NextAuth)
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/auth/).*)',
  ],
} 