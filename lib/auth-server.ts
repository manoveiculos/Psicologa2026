
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
    // Verificação real do token usando Firebase Admin
    let decoded: any;
    try {
      const { auth: adminAuth } = require("./firebase-admin").getFirebaseAdmin();
      decoded = await adminAuth.verifyIdToken(token);
    } catch (e) {
      console.error("Falha na verificação do ID Token do Firebase:", e);
      // Fallback para decode apenas se não houver variáveis de ambiente (DANGEROUS)
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.warn("AVISO DE SEGURANÇA: Usando decodificação insegura pois as variáveis do Firebase Admin não estão configuradas.");
        decoded = jwt.decode(token);
      } else {
        return null;
      }
    }
    
    const email = decoded?.email;
    const firebaseUid = decoded?.sub || decoded?.uid;

    if (!email) return null;

    // Busca o usuário no Supabase Auth usando o Admin SDK (service_role)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    });
    
    if (error) {
      console.error("Erro Supabase Auth Admin:", error);
      return null;
    }

    let supabaseUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Auto-provisioning: Se o usuário existe no Firebase mas não no Supabase, cria no Supabase
    if (!supabaseUser) {
      console.log(`Auto-provisioning: Criando usuário ${email} no Supabase...`);
      const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { firebase_uid: firebaseUid }
      });
      
      if (createError) {
        console.error("Erro ao auto-provisionar usuário no Supabase:", createError);
        return null;
      }
      
      supabaseUser = newUser as any;
    }

    if (!supabaseUser) return null;

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
