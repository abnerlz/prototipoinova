import { getFirebaseAdminAuth } from "@/integrations/firebase/admin.server";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function createOperatorAccount(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return response({ error: "Origem da requisição não permitida." }, 403);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization);
  if (!match) return response({ error: "Autenticação necessária." }, 401);

  let adminAuth: Awaited<ReturnType<typeof getFirebaseAdminAuth>>;
  try {
    adminAuth = await getFirebaseAdminAuth();
    const claims = await adminAuth.verifyIdToken(match[1]!, true);
    if (claims.email_verified !== true || claims.admin !== true) {
      return response({ error: "Somente um administrador com e-mail confirmado pode criar contas." }, 403);
    }
  } catch {
    return response({ error: "Sessão inválida ou expirada." }, 401);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) return response({ error: "Requisição excede o limite permitido." }, 413);

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return response({ error: "Requisição excede o limite permitido." }, 413);
    body = JSON.parse(raw);
  } catch {
    return response({ error: "JSON inválido." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response({ error: "Informe e-mail, senha temporária e perfil." }, 400);
  }

  const input = body as Record<string, unknown>;
  const email = typeof input["email"] === "string" ? input["email"].trim().toLowerCase() : "";
  const password = typeof input["password"] === "string" ? input["password"] : "";
  const role = input["role"];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response({ error: "Informe um e-mail válido." }, 400);
  }
  if (password.length < 14 || password.length > 128) {
    return response({ error: "A senha temporária precisa ter entre 14 e 128 caracteres." }, 400);
  }
  if (role !== "operator" && role !== "admin") {
    return response({ error: "Perfil inválido." }, 400);
  }

  try {
    const user = await adminAuth.createUser({ email, password, emailVerified: false });
    try {
      await adminAuth.setCustomUserClaims(user.uid, { operator: true, admin: role === "admin" });
    } catch (error) {
      await adminAuth.deleteUser(user.uid);
      throw error;
    }
    return response({
      uid: user.uid,
      email: user.email,
      role,
      emailVerified: false,
      message: "Conta criada. A pessoa deverá entrar uma vez para receber o link de confirmação por e-mail.",
    }, 201);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      return response({ error: "Já existe uma conta com esse e-mail." }, 409);
    }
    console.error("[admin-users] Falha ao criar conta de operação.");
    return response({ error: "Não foi possível criar a conta." }, 500);
  }
}
