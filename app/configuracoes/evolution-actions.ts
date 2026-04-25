"use server";

export async function getWhatsAppStatus(url: string, apiKey: string, instance: string) {
  if (!url || !apiKey || !instance) return { status: "desconfigurado" };

  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/instance/connectionState/${instance}`, {
      headers: { "apikey": apiKey },
      cache: 'no-store'
    });

    if (!response.ok) return { status: "erro" };
    const data = await response.json();
    
    // Evolution API v1/v2 returns { instance: { state: "open" | "close" | "connecting" } }
    const state = data?.instance?.state || data?.state;
    
    if (state === "open") return { status: "conectado" };
    if (state === "connecting") return { status: "aguardando" };
    return { status: "desconectado" };
  } catch (error) {
    console.error("Erro ao verificar status WhatsApp:", error);
    return { status: "erro" };
  }
}

export async function getQRCode(url: string, apiKey: string, instance: string) {
  if (!url || !apiKey || !instance) return { error: "Configurações incompletas" };

  try {
    const cleanUrl = url.replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/instance/connect/${instance}`, {
      headers: { "apikey": apiKey },
      cache: 'no-store'
    });

    if (!response.ok) return { error: "Erro ao gerar QR Code" };
    const data = await response.json();
    
    // Evolution API returns base64 in different fields depending on version/method
    // Usually it's in data.base64 or just the response is the QR info
    return { qr: data.base64 || data.code || data.qrcode?.base64 };
  } catch (error) {
    console.error("Erro ao obter QR Code:", error);
    return { error: "Erro de conexão com a Evolution API" };
  }
}

export async function disconnectWhatsApp(url: string, apiKey: string, instance: string) {
  if (!url || !apiKey || !instance) return { error: "Configurações incompletas" };

  try {
    const cleanUrl = url.replace(/\/$/, "");
    // Some versions use logout, some use delete (careful with delete as it might remove the instance)
    // Logout is safer to just disconnect
    const response = await fetch(`${cleanUrl}/instance/logout/${instance}`, {
      method: "DELETE",
      headers: { "apikey": apiKey },
    });

    if (!response.ok) return { error: "Erro ao desconectar" };
    return { success: true };
  } catch (error) {
    console.error("Erro ao desconectar WhatsApp:", error);
    return { error: "Erro de conexão" };
  }
}

export async function sendTestMessage(url: string, apiKey: string, instance: string, number: string) {
  if (!url || !apiKey || !instance || !number) return { error: "Dados incompletos" };

  try {
    const cleanUrl = url.replace(/\/$/, "");
    // Remove characters from number
    const cleanNumber = number.replace(/\D/g, "");
    
    const response = await fetch(`${cleanUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { 
        "apikey": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: "Olá! Esta é uma mensagem de teste do seu sistema Psicóloga.app. Se você recebeu isso, sua conexão está funcionando perfeitamente! ✅"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.message || "Erro ao enviar mensagem" };
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar mensagem de teste:", error);
    return { error: "Erro de conexão" };
  }
}
