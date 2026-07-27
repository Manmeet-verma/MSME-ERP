import { initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;
let firestore: Firestore;

function cleanPrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw;
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "");
  if (!key.includes("BEGIN")) {
    return undefined;
  }
  return key;
}

export function initFirebase(): App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    app = initializeApp({
      projectId: projectId || "msme-erp",
    });
  }

  firestore = getFirestore(app);
  firestore.settings({ ignoreUndefinedProperties: true });

  return app;
}

export function getDb(): Firestore {
  if (!firestore) initFirebase();
  return firestore;
}

export function getFirebaseStatus(): { configured: boolean; projectId?: string; error?: string } {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (projectId && clientEmail && privateKey) {
    return { configured: true, projectId };
  }
  return {
    configured: false,
    projectId: projectId || undefined,
    error: `Missing: ${!projectId ? "FIREBASE_PROJECT_ID " : ""}${!clientEmail ? "FIREBASE_CLIENT_EMAIL " : ""}${!privateKey ? "FIREBASE_PRIVATE_KEY" : ""}`,
  };
}
