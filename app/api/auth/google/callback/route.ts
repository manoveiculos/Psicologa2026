import { NextRequest, NextResponse } from "next/server";
import { oauthClient } from "@/lib/google";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", req.url));

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    return NextResponse.json(
      { error: "refresh_token ausente — revogue o acesso na conta Google e tente de novo." },
      { status: 400 },
    );
  }

  await sb.from("settings_psicologa").upsert({
    user_id: user.id,
    google_refresh_token: tokens.refresh_token,
  });

  return NextResponse.redirect(new URL("/configuracoes", req.url));
}
