const authRepository = require("./auth.repository");

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error("Email et mot de passe requis");
    err.status = 400;
    throw err;
  }

  const user = authRepository.findByEmail(email);
  const ok = await authRepository.verifyPassword(user, password);

  if (!ok) {
    const err = new Error("Identifiants invalides");
    err.status = 401;
    throw err;
  }

  // Never expose password
  return { id: user.id, email: user.email, role: user.role };
}

module.exports = { login };
