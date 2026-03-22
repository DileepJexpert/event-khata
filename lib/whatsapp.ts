export function getWhatsAppShareURL(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const indianPhone = cleanPhone.startsWith("91")
    ? cleanPhone
    : `91${cleanPhone}`;
  return `https://wa.me/${indianPhone}?text=${encodeURIComponent(message)}`;
}

export function getPaymentReceiptMessage(data: {
  eventName: string;
  vendorName: string;
  amount: number;
  mode: string;
  date: string;
}): string {
  return `✅ Payment recorded — EventKhata

Event: ${data.eventName}
Vendor: ${data.vendorName}
Amount: ₹${data.amount.toLocaleString("en-IN")}
Mode: ${data.mode}
Date: ${data.date}

This is an automated receipt from EventKhata.`;
}
