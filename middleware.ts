
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "./lib/auth-config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublic = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth');
  const isCron = request.nextUrl.pathname.startsWith('/api/cron');

  // Se não for pública nem cron
  if (!isPublic && !isCron) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Verificação de e-mail na allowlist
    if (!isEmailAllowed(user.email)) {
      // Forçar logout e redirecionar
      const res = NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
      // Tentar limpar cookies de auth do supabase
      res.cookies.delete('sb-access-token');
      res.cookies.delete('sb-refresh-token');
      return res;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
