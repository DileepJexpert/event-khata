// Client-side helpers for AI-powered suggestions.
// These only work when ANTHROPIC_API_KEY is set on the server.

export async function checkAIEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/ai/status");
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.enabled;
  } catch {
    return false;
  }
}

export type BudgetSplitItem = {
  amount: number;
  percent: number;
  tips: string;
};

export type BudgetSuggestionRequest = {
  event_type: string;
  total_budget: number;
  city?: string;
  guest_count?: number;
  sub_events?: string[];
};

export type BudgetSuggestionResponse = {
  budget_split: Record<string, BudgetSplitItem>;
};

export async function getBudgetSuggestion(
  data: BudgetSuggestionRequest
): Promise<BudgetSuggestionResponse> {
  const res = await fetch("/api/ai/budget-suggestion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Failed to get budget suggestion");
  }
  return res.json();
}

export type VendorSuggestionRequest = {
  event_type: string;
  budget: number;
  category?: string;
  city?: string;
  requirements?: string;
};

export type VendorSuggestionResponse = {
  suggestions: string;
  checklist: string[];
  price_range: { min: number; max: number };
  negotiation_tips: string[];
};

export async function getVendorSuggestion(
  data: VendorSuggestionRequest
): Promise<VendorSuggestionResponse> {
  const res = await fetch("/api/ai/vendor-suggestion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Failed to get vendor suggestion");
  }
  return res.json();
}
