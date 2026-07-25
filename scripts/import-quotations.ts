import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
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

const NOTES_TEMPLATE = `All Payments AS per invoice need to match in banking in two transaction max. and before dispatch we check all payments should be reflect in bank after that dispatch can be done Payment As per INR AMOUNT. Payment Term : 80% Advance, 20 on material dispatch (Payments Must clear before installation if any dues.)
1. Our Modules: TECHON Brand Module
2. SMPS: TECHON/G-Energy/Rong/Others Power Supply
3. Material Will be ready in 7-10 working days
All Installation related material like Iron, Scaffolding, Cranes, and Permission for Cranes Req. Before installation date so that installation can be scheduled.
Transport AS actual
Installation is Free if Structure is ready when team reached.
Else per Day Team Daily Wage Charge applicable 2500 per day.
Team Travelling and Accommodation is in Client Scope.`;

const TERMS_TEMPLATE = `1. Payment: 80% Advance, 20% Before Dispatch. Full payment is mandatory before installation.
2. Order Policy: Non-refundable and non-changeable once the order is placed. Quote valid for 15 days.
3. Warranty: 1-Year on LED Modules & 3-Months on Controllers Manufacturing Defects Only.
4. Exclusions: No coverage for physical damage, power surges, or damage during client-managed relocation/transport.
5. Site Readiness: Client must provide structure, scaffolding, cranes, and permits.
6. Installation: as actual basis only if the site is ready on team arrival; otherwise, Rs 2,500/day idle charge applies.
7. Logistics: Travel, food, and stay for the team are at the Client's expense. GST & Transport at actuals.`;

interface QuotationItem {
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  notes?: string;
}

interface QuotationData {
  quoteNo: string;
  date: string;
  expiryDate?: string;
  placeOfSupply: string;
  stateCode: string;
  client: {
    name: string;
    company?: string;
    address?: string;
    city: string;
    state: string;
    pincode?: string;
    country?: string;
    gstin?: string;
  };
  billTo?: {
    name: string;
    address?: string;
    city: string;
    state: string;
    pincode?: string;
    country?: string;
    gstin?: string;
  };
  items: QuotationItem[];
  taxType: "intra" | "inter";
  taxInclusive?: boolean;
  discountAmount?: number;
  shippingCharge?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  notes?: string;
  terms?: string;
}

const quotations: QuotationData[] = [
  {
    quoteNo: "EST-AB/26-27/1123",
    date: "2026-07-16",
    expiryDate: "2026-07-31",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Harpreet Singh",
      city: "Ludhiana",
      state: "Punjab",
      country: "India",
    },
    items: [
      { description: "LED Display Screen P4 Outdoor Led Screen Size 20ft x 10ft High Brightness Viewing Angle H: 140/V: 140 Best Viewing Distance from 4m Water and weather proof", hsnCode: "852800", quantity: 200, unit: "NOS", rate: 4500, amount: 900000 },
      { description: "Processor/LED Controller - live video control device + software", hsnCode: "853100", quantity: 1, unit: "NOS", rate: 35000, amount: 35000 },
      { description: "Foundation Nut Bolt - Nut Bolt for two poles", hsnCode: "85299090", quantity: 8, unit: "NOS", rate: 1500, amount: 12000 },
      { description: "FRAME - Iron Frame for screen, for two pole screen with chhatri", hsnCode: "730600", quantity: 200, unit: "NOS", rate: 200, amount: 40000 },
      { description: "POLE - 10ft Double Pole for strong structure 12\"", hsnCode: "85299090", quantity: 2, unit: "NOS", rate: 22000, amount: 44000 },
      { description: "Civil work - only foundation for poles under ground work with nut bolts and 4 by 4 jaal of iron in foundation and concrete material", hsnCode: "995400", quantity: 2, unit: "NOS", rate: 18000, amount: 36000 },
      { description: "Plates - Iron Plates for two poles", hsnCode: "85299090", quantity: 8, unit: "NOS", rate: 3800, amount: 30400 },
      { description: "Transportation, Packing and Engg. - as per actual", hsnCode: "996800", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
      { description: "Installation - install for screen and poles", hsnCode: "998736", quantity: 1, unit: "NOS", rate: 25000, amount: 25000 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1122",
    date: "2026-07-16",
    placeOfSupply: "Maharashtra",
    stateCode: "27",
    client: {
      name: "Matrix Vision",
      company: "Matrix Vision",
      city: "Pune",
      state: "Maharashtra",
      gstin: "27ALOPV9258J1Z0",
    },
    items: [
      { description: "CONTROL CARD - NOVASTAR IND-528", hsnCode: "853700", quantity: 2, unit: "NOS", rate: 1800, amount: 3600 },
    ],
    taxType: "inter",
    igstRate: 18,
  },
  {
    quoteNo: "EST-AB/26-27/1121",
    date: "2026-07-15",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Aarush Jain",
      address: "223 deeplai chowk, pitumpura",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110034",
      country: "India",
    },
    items: [
      { description: "HOLOGRAM FAN 42 cm", hsnCode: "852859", quantity: 1, unit: "PCS", rate: 4000, amount: 4000 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1120",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Naman",
      address: "Rz 17 roshan Mandi najafgarh new delhi 110043",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110043",
      country: "India",
    },
    items: [
      { description: "DIGITAL STANDEE - A TYPE WHITE COLOR DIGITAL STANDEE SIZE 43\"", hsnCode: "852909", quantity: 1, unit: "NOS", rate: 34500, amount: 34500 },
      { description: "PACKING - Packing charges", hsnCode: "998540", quantity: 1, unit: "NOS", rate: 1800, amount: 1800 },
      { description: "TRANSPORTATION", hsnCode: "85312000", quantity: 1, unit: "NOS", rate: 1500, amount: 1500 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1119",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Moxa Marketing Services",
      company: "Moxa Marketing Services",
      address: "H No 1-1-16/B, Arun Nagar, Saket Road, Sainikpuri, Ecil, Secunderabad",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500062",
      country: "India",
    },
    items: [
      { description: "OUTDOOR LED VIDEO WALL - P3 OUTDOOR SCREEN SIZE 4ft x 4ft High Brightness Outdoor Display", hsnCode: "853100", quantity: 16, unit: "PCS", rate: 6000, amount: 96000 },
      { description: "LED CONTROLLER - NOVASTAR/HUIDU as per screen need", hsnCode: "85423100", quantity: 1, unit: "PCS", rate: 15000, amount: 15000 },
      { description: "STRUCTURE - AS PER ACTUAL", hsnCode: "73089070", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
      { description: "Installation - AS PER ACTUAL", hsnCode: "998736", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1118",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Moxa Marketing Services",
      company: "Moxa Marketing Services",
      address: "H No 1-1-16/B, Arun Nagar, Saket Road, Sainikpuri, Ecil, Secunderabad",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500062",
      country: "India",
    },
    items: [
      { description: "INDOOR LED VIDEO WALL - P2.5 INDOOR SCREEN SIZE 4FT x 4FT High Resolution LED Screen", hsnCode: "853100", quantity: 16, unit: "PCS", rate: 5500, amount: 88000 },
      { description: "LED CONTROLLER - NOVASTAR/HUIDU as per screen need", hsnCode: "85423100", quantity: 1, unit: "PCS", rate: 15000, amount: 15000 },
      { description: "STRUCTURE - AS PER ACTUAL", hsnCode: "73089070", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
      { description: "Installation - AS PER ACTUAL", hsnCode: "998736", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1117",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Jharkhand",
    stateCode: "20",
    client: {
      name: "M/s Sriyan Tech & ENV Solutions",
      company: "Sriyan Tech & ENV Solutions",
      address: "Holding No. 0010000119000A3, WARD NO. 1, POST OFFICE ROAD, CHAKRADHARPUR-833102 JHARKHAND",
      city: "Chakradharpur",
      state: "Jharkhand",
      pincode: "833102",
      country: "India",
      gstin: "20COFPJ8821P1ZO",
    },
    items: [
      { description: "OUTDOOR LED DISPLAY SCREEN - P4 OUTDOOR SCREEN SIZE 6.3FT x 4.2 FT CABINET SIZE: 960mm x 1280mm", hsnCode: "008531", quantity: 1, unit: "NOS", rate: 150000, amount: 150000 },
      { description: "LED CONTROLLER - Bx controller Y series with sensor input: USB, WIFI, LAN, CLOUD CONTROLLER JSON Support data", hsnCode: "85423100", quantity: 1, unit: "PCS", rate: 30000, amount: 30000 },
      { description: "STRUCTURE - as per actual", hsnCode: "73089070", quantity: 1, unit: "NOS", rate: 28000, amount: 28000 },
      { description: "Installation - as per actual", hsnCode: "998736", quantity: 1, unit: "NOS", rate: 10000, amount: 10000 },
    ],
    taxType: "inter",
    igstRate: 18,
  },
  {
    quoteNo: "EST-AB/26-27/1116",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Jitender johar",
      city: "Jammu & Kashmir",
      state: "Jammu & Kashmir",
    },
    items: [
      { description: "DIGITAL STANDEE - Samsung digital standee 32\" Wi-Fi, Ethernet & USB Connectivity Supports Images & Videos 180 Wide Viewing Angle Stylish Decorative Floor-Standing Design Ideal for Digital Menus & Indoor Advertising 3-Year Warranty", hsnCode: "852909", quantity: 1, unit: "NOS", rate: 35000, amount: 35000 },
      { description: "DIGITAL STANDEE - Samsung digital standee size 43\" Wi-Fi, USB & Internet Connectivity Supports Images & Videos 180 Wide Viewing Angle Slim & Elegant Floor-Standing Design Ideal for Indoor Advertising & Information Display 3-Year Warranty", hsnCode: "852909", quantity: 1, unit: "NOS", rate: 52500, amount: 52500 },
      { description: "Transportation - As per actual", hsnCode: "996800", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
    ],
    taxType: "intra",
    taxInclusive: true,
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1115",
    date: "2026-07-14",
    expiryDate: "2026-07-21",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Santosh Kumar",
      address: "Civil Judge's Court (Junior Division), Ponduru",
      city: "Ponduru",
      state: "Andhra Pradesh",
      pincode: "532168",
      country: "India",
    },
    items: [
      { description: "SMPS POWER SUPPLY - Rainproof 12V 700A SMPS for Outdoor LED Displays", hsnCode: "85319000", quantity: 1, unit: "NOS", rate: 500, amount: 500 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1114",
    date: "2026-07-13",
    expiryDate: "2026-07-20",
    placeOfSupply: "Madhya Pradesh",
    stateCode: "23",
    client: {
      name: "VINAYAK GUPTA",
      company: "SHRI VINAYAK ENTERPRISES",
      address: "INDORE(MP)",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      country: "India",
      gstin: "23ABSPG3415E1Z0",
    },
    items: [
      { description: "INDOOR LED VIDEO WALL - P1.8 INDOOR ACTIVE LED SCREEN SIZE 13x8 FT Fine Pixel LED Display System for Conference Hall", hsnCode: "853100", quantity: 104, unit: "PCS", rate: 8800, amount: 915200 },
      { description: "LED CONTROLLER - NOVATSTAR/HUIDU according to screen need", hsnCode: "85423100", quantity: 1, unit: "PCS", rate: 35000, amount: 35000 },
      { description: "STRUCTURE - AS PER ACTUAL", hsnCode: "73089070", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
      { description: "Installation - as per actual", hsnCode: "998736", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
    ],
    taxType: "inter",
    taxInclusive: true,
    igstRate: 18,
  },
  {
    quoteNo: "EST-AB/26-27/1113",
    date: "2026-07-13",
    expiryDate: "2026-07-20",
    placeOfSupply: "Uttar Pradesh",
    stateCode: "09",
    client: {
      name: "SSPS GLOBAL PRIVATE LIMITED",
      company: "SSPS GLOBAL PRIVATE LIMITED",
      address: "Noida, Uttar Pradesh 201301",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      gstin: "09AACCT8021F1ZG",
    },
    items: [
      { description: "LED CONTROLLER - A5L LED CONTROLLER include WiFi and easy remote content management", hsnCode: "85423100", quantity: 2, unit: "PCS", rate: 20000, amount: 40000 },
    ],
    taxType: "inter",
    igstRate: 18,
  },
  {
    quoteNo: "EST-AB/26-27/1112",
    date: "2026-07-13",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Manjit Singh",
      city: "Hoshiarpur",
      state: "Punjab",
      country: "India",
    },
    items: [
      { description: "Led display Advertising - P4 Outdoor LED Display Solution Actual screen size 6.30ft x 4.20ft = 26.46 sqft high-performance P4 Outdoor LED Display Module. Pixel Pitch: 4mm, Refresh Rate: Up to 3840Hz, Brightness: 4500 Nits, IP65 (Front)", hsnCode: "853100", quantity: 1, unit: "NOS", rate: 132000, amount: 132000 },
      { description: "Installation - WELDER AND IRON WORK IN YOUR SCOPE", hsnCode: "998736", quantity: 26, unit: "NOS", rate: 450, amount: 11907 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1111",
    date: "2026-07-13",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "PRACHAR ADVERTISERS PRIVATE LIMITED",
      company: "PRACHAR ADVERTISERS PRIVATE LIMITED",
      address: "E-208, FOCAL POINT, Industrial Area Phase 8B, SAS Nagar",
      city: "Mohali",
      state: "Punjab",
      pincode: "140307",
      country: "India",
      gstin: "03AAECP2504R1ZD",
    },
    items: [
      { description: "OUTDOOR LED DISPLAY SCREEN - 2 by 3", hsnCode: "008531", quantity: 1, unit: "NOS", rate: 42000, amount: 42000 },
    ],
    taxType: "intra",
    shippingCharge: 350,
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1110",
    date: "2026-07-10",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "Rajni Bala",
      city: "Una",
      state: "Himachal Pradesh",
      country: "India",
    },
    items: [
      { description: "OUTDOOR RENTAL LED VIDEO WALL - P4 Outdoor Rental LED Display Solution 40 CABINETS Screen Type: Outdoor Full Color LED Display Brightness: 4500+ Nits Refresh Rate: 3840Hz+ Protection: Outdoor IP Rated", hsnCode: "853100", quantity: 40, unit: "NOS", rate: 22500, amount: 900000 },
      { description: "LED CONTROLLER CARD - Novastar processor with HDMI / USB / WIFI As per your choice", hsnCode: "852910", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1109",
    date: "2026-07-10",
    placeOfSupply: "Punjab",
    stateCode: "03",
    client: {
      name: "HK TEXFAB PRIVATE LIMITED",
      company: "HK TEXFAB PRIVATE LIMITED",
      address: "E-207, PHASE 4, FOCAL POINT",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141010",
      country: "India",
      gstin: "03AAFCH1375MIZJ",
    },
    items: [
      { description: "Led Display Board - BACK LIGHT LED DISPLAY 10ft x 12ft = 120 sq.ft INCLUDING FITTING WITH UV PRINTED", hsnCode: "853100", quantity: 1, unit: "NOS", rate: 36000, amount: 36000 },
    ],
    taxType: "intra",
    cgstRate: 9,
    sgstRate: 9,
  },
  {
    quoteNo: "EST-AB/26-27/1108",
    date: "2026-07-09",
    expiryDate: "2026-07-16",
    placeOfSupply: "Uttar Pradesh",
    stateCode: "09",
    client: {
      name: "ienergizer IT Services pvt Ltd",
      company: "ienergizer IT Services pvt Ltd",
      address: "A-37, Sector-60",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      country: "India",
      gstin: "09AACCI2757F1ZK",
    },
    items: [
      { description: "OUTDOOR LED VIDEO WALL - P4 OUTDOOR LED SCREEN SIZE: 4x8 FT Water proof dust proof cabinet with IP65 rating", hsnCode: "853100", quantity: 32, unit: "PCS", rate: 5500, amount: 176000 },
      { description: "LED CONTROLLER", hsnCode: "85423100", quantity: 1, unit: "PCS", rate: 24500, amount: 24500 },
      { description: "STRUCTURE - on client scope", hsnCode: "73089070", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
      { description: "Installation - Transportation and installation as per actual", hsnCode: "998736", quantity: 1, unit: "NOS", rate: 0, amount: 0 },
    ],
    taxType: "inter",
    taxInclusive: true,
    igstRate: 18,
  },
];

function calcTax(subtotal: number, q: QuotationData) {
  const discount = q.discountAmount ?? 0;
  const afterDiscount = subtotal - discount;
  if (q.taxType === "inter") {
    const rate = q.igstRate ?? 18;
    return { cgst: 0, sgst: 0, igst: afterDiscount * (rate / 100), total: afterDiscount + afterDiscount * (rate / 100) };
  }
  const cgstRate = q.cgstRate ?? 9;
  const sgstRate = q.sgstRate ?? 9;
  const cgst = afterDiscount * (cgstRate / 100);
  const sgst = afterDiscount * (sgstRate / 100);
  return { cgst, sgst, igst: 0, total: afterDiscount + cgst + sgst };
}

async function main() {
  const orgSnap = await db.collection("organizations").limit(1).get();
  if (orgSnap.empty) {
    console.error("No organization found. Create one first via the app.");
    process.exit(1);
  }
  const orgId = orgSnap.docs[0].id;
  console.log(`Using organization: ${orgId}`);

  const existingSnap = await db.collection("quotations").where("organizationId", "==", orgId).get();
  const existingNumbers = new Set(existingSnap.docs.map((d) => d.data().quotationNumber));
  console.log(`Existing quotations: ${existingNumbers.size}`);

  let created = 0;
  let skipped = 0;

  for (const q of quotations) {
    if (existingNumbers.has(q.quoteNo)) {
      console.log(`  Skipping ${q.quoteNo} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`Creating ${q.quoteNo} for ${q.client.name}...`);

    const clientRef = await db.collection("clients").add({
      organizationId: orgId,
      name: q.client.name,
      email: null,
      phone: null,
      company: q.client.company ?? null,
      address: q.client.address ?? null,
      city: q.client.city,
      state: q.client.state,
      gstNumber: q.client.gstin ?? null,
      notes: null,
      createdById: null,
      createdAt: new Date().toISOString(),
    });
    console.log(`  Client created: ${clientRef.id} (${q.client.name})`);

    const subtotal = q.items.reduce((sum, i) => sum + i.amount, 0);
    const totalWithShipping = subtotal + (q.shippingCharge ?? 0);
    const tax = calcTax(totalWithShipping, q);

    let taxPercent: number;
    let taxAmount: number;
    if (q.taxType === "inter") {
      taxPercent = q.igstRate ?? 18;
      taxAmount = tax.igst;
    } else {
      taxPercent = (q.cgstRate ?? 9) + (q.sgstRate ?? 9);
      taxAmount = tax.cgst + tax.sgst;
    }

    const finalTotal = q.taxInclusive ? totalWithShipping : totalWithShipping - (q.discountAmount ?? 0) + taxAmount;

    const now = new Date().toISOString();
    const quoteRef = await db.collection("quotations").add({
      organizationId: orgId,
      quotationNumber: q.quoteNo,
      clientId: clientRef.id,
      createdById: null,
      status: "sent",
      validUntil: q.expiryDate ? new Date(q.expiryDate).toISOString() : null,
      notes: q.notes ?? NOTES_TEMPLATE,
      terms: q.terms ?? TERMS_TEMPLATE,
      discountPercent: "0",
      discountAmount: String(q.discountAmount ?? 0),
      taxPercent: String(taxPercent),
      taxAmount: taxAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: finalTotal.toFixed(2),
      createdAt: new Date(q.date).toISOString(),
      updatedAt: now,
    });

    for (const item of q.items) {
      const itemTotal = item.quantity * item.rate;
      await db.collection("quotation_items").add({
        quotationId: quoteRef.id,
        productId: null,
        itemId: null,
        description: item.description,
        hsnCode: item.hsnCode,
        widthFt: null,
        heightFt: null,
        areaSqFt: null,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: String(item.rate),
        totalPrice: String(itemTotal),
        notes: item.notes ?? null,
      });
    }

    if (q.shippingCharge && q.shippingCharge > 0) {
      await db.collection("quotation_addons").add({
        quotationId: quoteRef.id,
        addonId: null,
        description: "Shipping Charge",
        quantity: 1,
        price: String(q.shippingCharge),
        totalPrice: String(q.shippingCharge),
      });
    }

    console.log(`  Quotation created: ${quoteRef.id} (${q.items.length} items, total: ${finalTotal})`);
    created++;
  }

  console.log(`\nImport complete!`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
