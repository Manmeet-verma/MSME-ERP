import { initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;
let firestore: Firestore;
let initError: string | null = null;

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

export function getFirebaseInitError(): string | null {
  return initError;
}

export function initFirebase(): App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  try {
    if (projectId && clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      initError = `Missing Firebase credentials: PROJECT_ID=${!!projectId}, CLIENT_EMAIL=${!!clientEmail}, PRIVATE_KEY=${!!privateKey}`;
      console.warn("[firebase]", initError);
      app = initializeApp({
        projectId: projectId || "msme-erp",
      });
    }

    firestore = getFirestore(app);
    firestore.settings({ ignoreUndefinedProperties: true });

    return app;
  } catch (err: any) {
    initError = `Firebase init failed: ${err?.message ?? err}`;
    console.error("[firebase]", initError);
    throw err;
  }
}

export function getDb(): Firestore {
  if (!firestore) initFirebase();
  return firestore;
}
