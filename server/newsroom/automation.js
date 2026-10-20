const { createHash, timingSafeEqual } = require("node:crypto");
const { HttpError, validateArticle } = require("./domain");
function automationAuth(token) {
  if (
    token &&
    (typeof token !== "string" ||
      token.length < 32 ||
      token.length > 512 ||
      /\s/.test(token))
  )
    throw new Error(
      "AUTOMATION_INGEST_TOKEN must contain 32–512 non-whitespace characters.",
    );
  const hash = (value) => createHash("sha256").update(value).digest();
  const expected = hash(token || "disabled");
  return (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const match = /^Bearer ([^\s]{1,512})$/.exec(
      req.get("Authorization") || "",
    );
    const valid = timingSafeEqual(hash(match?.[1] || ""), expected);
    if (!token || !match || !valid)
      return next(
        new HttpError(401, "Valid automation Bearer credentials are required."),
      );
    if (!req.versioned)
      return next(new HttpError(404, "Automation requires /api/v1 routes."));
    req.automation = true;
    next();
  };
}
function automationArticle(input) {
  if (input.status != null && input.status !== "review")
    throw new HttpError(422, "Automation may submit review drafts only.");
  if (input.publishedAt != null || input.id != null || input.updatedAt != null)
    throw new HttpError(
      422,
      "Automation cannot assign publication dates or edit existing articles.",
    );
  const article = validateArticle({
    ...input,
    status: "review",
    featured: false,
    breaking: false,
  });
  if (!article.translations.en || !article.translations.hi)
    throw new HttpError(
      422,
      "Automation drafts require complete English and Hindi translations.",
    );
  const p = input.provenance;
  if (!p || typeof p !== "object" || Array.isArray(p))
    throw new HttpError(422, "Automation source provenance is required.");
  const text = (value, name, max = 200, required = false) => {
    if (value == null && !required) return undefined;
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > max ||
      /[\u0000-\u001f\u007f]/.test(value)
    )
      throw new HttpError(422, `Provide valid ${name} provenance.`);
    return value.trim();
  };
  const date = (value, name) => {
    if (value == null) return undefined;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
      throw new HttpError(422, `Provide a valid ${name} timestamp.`);
    return new Date(value).toISOString();
  };
  const url = (value) => {
    const v = text(value, "source URL", 2000, true);
    let parsed;
    try {
      parsed = new URL(v);
    } catch {}
    if (
      !parsed ||
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      throw new HttpError(
        422,
        "Provenance source URLs must be HTTP(S) without credentials.",
      );
    return parsed.href;
  };
  const fingerprint = text(
    p.contentFingerprint,
    "content fingerprint",
    64,
    true,
  );
  if (!/^[a-fA-F0-9]{64}$/.test(fingerprint))
    throw new HttpError(
      422,
      "contentFingerprint must be a SHA-256 hex digest.",
    );
  if (!Array.isArray(p.sources) || !p.sources.length || p.sources.length > 30)
    throw new HttpError(422, "Provide 1–30 provenance sources.");
  const sources = p.sources.map((s) => {
    if (!s || typeof s !== "object")
      throw new HttpError(422, "Provide valid source provenance.");
    return {
      url: url(s.url),
      title: text(s.title, "source title", 300),
      publishedAt: date(s.publishedAt, "source publication"),
      retrievedAt: date(s.retrievedAt, "source retrieval"),
    };
  });
  if (!article.sources.length)
    throw new HttpError(
      422,
      "Automation drafts require visible source citations.",
    );
  if (
    p.warnings != null &&
    (!Array.isArray(p.warnings) || p.warnings.length > 20)
  )
    throw new HttpError(422, "Provide at most 20 automation warnings.");
  if (p.imageGenerated != null && typeof p.imageGenerated !== "boolean")
    throw new HttpError(422, "imageGenerated must be boolean.");
  const provenance = {
    origin: "n8n",
    sourceId: text(p.sourceId, "source ID", 200, true),
    eventId: text(p.eventId, "event ID", 1000, true),
    contentFingerprint: fingerprint.toLowerCase(),
    receivedAt: new Date().toISOString(),
    generatedAt: date(p.generatedAt, "generation"),
    sources,
    warnings: (p.warnings || []).map((w) => text(w, "warning", 500, true)),
    imageGenerated: false,
  };
  for (const name of [
    "workflowId",
    "runId",
    "textModel",
    "imageModel",
    "textTaskId",
    "imageTaskId",
    "imageDisclosure",
  ]) {
    const v = text(p[name], name, name === "imageDisclosure" ? 1000 : 200);
    if (v !== undefined) provenance[name] = v;
  }
  if (p.imageGenerated === true || p.imageTaskId || p.imageModel)
    throw new HttpError(
      422,
      "AI image generation is disabled; use licensed web reference images.",
    );
  const { imageRights } = require("./automation-media");
  if (p.imageRights) provenance.imageRights = imageRights(p.imageRights);
  if (p.referenceImages != null) {
    if (!Array.isArray(p.referenceImages) || p.referenceImages.length > 5)
      throw new HttpError(422, "Provide at most five reference images.");
    provenance.referenceImages = p.referenceImages.map((image) => {
      if (!image || typeof image !== "object")
        throw new HttpError(422, "Provide valid reference image metadata.");
      const result = { url: url(image.url), sourceUrl: url(image.sourceUrl) };
      for (const field of ["title", "credit", "license", "licenseUrl"])
        if (image[field] != null)
          result[field] =
            field === "licenseUrl"
              ? url(image[field])
              : text(image[field], field, 1000);
      return result;
    });
  }
  if (article.image && !provenance.imageRights)
    throw new HttpError(
      422,
      "Reference images require imageRights with license and credit.",
    );
  if (article.image && !article.imageCredit)
    throw new HttpError(422, "Reference images require visible imageCredit.");
  return { ...article, provenance };
}
function sourceKeys(p) {
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  if (p.sources != null && (!Array.isArray(p.sources) || p.sources.length > 30))
    throw new HttpError(422, "Provide at most thirty source URL aliases.");
  const urls = (p.sources || []).map((source) => {
    let parsed;
    try {
      parsed = new URL(source?.url);
    } catch {}
    if (
      !parsed ||
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.href.length > 2000
    )
      throw new HttpError(
        422,
        "Source aliases require valid HTTP(S) URLs without credentials.",
      );
    parsed.hash = "";
    return "url:" + hash(parsed.href);
  });
  return [
    ...new Set([
      "fingerprint:" + p.contentFingerprint,
      "event:" + hash(JSON.stringify([p.sourceId, p.eventId])),
      ...urls,
    ]),
  ].sort();
}
module.exports = { automationAuth, automationArticle, sourceKeys };
