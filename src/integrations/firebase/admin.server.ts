import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, type Database, type Reference } from "firebase-admin/database";

function getFirebaseAdminApp() {
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

export function getSensorReadingsReference(): Reference {
  const database: Database = getDatabase(getFirebaseAdminApp());
  return database.ref("sensor_readings");
}
