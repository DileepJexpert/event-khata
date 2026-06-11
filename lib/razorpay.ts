export type CreatePaymentLinkRequest = {
  amount: number;
  currency?: string;
  description: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  reference_id?: string;
  callback_url?: string;
};

export type CreatePaymentLinkResponse = {
  short_url: string;
  id: string;
  status: string;
};

let _razorpayEnabled: boolean | null = null;

export async function isRazorpayEnabled(): Promise<boolean> {
  if (_razorpayEnabled !== null) return _razorpayEnabled;

  try {
    const res = await fetch("/api/razorpay/status");
    const data = await res.json();
    _razorpayEnabled = data.enabled;
    return data.enabled;
  } catch {
    return false;
  }
}

export async function createPaymentLink(
  data: CreatePaymentLinkRequest
): Promise<CreatePaymentLinkResponse> {
  const res = await fetch("/api/razorpay/create-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Failed to create payment link");
  }

  return res.json();
}
