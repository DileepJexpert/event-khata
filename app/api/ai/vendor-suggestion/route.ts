import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function POST(req: NextRequest) {
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI suggestions are not configured. Set ANTHROPIC_API_KEY to enable." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { event_type, budget, category, city, requirements } = body;

    if (!event_type || !budget) {
      return NextResponse.json(
        { error: "event_type and budget are required" },
        { status: 400 }
      );
    }

    const details = [
      `Event type: ${event_type}`,
      `Budget for this category: INR ${budget}`,
      category ? `Vendor category: ${category}` : null,
      city ? `City: ${city}` : null,
      requirements ? `Special requirements: ${requirements}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system:
          'You are an expert Indian event planner and vendor negotiator. Given an event type, budget, and vendor category, provide practical vendor selection advice for the Indian market. Return JSON only, no markdown fences. The JSON must have exactly these keys: "suggestions" (string — 2-3 sentences of overall advice), "checklist" (array of strings — 5-7 things to verify/look for when selecting this vendor), "price_range" (object with "min" and "max" as numbers in INR — typical price range for this category in India), "negotiation_tips" (array of strings — 3-5 practical negotiation tips for Indian vendors in this category).',
        messages: [
          {
            role: "user",
            content: `Give vendor selection tips for:\n${details}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[AI vendor-suggestion] Claude API error:", response.status, err);
      return NextResponse.json(
        { error: "Failed to get AI suggestion. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[AI vendor-suggestion] Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI suggestion." },
      { status: 500 }
    );
  }
}
