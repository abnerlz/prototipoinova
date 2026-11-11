import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const apiKey = import.meta.env["VITE_FIREBASE_API_KEY"];
const configuredDatabaseURL = import.meta.env["VITE_FIREBASE_DATABASE_URL"];
const databaseURL =
  configuredDatabaseURL ??
  "https://proterra-sensors-default-rtdb.firebaseio.com/";

const app =
  getApps().find((candidate) => candidate.name === "geoalerta-client") ??
  initializeApp(
    {
      apiKey,
      authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "proterra-sensors.firebaseapp.com",
      projectId: "proterra-sensors",
      databaseURL,
    },
    "geoalerta-client",
  );

export const realtimeDatabase = getDatabase(app);
export const firebaseAuthConfigured = Boolean(apiKey);
// Vercel must build with the web API key for authentication. Keep public pages
// renderable when it is missing instead of throwing auth/invalid-api-key in SSR.
export const firebaseAuth = apiKey ? getAuth(app) : null;
