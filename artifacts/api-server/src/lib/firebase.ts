import { initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;
let firestore: Firestore;

export function initFirebase(): App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

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
