import twilio from "twilio";

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) {
    return null;
  }

  const data = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=twilio",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((d: { items?: Array<{ settings: { account_sid?: string; api_key?: string; api_key_secret?: string; phone_number?: string } }> }) => d.items?.[0]);

  if (!data?.settings?.account_sid || !data?.settings?.api_key || !data?.settings?.api_key_secret) {
    return null;
  }

  return {
    accountSid: data.settings.account_sid,
    apiKey: data.settings.api_key,
    apiKeySecret: data.settings.api_key_secret,
    phoneNumber: data.settings.phone_number ?? null,
  };
}

export async function getTwilioClient() {
  const creds = await getCredentials();
  if (!creds) return null;
  return {
    client: twilio(creds.apiKey, creds.apiKeySecret, { accountSid: creds.accountSid }),
    fromNumber: creds.phoneNumber,
  };
}
