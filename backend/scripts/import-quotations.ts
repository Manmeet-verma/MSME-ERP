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

const TERMS = `1. Payment: 80% Advance, 20% Before Dispatch. Full payment is mandatory before installation.
2. Order Policy: Non-refundable and non-changeable once the order is placed. Quote valid for 15 days.
3. Warranty: 1-Year on LED Modules & 3-Months on Controllers (Manufacturing Defects Only).
4. Exclusions: No coverage for physical damage, power surges, or damage during client-managed relocation/transport.
5. Site Readiness: Client must provide structure, scaffolding, cranes, and permits.
6. Installation: as actual basis only if the site is ready on team arrival; otherwise, Rs.2,500/day idle charge applies.
7. Logistics: Travel, food, and stay for the team are at the Client's expense. GST & Transport at actuals.
8. Inspection: Product performance must be verified at our premises before dispatch. No returns post-dispatch.`;

const NOTES = `1. Our Modules: TECHON Brand Module
2. SMPS: TECHON/G-Energy/Rong/Others Power Supply
3. Material Will be ready in 7-10 working days
4. Transport AS actual
5. Installation is Free if Structure is ready when team reached.
6. Team Travelling and Accommodation is in Client Scope.`;

interface EstItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  amount: number;
}

interface EstData {
  quoteNumber: string;
  date: string;
  expiryDate?: string;
  placeOfSupply: string;
  clientName: string;
  clientAddress: string;
  clientGstin?: string;
  items: EstItem[];
  subtotal: number;
  discountAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  isTaxInclusive?: boolean;
  shippingCharge?: number;
}

const estimates: EstData[] = [
  {
    quoteNumber: "EST-AB/26-27/1123",
    date: "2026-07-16",
    expiryDate: "2026-07-31",
    placeOfSupply: "Punjab (03)",
    clientName: "Harpreet Singh",
    clientAddress: "Ludhiana, Punjab, India",
    items: [
      { description: "LED Display Screen P4 Outdoor Led Screen Size 20ft * 10ft High Brightness", hsn: "852800", qty: 200, rate: 4500, amount: 900000 },
      { description: "Processor/LED Controller live video control device + software", hsn: "853100", qty: 1, rate: 35000, amount: 35000 },
      { description: "Foundation Nut Bolt - Nut Bolt for two poles", hsn: "85299090", qty: 8, rate: 1500, amount: 12000 },
      { description: "FRAME - Iron Frame for screen, for two pole screen with chhatri", hsn: "730600", qty: 200, rate: 200, amount: 40000 },
      { description: "POLE - 10ft Double Pole for strong structure 12 inch", hsn: "85299090", qty: 2, rate: 22000, amount: 44000 },
      { description: "Civil work - only foundation for poles under ground work", hsn: "995400", qty: 2, rate: 18000, amount: 36000 },
      { description: "Plates - Iron Plates for two poles", hsn: "85299090", qty: 8, rate: 3800, amount: 30400 },
      { description: "Transportation, Packing and Engg. as per actual", hsn: "996800", qty: 1, rate: 0, amount: 0 },
      { description: "Installation - install for screen and poles", hsn: "998736", qty: 1, rate: 25000, amount: 25000 },
    ],
    subtotal: 1122400,
    cgst: 101016,
    sgst: 101016,
    total: 1324432,
  },
  {
    quoteNumber: "EST-AB/26-27/1122",
    date: "2026-07-16",
    placeOfSupply: "Maharashtra (27)",
    clientName: "Matrix Vision",
    clientAddress: "JANATA SAHAKARI BANK, KARVE ROAD BRANCH, PUNE 411004, India",
    clientGstin: "27ALOPV9258J1Z0",
    items: [
      { description: "CONTROL CARD NOVASTAR IND-528", hsn: "853700", qty: 2, rate: 1800, amount: 3600 },
    ],
    subtotal: 3600,
    igst: 648,
    total: 4248,
  },
  {
    quoteNumber: "EST-AB/26-27/1121",
    date: "2026-07-15",
    placeOfSupply: "Punjab (03)",
    clientName: "Aarush Jain",
    clientAddress: "223 deeplai chowk, pitumpura, New Delhi 110034, India",
    items: [
      { description: "HOLOGRAM FAN 42 cm", hsn: "852859", qty: 1, rate: 4000, amount: 4000 },
    ],
    subtotal: 4000,
    cgst: 360,
    sgst: 360,
    total: 4720,
  },
  {
    quoteNumber: "EST-AB/26-27/1120",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab (03)",
    clientName: "Naman",
    clientAddress: "Rz 17 roshan Mandi najafgarh new delhi 110043, Delhi, India",
    items: [
      { description: "DIGITAL STANDEE A TYPE WHITE COLOR SIZE 43 inch", hsn: "852909", qty: 1, rate: 34500, amount: 34500 },
      { description: "PACKING - Packing charges", hsn: "998540", qty: 1, rate: 1800, amount: 1800 },
      { description: "TRANSPORTATION", hsn: "85312000", qty: 1, rate: 1500, amount: 1500 },
    ],
    subtotal: 37800,
    discountAmount: 1000,
    cgst: 3312,
    sgst: 3312,
    total: 43424,
  },
  {
    quoteNumber: "EST-AB/26-27/1119",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab (03)",
    clientName: "Moxa Marketing Services",
    clientAddress: "H No 1-1-16/B, Arun Nagar, Saket Road, Sainikpuri, Ecil, Secunderabad, Hyderabad, Telangana 500062, India",
    items: [
      { description: "OUTDOOR LED VIDEO WALL P3 OUTDOOR SCREEN SIZE 4ft*4ft High Brightness", hsn: "853100", qty: 16, rate: 6000, amount: 96000 },
      { description: "LED CONTROLLER NOVASTAR/HUIDU as per screen need", hsn: "85423100", qty: 1, rate: 15000, amount: 15000 },
      { description: "STRUCTURE AS PER ACTUAL", hsn: "73089070", qty: 1, rate: 0, amount: 0 },
      { description: "Installation AS PER ACTUAL", hsn: "998736", qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 111000,
    cgst: 9990,
    sgst: 9990,
    total: 130980,
  },
  {
    quoteNumber: "EST-AB/26-27/1118",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab (03)",
    clientName: "Moxa Marketing Services",
    clientAddress: "H No 1-1-16/B, Arun Nagar, Saket Road, Sainikpuri, Ecil, Secunderabad, Hyderabad, Telangana 500062, India",
    items: [
      { description: "INDOOR LED VIDEO WALL P2.5 INDOOR SCREEN SIZE 4FT*4FT High Resolution", hsn: "853100", qty: 16, rate: 5500, amount: 88000 },
      { description: "LED CONTROLLER NOVASTAR/HUIDU as per screen need", hsn: "85423100", qty: 1, rate: 15000, amount: 15000 },
      { description: "STRUCTURE AS PER ACTUAL", hsn: "73089070", qty: 1, rate: 0, amount: 0 },
      { description: "Installation AS PER ACTUAL", hsn: "998736", qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 103000,
    cgst: 9270,
    sgst: 9270,
    total: 121540,
  },
  {
    quoteNumber: "EST-AB/26-27/1117",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Jharkhand (20)",
    clientName: "M/s Sriyan Tech & ENV Solutions",
    clientAddress: "Holding No. 0010000119000A3, WARD NO. 1, POST OFFICE ROAD, CHAKRADHARPUR-833102, JHARKHAND, India",
    clientGstin: "20COFPJ8821P1ZO",
    items: [
      { description: "OUTDOOR LED DISPLAY SCREEN P4 OUTDOOR SCREEN SIZE 6.3FT*4.2FT CABINET SIZE 960mm*1280mm", hsn: "008531", qty: 1, rate: 150000, amount: 150000 },
      { description: "LED CONTROLLER Bx controller Y series with sensor input USB/WIFI/LAN/CLOUD", hsn: "85423100", qty: 1, rate: 30000, amount: 30000 },
      { description: "STRUCTURE as per actual", hsn: "73089070", qty: 1, rate: 28000, amount: 28000 },
      { description: "Installation as per actual", hsn: "998736", qty: 1, rate: 10000, amount: 10000 },
    ],
    subtotal: 218000,
    igst: 39240,
    total: 257240,
  },
  {
    quoteNumber: "EST-AB/26-27/1116",
    date: "2026-07-14",
    placeOfSupply: "Punjab (03)",
    clientName: "Jitender Johar",
    clientAddress: "Jammu & Kashmir, India",
    items: [
      { description: "DIGITAL STANDEE Samsung 32 inch Wi-Fi/Ethernet/USB 180 Wide Viewing Angle 3-Year Warranty", hsn: "852909", qty: 1, rate: 35000, amount: 35000 },
      { description: "DIGITAL STANDEE Samsung 43 inch Wi-Fi/USB/Internet 180 Wide Viewing Angle 3-Year Warranty", hsn: "852909", qty: 1, rate: 52500, amount: 52500 },
      { description: "Transportation As per actual", hsn: "996800", qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 87500,
    isTaxInclusive: true,
    cgst: 6673.73,
    sgst: 6673.73,
    total: 87500,
  },
  {
    quoteNumber: "EST-AB/26-27/1115",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab (03)",
    clientName: "Santosh Kumar",
    clientAddress: "Civil Judges Court (Junior Division), Ponduru 532168, Andhra Pradesh, India",
    items: [
      { description: "SMPS POWER SUPPLY Rainproof 12V 700A SMPS for Outdoor LED Displays", hsn: "85319000", qty: 1, rate: 500, amount: 500 },
    ],
    subtotal: 500,
    cgst: 45,
    sgst: 45,
    total: 590,
  },
  {
    quoteNumber: "EST-AB/26-27/1114",
    date: "2026-07-13",
    expiryDate: "2026-07-20",
    placeOfSupply: "Madhya Pradesh (23)",
    clientName: "VINAYAK GUPTA",
    clientAddress: "SHRI VINAYAK ENTERPRISES, INDORE(MP) 452010, Madhya Pradesh, India",
    clientGstin: "23ABSPG3415E1Z0",
    items: [
      { description: "INDOOR LED VIDEO WALL P1.8 INDOOR ACTIVE LED SCREEN SIZE 13*8 FT Fine Pixel LED Display", hsn: "853100", qty: 104, rate: 8800, amount: 915200 },
      { description: "LED CONTROLLER NOVASTAR/HUIDU as per screen need", hsn: "85423100", qty: 1, rate: 35000, amount: 35000 },
      { description: "STRUCTURE AS PER ACTUAL", hsn: "73089070", qty: 1, rate: 0, amount: 0 },
      { description: "Installation as per actual", hsn: "998736", qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 950200,
    isTaxInclusive: true,
    igst: 144945.76,
    total: 950200,
  },
  {
    quoteNumber: "EST-AB/26-27/1113",
    date: "2026-07-13",
    expiryDate: "2026-07-20",
    placeOfSupply: "Uttar Pradesh (09)",
    clientName: "SSPS GLOBAL PRIVATE LIMITED",
    clientAddress: "Noida, Uttar Pradesh 201301, India",
    clientGstin: "09AACCT8021F1ZG",
    items: [
      { description: "LED CONTROLLER A5L LED CONTROLLER WiFi and easy remote content management", hsn: "85423100", qty: 2, rate: 20000, amount: 40000 },
    ],
    subtotal: 40000,
    igst: 7200,
    total: 47200,
  },
  {
    quoteNumber: "EST-AB/26-27/1112",
    date: "2026-07-13",
    placeOfSupply: "Punjab (03)",
    clientName: "Manjit Singh",
    clientAddress: "Hoshiarpur, Punjab, India",
    items: [
      { description: "Led display Advertising P4 Outdoor LED Display Solution 6.30ftx4.20ft = 26.46 sqft including LED Controller Card", hsn: "853100", qty: 1, rate: 132000, amount: 132000 },
      { description: "Installation WELDER AND IRON WORK IN YOUR SCOPE", hsn: "998736", qty: 26.46, rate: 450, amount: 11907 },
    ],
    subtotal: 143907,
    cgst: 12951.63,
    sgst: 12951.63,
    total: 169810.26,
  },
  {
    quoteNumber: "EST-AB/26-27/1111",
    date: "2026-07-13",
    placeOfSupply: "Punjab (03)",
    clientName: "PRACHAR ADVERTISERS PRIVATE LIMITED",
    clientAddress: "E-208, FOCAL POINT, Industrial Area Phase 8B, SAS Nagar, Mohali 140307, Punjab, India",
    clientGstin: "03AAECP2504R1ZD",
    items: [
      { description: "OUTDOOR LED DISPLAY SCREEN 2 by 3", hsn: "008531", qty: 1, rate: 42000, amount: 42000 },
    ],
    subtotal: 42000,
    cgst: 3780,
    sgst: 3780,
    shippingCharge: 350,
    total: 49910,
  },
  {
    quoteNumber: "EST-AB/26-27/1110",
    date: "2026-07-10",
    placeOfSupply: "Punjab (03)",
    clientName: "Rajni Bala",
    clientAddress: "Una, Himachal Pradesh, India",
    items: [
      { description: "OUTDOOR RENTAL LED VIDEO WALL P4 Outdoor Rental LED Display 40 CABINETS", hsn: "853100", qty: 40, rate: 22500, amount: 900000 },
      { description: "LED CONTROLLER CARD Novastar processor with HDMI/USB/WIFI", hsn: "852910", qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 900000,
    cgst: 81000,
    sgst: 81000,
    total: 1062000,
  },
  {
    quoteNumber: "EST-AB/26-27/1109",
    date: "2026-07-10",
    placeOfSupply: "Punjab (03)",
    clientName: "HK TEXFAB PRIVATE LIMITED",
    clientAddress: "E-207, PHASE 4, FOCAL POINT, LUDHIANA 141010, Punjab, India",
    clientGstin: "03AAFCH1375MIZJ",
    items: [
      { description: "Led Display Board BACK LIGHT LED DISPLAY 10ftx12ft = 120 sq.ft INCLUDING FITTING WITH UV PRINTED", hsn: "853100", qty: 1, rate: 36000, amount: 36000 },
    ],
    subtotal: 36000,
    cgst: 3240,
    sgst: 3240,
    total: 42480,
  },
  {
    quoteNumber: "EST-AB/26-27/1108",
    date: "2026-07-09",
    expiryDate: "2026-07-16",
    placeOfSupply: "Uttar Pradesh (09)",
    clientName: "ienergizer IT Services pvt Ltd",
    clientAddress: "A-37, Sector-60, Noida 201301, Uttar Pradesh, India",
    clientGstin: "09AACCI2757F1ZK",
    items: [
      { description: "OUTDOOR LED VIDEO WALL P4 OUTDOOR LED SCREEN SIZE 4*8 FT Water proof dust proof cabinet IP65", hsn: "853100", qty: 32, rate: 5500, amount: 176000 },
      { description: "LED CONTROLLER", hsn: "85423100", qty: 1, rate: 24500, amount: 24500 },
      { description: "STRUCTURE on client scope", hsn: "73089070", qty: 1, rate: 0, amount: 0 },
      { description: "Installation as per actual", hsn: "998736", qty: 1, rate: 0, amount: 0 },
    ],
    subtotal: 200500,
    isTaxInclusive: true,
    igst: 30584.75,
    total: 200500,
  },
];

async function main() {
  const orgSnap = await db.collection("organizations").limit(1).get();
  if (orgSnap.empty) {
    console.error("No organization found. Create one first.");
    process.exit(1);
  }
  const orgId = orgSnap.docs[0].id;
  const orgName = orgSnap.docs[0].data().name || "Unknown";
  console.log(`Using organization: ${orgId} (${orgName})`);

  let imported = 0;
  let itemsCreated = 0;

  for (const est of estimates) {
    const subtotal = est.subtotal;
    const discountPercent = est.discountAmount ? String(((est.discountAmount / (subtotal + est.discountAmount)) * 100).toFixed(2)) : "0";
    const discountAmount = est.discountAmount ? String(est.discountAmount.toFixed(2)) : "0";

    let taxPercent = "18";
    let taxAmount = "0";

    if (est.isTaxInclusive) {
      if (est.igst) {
        taxPercent = "18";
        taxAmount = String(est.igst.toFixed(2));
      } else {
        taxPercent = "18";
        const cgst = est.cgst || 0;
        const sgst = est.sgst || 0;
        taxAmount = String((cgst + sgst).toFixed(2));
      }
    } else if (est.igst) {
      taxPercent = "18";
      taxAmount = String(est.igst.toFixed(2));
    } else {
      taxPercent = "18";
      const cgst = est.cgst || 0;
      const sgst = est.sgst || 0;
      taxAmount = String((cgst + sgst).toFixed(2));
    }

    const quotationData = {
      organizationId: orgId,
      quotationNumber: est.quoteNumber,
      clientId: null as string | null,
      createdById: null as string | null,
      status: "approved",
      validUntil: est.expiryDate ? `${est.expiryDate}T23:59:59.000Z` : null,
      subtotal: String(subtotal.toFixed(2)),
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      total: String(est.total.toFixed(2)),
      notes: NOTES,
      terms: TERMS,
      clientName: est.clientName,
      clientAddress: est.clientAddress,
      clientGstin: est.clientGstin || "",
      placeOfSupply: est.placeOfSupply,
      isTaxInclusive: est.isTaxInclusive || false,
      shippingCharge: est.shippingCharge ? String(est.shippingCharge.toFixed(2)) : "0",
      createdAt: new Date(est.date).toISOString(),
      updatedAt: new Date(est.date).toISOString(),
    };

    const docRef = await db.collection("quotations").add(quotationData);
    console.log(`Created quotation: ${est.quoteNumber} -> ${docRef.id}`);

    for (const item of est.items) {
      const itemData = {
        quotationId: docRef.id,
        productId: null as string | null,
        itemId: null as string | null,
        description: item.description,
        hsnCode: item.hsn,
        widthFt: null as string | null,
        heightFt: null as string | null,
        areaSqFt: null as string | null,
        quantity: item.qty,
        unitPrice: String(item.rate.toFixed(2)),
        totalPrice: String(item.amount.toFixed(2)),
        notes: null as string | null,
        createdAt: new Date(est.date).toISOString(),
        updatedAt: new Date(est.date).toISOString(),
      };

      await db.collection("quotation_items").add(itemData);
      itemsCreated++;
    }

    imported++;
  }

  console.log(`\nImport complete!`);
  console.log(`  Quotations imported: ${imported}`);
  console.log(`  Line items created: ${itemsCreated}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
