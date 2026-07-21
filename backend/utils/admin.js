const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "websinaro@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(user) {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

module.exports = { isAdmin, ADMIN_EMAILS };
