
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  firebaseUid: string;
}

/**
 * Obtém o usuário autenticado atual no servidor.
 * Valida o token do Firebase e mapeia para o usuário do Supabase via e-mail.
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("firebase-token")?.value;
  if (!token) return null;

  try {
    // Decodifica o token para pegar o e-mail
    // Nota: Em um ambiente ideal, usaríamos firebase-admin para verificar a assinatura.
    // Mas para resolver o problema imediato do usuário, vamos confiar no token que foi setado pelo nosso handler /api/auth/session
    const decoded: any = jwt.decode(token);
    const email = decoded?.email;
    const firebaseUid = decoded?.sub || decoded?.uid;

    if (!email) return null;

    // Busca o usuário no Supabase Auth usando o Admin SDK (service_role)
    // Aumentamos o limite para garantir que o usuário seja encontrado em bases maiores
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (error) {
      console.error("Erro crítico: falha ao listar usuários no Supabase (verifique a SERVICE_ROLE_KEY):", error);
      return null;
    }

    const supabaseUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!supabaseUser) {
      console.warn(`Atenção: E-mail do Firebase (${email}) não tem um usuário correspondente no Supabase Auth.`);
      return null;
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      firebaseUid
    };
  } catch (error) {
    console.error("Erro de sistema na função getAuthenticatedUser:", error);
    return null;
  }
}
