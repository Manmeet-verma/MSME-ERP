import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, "..", "..", "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  let currentKey = "";
  let currentValue = "";
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      if (currentKey && trimmed.includes("-----END PRIVATE KEY-----")) {
        currentValue += "\n" + trimmed;
        if (!process.env[currentKey]) process.env[currentKey] = currentValue;
        currentKey = "";
        currentValue = "";
      }
      continue;
    }
    if (currentKey) {
      currentValue += "\n" + trimmed;
      if (trimmed.includes("-----END PRIVATE KEY-----")) {
        if (!process.env[currentKey]) process.env[currentKey] = currentValue;
        currentKey = "";
        currentValue = "";
      }
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      if (value.includes("-----BEGIN PRIVATE KEY-----")) {
        currentKey = key;
        currentValue = value;
      } else {
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
  if (currentKey && currentValue) {
    if (!process.env[currentKey]) process.env[currentKey] = currentValue;
  }
}

const projectId = process.env.FIREBASE_PROJECT_ID || "msme-erp";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (clientEmail && privateKey) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
} else {
  initializeApp({ projectId });
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

function scoreLead(lead: {
  budget?: number | string | null;
  phone?: string | null;
  email?: string | null;
  source?: string;
}): { score: number; priority: string; nextAction: string } {
  let score = 30;
  const budget = lead.budget ? Number(lead.budget) : 0;
  if (budget > 100000) score += 30;
  else if (budget > 25000) score += 15;
  if (lead.phone) score += 15;
  if (lead.email) score += 10;
  if (lead.source === "indiamart") score += 10;
  score = Math.max(0, Math.min(100, score));
  const priority = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
  const nextAction =
    priority === "hot"
      ? "Call within 24 hours and send a quotation"
      : priority === "warm"
        ? "Send a follow-up email within 2 days"
        : "Add to nurture campaign";
  return { score, priority, nextAction };
}

interface LeadData {
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  source: string;
  status: string;
  gstin: string;
  contactType: string;
  address: string;
  pincode: string;
  externalId: string;
}

async function main() {
  const orgSnap = await db.collection("organizations").limit(1).get();
  if (orgSnap.empty) {
    console.error("No organization found.");
    process.exit(1);
  }
  const orgId = orgSnap.docs[0].id;
  console.log(`Using organization: ${orgId}`);

  // Load JSON data
  const jsonPath = path.join(__dirname, "leads-import.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("leads-import.json not found at:", jsonPath);
    process.exit(1);
  }
  const leadsData: LeadData[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${leadsData.length} leads from JSON`);

  // Get existing leads to dedup by name + org
  const existingSnap = await db.collection("leads")
    .where("organizationId", "==", orgId)
    .select("name", "phone", "externalId")
    .get();
  const existingNames = new Set<string>();
  const existingPhones = new Set<string>();
  const existingExtIds = new Set<string>();
  for (const doc of existingSnap.docs) {
    const d = doc.data();
    if (d.name) existingNames.add(d.name.toLowerCase().trim());
    if (d.phone) existingPhones.add(d.phone.replace(/\D/g, ""));
    if (d.externalId) existingExtIds.add(d.externalId);
  }
  console.log(`Existing leads: ${existingSnap.size} (names: ${existingNames.size}, phones: ${existingPhones.size})`);

  let imported = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (const lead of leadsData) {
    if (!lead.name || !lead.name.trim()) {
      skipped++;
      continue;
    }

    // Dedup by external ID
    if (lead.externalId && existingExtIds.has(lead.externalId)) {
      skipped++;
      continue;
    }

    // Dedup by name
    const nameKey = lead.name.toLowerCase().trim();
    if (existingNames.has(nameKey)) {
      skipped++;
      continue;
    }

    // Dedup by phone
    const phoneClean = lead.phone.replace(/\D/g, "");
    if (phoneClean && existingPhones.has(phoneClean)) {
      skipped++;
      continue;
    }

    const { score, priority, nextAction } = scoreLead({
      phone: lead.phone || null,
      email: lead.email || null,
      source: lead.source,
    });

    const sourceMap: Record<string, string> = {
      csv: "csv",
      website: "website",
      indiamart: "indiamart",
      whatsapp: "whatsapp",
      manual: "manual",
    };

    const docData = {
      organizationId: orgId,
      name: lead.name.trim(),
      email: lead.email || null,
      phone: lead.phone || null,
      company: lead.company || null,
      city: lead.city || null,
      state: lead.state || null,
      country: lead.country || null,
      address: lead.address || null,
      pincode: lead.pincode || null,
      gstin: lead.gstin || null,
      contactType: lead.contactType || null,
      source: sourceMap[lead.source] || "csv",
      externalId: lead.externalId || null,
      status: "new",
      priority,
      score,
      nextAction,
      budget: null,
      product: null,
      notes: null,
      assignedToId: null,
      createdById: null,
      convertedClientId: null,
      metadata: null,
      lastContactedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    batch.set(db.collection("leads").doc(), docData);
    existingNames.add(nameKey);
    if (phoneClean) existingPhones.add(phoneClean);
    if (lead.externalId) existingExtIds.add(lead.externalId);
    imported++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch: ${imported} leads imported...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\nImport complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (duplicates/empty): ${skipped}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
