import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 });
  }

  // Em uma aplicação real, deveríamos usar firebase-admin para verificar o token
  // e criar um session cookie. Aqui vamos simplificar para fins de demonstração
  // e setar um cookie com o idToken (ou uma flag) que o middleware possa ler.
  
  const cookieStore = await cookies();
  cookieStore.set("firebase-token", idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 5, // 5 dias
    path: "/",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("firebase-token");
  return NextResponse.json({ success: true });
}
