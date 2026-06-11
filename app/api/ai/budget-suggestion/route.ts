import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI suggestions are not configured. Set ANTHROPIC_API_KEY to enable." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { event_type, total_budget, city, guest_count, sub_events } = body;

    if (!event_type || !total_budget) {
      return NextResponse.json(
        { error: "event_type and total_budget are required" },
        { status: 400 }
      );
    }

    const details = [
      `Event type: ${event_type}`,
      `Total budget: INR ${total_budget}`,
      city ? `City: ${city}` : null,
      guest_count ? `Approximate guest count: ${guest_count}` : null,
      sub_events && sub_events.length > 0
        ? `Sub-events/functions: ${sub_events.join(", ")}`
        : null,
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
          "You are an expert Indian event planner. Given an event type and budget, suggest how to split the budget across vendor categories. Return JSON only, no markdown fences. The JSON must have a single key \"budget_split\" whose value is an object where each key is a vendor category name (e.g. \"Venue\", \"Catering\", \"Decoration\", \"Photography\", \"Entertainment\", etc.) and each value is an object with: amount (number, in INR), percent (number, percentage of total budget), tips (string, one practical tip for this category).",
        messages: [
          {
            role: "user",
            content: `Suggest a budget split for the following event:\n${details}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[AI budget-suggestion] Claude API error:", response.status, err);
      return NextResponse.json(
        { error: "Failed to get AI suggestion. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";

    // Strip markdown fences if present
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[AI budget-suggestion] Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI suggestion." },
      { status: 500 }
    );
  }
}
