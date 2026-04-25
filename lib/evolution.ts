type SendArgs = {
  url: string;
  apiKey: string;
  instance: string;
  number: string;
  text: string;
};

export async function sendWhatsappText({
  url,
  apiKey,
  instance,
  number,
  text,
}: SendArgs) {
  const endpoint = `${url.replace(/\/$/, "")}/message/sendText/${instance}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API ${res.status}: ${body}`);
  }
  return res.json();
}

export function renderTemplate(
  tpl: string,
  vars: Record<string, string>,
): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
