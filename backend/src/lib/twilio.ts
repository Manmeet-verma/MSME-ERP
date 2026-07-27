import twilio from "twilio";

interface ConnectorSettings {
  account_sid?: string;
  auth_token?: string;
  api_key?: string;
  api_key_secret?: string;
  phone_number?: string;
  [key: string]: string | undefined;
}

async function getCredentials(): Promise<ConnectorSettings | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) return null;

  const resp = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=twilio",
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  ).then((res) => res.json()) as { items?: Array<{ settings: ConnectorSettings }> };

  const settings = resp.items?.[0]?.settings;
  if (!settings?.account_sid) return null;
  return settings;
}

export async function getTwilioClient() {
  const settings = await getCredentials();
  if (!settings) return null;

  const accountSid = settings.account_sid!;
  const fromNumber = settings.phone_number ?? null;

  if (!fromNumber) {
    console.error("[twilio] no phone_number in connector settings");
    return null;
  }

  // Twilio API Key SIDs start with "SK" and are 34 chars.
  // If api_key looks like a valid Key SID, use API key auth.
  if (settings.api_key?.startsWith("SK") && settings.api_key_secret) {
    return {
      client: twilio(settings.api_key, settings.api_key_secret, { accountSid }),
      fromNumber,
    };
  }

  // Otherwise fall back to Account SID + Auth Token basic auth.
  // The Replit connector stores the auth token in api_key_secret.
  const authToken = settings.auth_token || settings.api_key_secret || settings.api_key;
  if (authToken) {
    return {
      client: twilio(accountSid, authToken),
      fromNumber,
    };
  }

  console.error("[twilio] unable to determine auth credentials from connector settings");
  return null;
}
