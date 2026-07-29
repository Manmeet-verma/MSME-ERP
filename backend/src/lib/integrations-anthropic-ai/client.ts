import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error(
      "AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY must be set",
    );
  }
  _anthropic = new Anthropic({ apiKey, baseURL });
  return _anthropic;
}
