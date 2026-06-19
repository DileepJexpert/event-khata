import { NextResponse } from "next/server";

export async function GET() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  return NextResponse.json({
    enabled: Boolean(keyId && keySecret),
  });
}
