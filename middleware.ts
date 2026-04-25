
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
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
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

  // Verificação de sessão simplificada via cookie do Firebase
  const firebaseToken = request.cookies.get("firebase-token")?.value;

  const isPublic = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth');
  const isCron = request.nextUrl.pathname.startsWith('/api/cron');

  if (!isPublic && !isCron) {
    if (!firebaseToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      // Decodificação básica do JWT (payload é a segunda parte)
      const payloadBase64 = firebaseToken.split('.')[1];
      if (payloadBase64) {
        const payload = JSON.parse(atob(payloadBase64));
        const email = payload.email;
        
        if (!isEmailAllowed(email)) {
          console.warn(`Acesso negado para e-mail não autorizado: ${email}`);
          const response = NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
          response.cookies.delete("firebase-token");
          return response;
        }
      }
    } catch (e) {
      console.error("Erro ao decodificar token no middleware:", e);
      return NextResponse.redirect(new URL('/login', request.url));
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
