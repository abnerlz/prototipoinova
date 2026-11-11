import type { App } from "firebase-admin/app";
import type { Database, Reference } from "firebase-admin/database";

export async function getFirebaseAdminApp(): Promise<App> {
  const { applicationDefault, cert, getApps, initializeApp } = await import("firebase-admin/app");
  const existing = getApps().find((candidate) => candidate.name === "geoalerta-server");
  if (existing) return existing;

  const databaseURL = process.env["FIREBASE_DATABASE_URL"] ?? process.env["VITE_FIREBASE_DATABASE_URL"];
  if (!databaseURL) throw new Error("FIREBASE_DATABASE_URL não está configurada.");

  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson) as Parameters<typeof cert>[0])
    : applicationDefault();

  return initializeApp({ credential, databaseURL }, "geoalerta-server");
}

export async function getFirebaseAdminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(await getFirebaseAdminApp());
}

export async function getSensorReadingsReference(): Promise<Reference> {
  const { getDatabase } = await import("firebase-admin/database");
  const database: Database = getDatabase(await getFirebaseAdminApp());
  return database.ref("sensor_readings");
}
