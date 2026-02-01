const authRepository = require("./auth.repository");
const { verifyPassword } = require("../../auth/password");

async function login({ email, password }) {
  const user = await authRepository.findByEmail(email);
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!ok) {
    const err = new Error("Identifiants invalides");
    err.status = 401;
    throw err;
  }

  return { id: user.id, email: user.email, role: user.role };
}

module.exports = { login };
