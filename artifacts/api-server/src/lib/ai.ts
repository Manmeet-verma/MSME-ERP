import { anthropic } from "@workspace/integrations-anthropic-ai";

const MODEL = "claude-haiku-4-5";

function extractText(content: { type: string; text?: string }[]): string {
  const first = content[0];
  return first?.type === "text" ? first.text ?? "" : "";
}

function parseJsonFromText<T>(text: string, fallback: T): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const arrStart = text.indexOf("[");
  const arrEnd = text.lastIndexOf("]");
  try {
    if (arrStart >= 0 && arrEnd > arrStart && (start < 0 || arrStart < start)) {
      return JSON.parse(text.slice(arrStart, arrEnd + 1)) as T;
    }
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
  } catch {
    // fall through
  }
  return fallback;
}

export async function aiDraftSocialPost(opts: {
  prompt: string;
  platforms: ("facebook" | "instagram" | "linkedin")[];
  tone?: string;
  context?: string;
}): Promise<{ base: string; variants: Record<string, string> }> {
  const tone = opts.tone ?? "professional";
  const system =
    "You write social media posts for an Indian MSME. Respect platform conventions: LinkedIn longer + professional, Instagram short with emojis + hashtags, Facebook conversational. Return only JSON.";
  const user = `Write a ${tone} social post about: ${opts.prompt}${
    opts.context ? `\n\nContext: ${opts.context}` : ""
  }\n\nReturn JSON with shape {"base": string, "variants": {"facebook": string, "instagram": string, "linkedin": string}}. Only include keys for these platforms: ${opts.platforms.join(
    ", ",
  )}. Keep instagram under 220 chars and add 3-5 relevant hashtags. LinkedIn up to 800 chars, no hashtags.`;
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = extractText(msg.content as { type: string; text?: string }[]);
  const parsed = parseJsonFromText<{ base?: string; variants?: Record<string, string> }>(text, {});
  const base = parsed.base ?? opts.prompt;
  const variants: Record<string, string> = {};
  for (const p of opts.platforms) variants[p] = parsed.variants?.[p] ?? base;
  return { base, variants };
}

export async function aiRewriteTone(opts: { text: string; tone: string }): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Rewrite this in a ${opts.tone} tone for an Indian MSME audience. Reply with just the rewritten text, no preface.\n\n${opts.text}`,
      },
    ],
  });
  return extractText(msg.content as { type: string; text?: string }[]).trim();
}

export interface DashboardSnapshot {
  newLeadsToday: number;
  hotLeads: number;
  callsThisWeek: number;
  emailsSentThisWeek: number;
  quotationsSentThisWeek: number;
  invoicesUnpaid: number;
  revenueThisMonth: number;
  overdueAmount: number;
  openTasks: number;
  lowStockItems: number;
  openPurchaseOrders: number;
  stockValue: number;
  topLeadSource?: string;
  topLeadSourceConversion?: number;
  socialPostsThisWeek?: number;
  emailOpenRate?: number;
}

export async function aiDailyInsights(snap: DashboardSnapshot): Promise<{
  headline: string;
  bullets: string[];
  suggestions: string[];
}> {
  const fallback = {
    headline: "Run AI insights once Anthropic is configured.",
    bullets: [
      `${snap.newLeadsToday} new leads today, ${snap.hotLeads} hot.`,
      `${snap.invoicesUnpaid} unpaid invoices, ₹${snap.overdueAmount.toLocaleString("en-IN")} overdue.`,
      `${snap.lowStockItems} items below threshold.`,
    ],
    suggestions: ["Reach out to hot leads first.", "Send reminders for overdue invoices."],
  };
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are an Indian MSME business operations analyst. Read the numbers and tell the owner where to focus today. Be direct, specific, and skip filler.",
      messages: [
        {
          role: "user",
          content: `Today's metrics (JSON):\n${JSON.stringify(snap)}\n\nReturn JSON: {"headline": string (one sentence, the single most important thing to know today), "bullets": string[] (3-5 short observations grounded in the numbers), "suggestions": string[] (2-4 concrete next actions). All amounts use Indian Rupees with ₹ symbol.}`,
        },
      ],
    });
    const text = extractText(msg.content as { type: string; text?: string }[]);
    const parsed = parseJsonFromText<typeof fallback>(text, fallback);
    return {
      headline: parsed.headline || fallback.headline,
      bullets: parsed.bullets?.length ? parsed.bullets : fallback.bullets,
      suggestions: parsed.suggestions?.length ? parsed.suggestions : fallback.suggestions,
    };
  } catch {
    return fallback;
  }
}

// Natural-language search — restricted whitelist of safe parameterized queries.
export interface NlSearchPlan {
  intent: string;
  entity: "invoices" | "leads" | "clients" | "quotations" | "tasks" | "items";
  filters: Record<string, string | number | boolean>;
  explanation: string;
}

const ENTITY_FILTERS: Record<NlSearchPlan["entity"], string[]> = {
  invoices: ["status", "minTotal", "maxTotal", "overdueOnly", "clientId"],
  leads: ["status", "priority", "source"],
  clients: ["state"],
  quotations: ["status", "minTotal", "maxTotal"],
  tasks: ["status", "priority"],
  items: ["lowStock", "category"],
};

export async function aiPlanNlSearch(query: string): Promise<NlSearchPlan> {
  const sys = `You translate a natural-language business query into a strict JSON plan. Valid entities: invoices, leads, clients, quotations, tasks, items. Allowed filters per entity: ${JSON.stringify(
    ENTITY_FILTERS,
  )}. Numeric amounts are in Rupees. Return ONLY JSON with shape {"intent": string, "entity": string, "filters": object, "explanation": string}. Reject anything outside this set by returning entity:"invoices" filters:{} and an explanation.`;
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: sys,
      messages: [{ role: "user", content: query }],
    });
    const text = extractText(msg.content as { type: string; text?: string }[]);
    const parsed = parseJsonFromText<Partial<NlSearchPlan>>(text, {});
    const entity = (parsed.entity ?? "invoices") as NlSearchPlan["entity"];
    const allowed = ENTITY_FILTERS[entity] ?? [];
    const filters: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(parsed.filters ?? {})) {
      if (allowed.includes(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
        filters[k] = v;
      }
    }
    return {
      intent: parsed.intent ?? query,
      entity,
      filters,
      explanation: parsed.explanation ?? "",
    };
  } catch {
    return { intent: query, entity: "invoices", filters: {}, explanation: "AI unavailable, defaulted to invoices." };
  }
}
