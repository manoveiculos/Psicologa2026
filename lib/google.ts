import { google } from "googleapis";

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function calendarClient(refreshToken: string) {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

export async function watchCalendar(refreshToken: string, calendarId: string, address: string, userId: string) {
  const cal = calendarClient(refreshToken);
  const id = crypto.randomUUID();
  
  return cal.events.watch({
    calendarId: calendarId || "primary",
    requestBody: {
      id: id,
      type: "web_hook",
      address: address,
      token: userId, // Usamos o token para passar o userId de volta no webhook
      expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    },
  });
}

export async function stopWatch(refreshToken: string, id: string, resourceId: string) {
  const cal = calendarClient(refreshToken);
  return cal.channels.stop({
    requestBody: {
      id,
      resourceId,
    },
  });
}

/**
 * extendedProperties.private espelha campos de negócio para identificar a origem
 * da alteração e evitar loops Google → App → Google.
 */
export function buildExtendedProperties(args: {
  appId: string;
  tipo_atendimento?: string | null;
  status_financeiro?: string | null;
  duracao_sessao_min?: number | null;
}) {
  const priv: Record<string, string> = { app_id: args.appId };
  if (args.tipo_atendimento) priv.tipo_atendimento = args.tipo_atendimento;
  if (args.status_financeiro) priv.status_financeiro = args.status_financeiro;
  if (args.duracao_sessao_min) priv.duracao_sessao_min = String(args.duracao_sessao_min);
  return { private: priv };
}
