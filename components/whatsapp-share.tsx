"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { getWhatsAppShareURL } from "@/lib/whatsapp";

interface WhatsAppShareProps {
  phone?: string | null;
  message: string;
  label?: string;
}

export function WhatsAppShare({
  phone,
  message,
  label = "Share on WhatsApp",
}: WhatsAppShareProps) {
  const handleShare = () => {
    if (phone) {
      window.open(getWhatsAppShareURL(phone, message), "_blank");
    } else {
      // Use native share or copy to clipboard
      if (navigator.share) {
        navigator.share({ text: message });
      } else {
        navigator.clipboard.writeText(message);
      }
    }
  };

  return (
    <Button
      onClick={handleShare}
      className="bg-green-500 hover:bg-green-600"
      size="lg"
    >
      <MessageCircle className="mr-2 h-5 w-5" />
      {label}
    </Button>
  );
}
