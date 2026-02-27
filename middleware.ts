import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('adminToken')?.value;
  
  const isAdminLoginPage = request.nextUrl.pathname === '/admin';
  const isAdminDashboardPage = request.nextUrl.pathname.startsWith('/admin/dashboard');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Allow access to login page without token
  if (isAdminLoginPage) {
    // If user has token, redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/admin/dashboard/analytics', request.url));
    }
    return NextResponse.next();
  }

  // Protect all other admin routes
  if (isAdminRoute && !token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};