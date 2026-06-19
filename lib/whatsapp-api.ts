export interface SendMessageData {
  phone: string;
  message?: string;
  template_name?: string;
  template_params?: string[];
}

export interface SendMessageResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export async function checkWhatsAppAPI(): Promise<boolean> {
  try {
    const res = await fetch("/api/whatsapp/status");
    if (!res.ok) return false;
    const data = await res.json();
    return data.enabled === true;
  } catch {
    return false;
  }
}

export async function sendWhatsAppMessage(
  data: SendMessageData
): Promise<SendMessageResponse> {
  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result;
  } catch {
    return { success: false, error: "Network error" };
  }
}
