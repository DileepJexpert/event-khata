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

export function getPaymentReminderMessage(data: {
  vendorName: string;
  amount: number;
  dueDate: string;
  label: string;
  overdue: boolean;
}): string {
  const greeting = `Dear ${data.vendorName},`;
  const line = data.overdue
    ? `This is a gentle reminder that a payment of ₹${data.amount.toLocaleString("en-IN")} (${data.label}) was due on ${data.dueDate} and is now pending.`
    : `This is a reminder that a payment of ₹${data.amount.toLocaleString("en-IN")} (${data.label}) is due on ${data.dueDate}.`;
  return `${greeting}

${line}

We'll process it shortly. Please share your latest payment details if anything has changed.

Thank you!`;
}

export function getEventUpdateMessage(data: {
  clientName: string;
  eventType: string;
  updateText: string;
}): string {
  return `Dear ${data.clientName},

Here is an update regarding your ${data.eventType}:

${data.updateText}

If you have any questions, feel free to reach out.

Best regards,
EventKhata`;
}
