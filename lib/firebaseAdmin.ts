import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

let adminApp: App | undefined;

/** True on Firebase App Hosting / Cloud Run, where the runtime injects these. */
const onGoogleCloud = () => Boolean(process.env.FIREBASE_CONFIG || process.env.K_SERVICE);

/**
 * Server-side Firestore handle (dashboard reads + the import script).
 *  - FIREBASE_SERVICE_ACCOUNT_PATH set → that key file (local dev / import).
 *  - on Firebase App Hosting → Application Default Credentials of the backend's
 *    own service account (no key file is ever uploaded).
 *  - otherwise null, so the app runs on the local dev fixture without Firebase.
 */
export function getAdminDb(): Firestore | null {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath && !onGoogleCloud()) return null;

  if (!adminApp) {
    adminApp = getApps().length
      ? getApps()[0]
      : keyPath
        ? initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf-8"))) })
        : initializeApp(); // ADC
  }
  return getFirestore(adminApp);
}
