import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Load .env from project root
import { fileURLToPath } from "url";
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

// Initialize Firebase
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

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseRate(rateStr: string): number {
  if (!rateStr) return 0;
  return parseFloat(rateStr.replace("INR", "").replace(",", "").trim()) || 0;
}

function parseBool(val: string): boolean {
  return val?.toUpperCase() === "TRUE";
}

async function main() {
  // 1. Get organization ID
  const orgSnap = await db.collection("organizations").limit(1).get();
  if (orgSnap.empty) {
    console.error("No organization found. Create one first via the app.");
    process.exit(1);
  }
  const orgId = orgSnap.docs[0].id;
  console.log(`Using organization: ${orgId}`);

  // 2. Read CSV using readline for memory efficiency
  const csvPath = path.join(__dirname, "products-import.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  const header: string[] = [];
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  let imported = 0;
  let skipped = 0;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (lineNum === 1) {
      header.push(...trimmed.split(",").map((h) => h.trim()));
      console.log(`Header columns: ${header.length}`);
      continue;
    }

    const values = parseCsvLine(trimmed);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const name = row["Item Name"]?.trim();
    if (!name) {
      skipped++;
      continue;
    }

    const rate = parseRate(row["Rate"]);
    const purchaseRate = parseRate(row["Purchase Rate"]);
    const gstRate = parseFloat(row["Intra State Tax Rate"]) || 18;
    const isActive = row["Status"]?.toLowerCase() === "active";
    const isOpeningStock = row["Item Type"]?.toLowerCase() === "inventory";
    const itemType = row["Product Type"] || "goods";

    const productData = {
      organizationId: orgId,
      name,
      sku: row["SKU"] || "",
      hsnCode: row["HSN/SAC"] || "",
      description: row["Description"] || "",
      rate: String(rate),
      basePrice: String(rate),
      purchaseRate: String(purchaseRate),
      taxable: parseBool(row["Taxable"]),
      taxabilityType: row["Taxability Type"] || "",
      gstRate: String(gstRate),
      intraStateTaxName: row["Intra State Tax Name"] || "",
      intraStateTaxRate: row["Intra State Tax Rate"] || "",
      interStateTaxName: row["Inter State Tax Name"] || "",
      interStateTaxRate: row["Inter State Tax Rate"] || "",
      isTaxOnLabelPrice: parseBool(row["Is Tax Calculated on Label Price"]),
      productType: itemType,
      category: itemType,
      unit: row["Usage unit"] || row["Unit Name"] || "NOS",
      account: row["Account"] || "",
      accountCode: row["Account Code"] || "",
      purchaseAccount: row["Purchase Account"] || "",
      purchaseAccountCode: row["Purchase Account Code"] || "",
      inventoryAccount: row["Inventory Account"] || "",
      inventoryAccountCode: row["Inventory Account Code"] || "",
      trackInventory: isOpeningStock,
      openingStock: row["Opening Stock"] || "0",
      stockOnHand: row["Stock On Hand"] || "0",
      reorderPoint: row["Reorder Point"] || "",
      inventoryValuationMethod: row["Inventory Valuation Method"] || "",
      isActive,
      sellable: parseBool(row["Sellable"]),
      purchasable: parseBool(row["Purchasable"]),
      isComboProduct: parseBool(row["Is Combo Product"]),
      source: row["Source"] || "",
      referenceId: row["Reference ID"] || "",
      lastSyncTime: row["Last Sync Time"] || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = db.collection("products").doc();
    batch.set(docRef, productData);
    imported++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch: ${imported} products imported...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\nImport complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
