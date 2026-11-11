import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = (process.env.INITIAL_ADMIN_EMAIL || "adrielfreitas367@gmail.com").trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!password || password.length < 14) {
  throw new Error("Defina INITIAL_ADMIN_PASSWORD com uma senha forte de pelo menos 14 caracteres.");
}
if (!serviceAccountJson) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON precisa estar configurada só no ambiente local seguro.");
}

const serviceAccount = JSON.parse(serviceAccountJson);
const app = getApps()[0] ?? initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://proterra-sensors-default-rtdb.firebaseio.com/",
});
const auth = getAuth(app);

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (error?.code !== "auth/user-not-found") throw error;
  user = await auth.createUser({ email, password, emailVerified: false });
}

await auth.setCustomUserClaims(user.uid, { operator: true, admin: true });
console.log(`Administrador inicial preparado para ${email} (UID ${user.uid}).`);
console.log("A conta permanece sem confirmação de e-mail até o usuário entrar no site e confirmar a mensagem recebida.");
