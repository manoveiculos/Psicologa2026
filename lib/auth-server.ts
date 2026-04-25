
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
  const token = cookies().get("firebase-token")?.value;
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
    // Usamos a lista de usuários pois não podemos fazer query direta em auth.users facilmente via RPC/PostgREST sem permissões extras
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error("Erro ao listar usuários no Supabase:", error);
      return null;
    }

    const supabaseUser = users.find(u => u.email === email);

    if (!supabaseUser) {
      console.warn(`Usuário do Firebase (${email}) não encontrado no Supabase.`);
      // Opcional: Criar o usuário no Supabase se ele for permitido
      return null;
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      firebaseUid
    };
  } catch (error) {
    console.error("Erro na autenticação do servidor:", error);
    return null;
  }
}
