import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

let adminApp: App | undefined;

/**
 * Server-side Firestore handle for the import script.
 * Returns null when no service-account key is configured, so the import
 * pipeline can still emit the local dev fixture without Firebase.
 */
export function getAdminDb(): Firestore | null {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) return null;

  if (!adminApp) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));
    adminApp = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore(adminApp);
}
