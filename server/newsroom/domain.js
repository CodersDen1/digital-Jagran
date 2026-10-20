const { categories } = require("./content");
const { randomUUID } = require("node:crypto");
const locales = ["en", "hi"];
const statuses = ["draft", "review", "scheduled", "published", "archived"];
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const plainText = (value) =>
  String(value || "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const slugify = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140)
    .replace(/-$/, "");
const effectiveStatus = (article) =>
  article.status === "scheduled" &&
  Date.parse(article.publishedAt) <= Date.now()
    ? "published"
    : article.status;
const isPublic = (article) =>
  effectiveStatus(article) === "published" &&
  Date.parse(article.publishedAt) <= Date.now();
const hasLocale = (article, locale) =>
  Boolean(
    article.translations?.[locale]?.title &&
      article.translations?.[locale]?.body,
  );

function normalizeLegacy(doc) {
  const a = doc.toObject ? doc.toObject() : doc;
  if (a.translations?.en?.title || a.translations?.hi?.title)
    return {
      ...a,
      id: String(a._id || a.id),
      status: a.status || (a.is_Published ? "published" : "draft"),
    };
  const allowed = a.published_language || "en";
  const translations = {};
  for (const locale of locales) {
    if (
      allowed !== "both" &&
      (locale === "en" ? allowed !== "en" : !["hi", "HN"].includes(allowed))
    )
      continue;
    const suffix = locale === "en" ? "_en" : "";
    translations[locale] = {
      title: plainText(a[`article_header${suffix}`]),
      summary: plainText(a[`summary${suffix}`]),
      body: plainText(a[`body${suffix}`]),
      metaTitle: plainText(a.metaTitle || a[`article_header${suffix}`]),
      description: plainText(a[`metadata${suffix}`] || a.metaDescription),
    };
  }
  const tag = (a.tags_en || a.tags || [])[0]?.toLowerCase();
  return {
    id: String(a._id || a.id),
    slug: a.slug || String(a._id || a.id),
    translations,
    category: categories.find((c) => c.slug === tag)?.slug || "india",
    status: a.is_Published ? "published" : "draft",
    image: a.photos?.[0] || "",
    imageAlt: a.article_header_en || a.article_header || "",
    imageCredit: "",
    author: a.author || "Digital Jagran Desk",
    authorBio: "",
    views: a.views || 0,
    featured: false,
    breaking: false,
    publishedAt: a.publishedAt || a.createdAt,
    updatedAt: a.updatedAt,
    createdAt: a.createdAt,
    legacyLayout: Boolean(
      a.layoutTemplate || Object.keys(a.elementContent || {}).length,
    ),
  };
}

function validateArticle(input, previous = null) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "An article object is required.");
  const text = (value, max) => {
    if (value != null && typeof value !== "string")
      throw new HttpError(400, "Text fields must contain text.");
    if (String(value || "").length > max)
      throw new HttpError(400, `A field exceeds its ${max} character limit.`);
    return String(value || "").trim();
  };
  const translations = {};
  for (const locale of locales) {
    const t = input.translations?.[locale];
    if (t && (t.title || t.body || t.summary))
      translations[locale] = {
        title: text(t.title, 240),
        summary: text(t.summary, 700),
        body: text(t.body, 100000),
        metaTitle: text(t.metaTitle, 240),
        description: text(t.description, 500),
      };
  }
  if (!Object.values(translations).some((t) => t.title))
    throw new HttpError(422, "Add a headline in at least one language.");
  const status = input.status || "draft";
  if (!statuses.includes(status))
    throw new HttpError(422, "Choose a valid publishing status.");
  if (!categories.some((c) => c.slug === input.category))
    throw new HttpError(422, "Choose a valid section.");
  if (
    ["published", "scheduled", "review"].includes(status) &&
    Object.values(translations).some((t) => !t.title || !t.body || !t.summary)
  )
    throw new HttpError(
      422,
      "Every included language needs a headline, summary and body before review or publication.",
    );
  const image = text(input.image, 2000);
  if (image) {
    let url;
    try {
      url = new URL(image);
    } catch {
      throw new HttpError(422, "Enter an absolute image URL.");
    }
    if (!["https:", "http:"].includes(url.protocol))
      throw new HttpError(422, "Images must use HTTP or HTTPS URLs.");
  }
  const imageAlt = text(input.imageAlt, 500);
  if (image && !imageAlt)
    throw new HttpError(
      422,
      "Describe the image for readers using assistive technology.",
    );
  const author = text(input.author, 120);
  if (["published", "scheduled"].includes(status) && !author)
    throw new HttpError(422, "A published story needs an author.");
  let publishedAt =
    input.publishedAt || previous?.publishedAt || new Date().toISOString();
  if (!Number.isFinite(Date.parse(publishedAt)))
    throw new HttpError(422, "Enter a valid publication date.");
  if (status === "scheduled" && Date.parse(publishedAt) <= Date.now())
    throw new HttpError(422, "Scheduled publication must be in the future.");
  if (status === "published" && Date.parse(publishedAt) > Date.now())
    throw new HttpError(422, "Use Scheduled for a future publication date.");
  const slug = slugify(
    input.slug || translations.en?.title || translations.hi?.title,
  );
  if (!slug)
    throw new HttpError(
      422,
      "The story URL needs at least one letter or number.",
    );
  if (previous && slug !== previous.slug)
    throw new HttpError(
      422,
      "Existing story URLs stay stable. Create a new story to use a different URL.",
    );
  if (
    input.sources != null &&
    (!Array.isArray(input.sources) || input.sources.length > 30)
  )
    throw new HttpError(422, "Provide up to 30 source references.");
  const sources = (input.sources || []).map((source) => {
    if (!source || typeof source !== "object")
      throw new HttpError(422, "Provide named source references.");
    const label = text(source.label, 200);
    const url = text(source.url, 2000);
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new HttpError(422, "Each source needs an absolute reference URL.");
    }
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      throw new HttpError(
        422,
        "Source references must use public HTTP(S) URLs without credentials.",
      );
    if (!label)
      throw new HttpError(422, "Give every source a descriptive name.");
    return { label, url };
  });
  return {
    id: previous?.id || randomUUID(),
    slug,
    translations,
    category: input.category,
    status,
    image,
    imageAlt,
    imageCredit: text(input.imageCredit, 300),
    author,
    authorBio: text(input.authorBio, 1000),
    featured: Boolean(input.featured),
    breaking: Boolean(input.breaking),
    sources,
    correction: text(input.correction, 2000),
    ...(previous?.provenance
      ? { provenance: structuredClone(previous.provenance) }
      : {}),
    views: previous?.views || 0,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date(
      Math.max(Date.now(), Date.parse(previous?.updatedAt) + 1 || 0),
    ).toISOString(),
    publishedAt: new Date(publishedAt).toISOString(),
  };
}

function publicArticle(a, locale) {
  const t = a.translations[locale];
  return {
    id: a.id,
    slug: a.slug,
    category: a.category,
    ...t,
    locale,
    image: a.image,
    imageAlt: a.imageAlt,
    imageCredit: a.imageCredit,
    author: a.author,
    authorBio: a.authorBio,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    featured: a.featured,
    breaking: a.breaking,
    views: a.views,
    readingMinutes: Math.max(
      1,
      Math.ceil(t.body.split(/\s+/).length / (locale === "hi" ? 160 : 220)),
    ),
    availableLocales: locales.filter((l) => hasLocale(a, l)),
    sources: a.sources || [],
    correction: a.correction || "",
  };
}
module.exports = {
  HttpError,
  locales,
  statuses,
  slugify,
  effectiveStatus,
  isPublic,
  hasLocale,
  normalizeLegacy,
  validateArticle,
  publicArticle,
};
