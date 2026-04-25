import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth-config";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/";

  if (code) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      const email = data.user.email;
      if (!isEmailAllowed(email)) {
        await sb.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
      }
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=callback", req.url));
}
