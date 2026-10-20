const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { HttpError } = require("./domain");
const derive = promisify(scrypt);
function createAuth({ email, password, production = false, store }) {
  const salt = randomBytes(16);
  const passwordHash = derive(password, salt, 64);
  let active = 0;
  const cookieName = "dj_newsroom";
  const tokenFor = (req) =>
    (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) || "";
  const user = { email, name: "Newsroom editor", role: "editor" };
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/api",
  };
  const requireUser = async (req, res, next) => {
    try {
      if (!(await store.sessionGet(tokenFor(req))))
        throw new HttpError(401, "Sign in to the newsroom.");
      req.user = user;
      next();
    } catch (e) {
      next(e);
    }
  };
  const login = async (req, res) => {
    const rate = await store.rateLimit("login:" + req.ip, 8, 15 * 60000);
    if (!rate.allowed) {
      res.set("Retry-After", String(rate.retryAfter));
      throw new HttpError(429, "Too many attempts. Try again later.");
    }
    if (active >= 4) {
      res.set("Retry-After", "1");
      throw new HttpError(503, "Sign-in is busy. Try again shortly.");
    }
    const candidate =
      typeof req.body.password === "string" && req.body.password.length <= 500
        ? req.body.password
        : "";
    active++;
    let valid;
    try {
      valid = timingSafeEqual(
        await derive(candidate, salt, 64),
        await passwordHash,
      );
    } finally {
      active--;
    }
    if (!valid || req.body.email !== email)
      throw new HttpError(401, "Email or password is incorrect.");
    await store.sessionDelete(tokenFor(req));
    const token = randomBytes(32).toString("hex");
    await store.sessionSet(token, Date.now() + 8 * 3600000);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: 8 * 3600000 });
    res.json({ user });
  };
  const logout = async (req, res) => {
    await store.sessionDelete(tokenFor(req));
    res.clearCookie(cookieName, cookieOptions);
    res.json({ ok: true });
  };
  return { requireUser, login, logout };
}
module.exports = { createAuth };
