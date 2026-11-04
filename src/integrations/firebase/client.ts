import { getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const databaseURL =
  import.meta.env["VITE_FIREBASE_DATABASE_URL"] ??
  "https://proterra-sensors-default-rtdb.firebaseio.com/";

const app =
  getApps().find((candidate) => candidate.name === "geoalerta-client") ??
  initializeApp({ databaseURL }, "geoalerta-client");

export const realtimeDatabase = getDatabase(app);
