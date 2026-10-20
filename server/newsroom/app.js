const express = require("express");
const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const { categories } = require("./content");
const {
  HttpError,
  locales,
  effectiveStatus,
  isPublic,
  hasLocale,
  validateArticle,
  publicArticle,
} = require("./domain");
const { createAuth } = require("./auth");
const { automationAuth, automationArticle } = require("./automation");
const { observability } = require("./runtime");
const { digest, options } = require("./store");
const { validateMedia } = require("./automation-media");
const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

function pageMeta(data, origin) {
  const { locale, article } = data;
  const title = article
    ? `${article.metaTitle || article.title} | Digital Jagran`
    : data.category
      ? `${categories.find((c) => c.slug === data.category)?.[locale]} | Digital Jagran`
      : locale === "hi"
        ? "डिजिटल जागरण | खबरें, संदर्भ और नज़रिए"
        : "Digital Jagran | News, context & perspectives";
  const description =
    article?.description ||
    article?.summary ||
    (locale === "hi"
      ? "भारत और दुनिया की खबरें। राजनीति, कारोबार, तकनीक, खेल और संस्कृति की स्पष्ट कवरेज।"
      : "Perspectives on India and the world. Read news, context and explainers across politics, business, technology, sport and culture.");
  const canonical = origin + (data.canonicalPath || data.path.split("?")[0]);
  const alternates = (
    ["search", "saved", "notfound"].includes(data.kind)
      ? []
      : article
        ? article.availableLocales
        : locales
  )
    .map(
      (l) =>
        `<link data-news-head rel="alternate" hreflang="${l}" href="${escape(origin + (article ? `/${l}/article/${article.slug}` : (data.canonicalPath || data.path.split("?")[0]).replace(/^\/(en|hi)/, `/${l}`)))}">`,
    )
    .join("");
  const schema = article
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: article.title,
        description,
        image: article.image ? [article.image] : [],
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        inLanguage: locale,
        mainEntityOfPage: canonical,
        isAccessibleForFree: true,
        author: { "@type": "Person", name: article.author },
        citation: (article.sources || []).map((s) => s.url),
        publisher: {
          "@type": "NewsMediaOrganization",
          name: "Digital Jagran",
          url: origin,
          publishingPrinciples: `${origin}/${locale}/editorial`,
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        url: canonical,
        inLanguage: locale,
      };
  return `<title data-news-head>${escape(title)}</title><meta data-news-head name="description" content="${escape(description)}"><meta data-news-head name="robots" content="${["notfound", "search", "saved"].includes(data.kind) ? "noindex,follow" : "index,follow,max-image-preview:large"}"><link data-news-head rel="canonical" href="${escape(canonical)}">${alternates}<meta data-news-head property="og:type" content="${article ? "article" : "website"}"><meta data-news-head property="og:title" content="${escape(title)}"><meta data-news-head property="og:description" content="${escape(description)}"><meta data-news-head property="og:url" content="${escape(canonical)}"><meta data-news-head property="og:site_name" content="Digital Jagran"><meta data-news-head property="og:locale" content="${locale === "hi" ? "hi_IN" : "en_IN"}"><meta data-news-head name="twitter:card" content="${article?.image ? "summary_large_image" : "summary"}">${article?.image ? `<meta data-news-head property="og:image" content="${escape(article.image)}"><meta data-news-head property="og:image:alt" content="${escape(article.imageAlt)}"><meta data-news-head name="twitter:image" content="${escape(article.image)}">` : ""}<script data-news-head type="application/ld+json">${json(schema)}</script>`;
}

function createApp({
  store,
  adminEmail,
  adminPassword,
  production = false,
  origin = "http://localhost:5001",
  allowedOrigins = [],
  automationToken,
  trustProxy = false,
  logger,
}) {
  if (automationToken && automationToken === adminPassword)
    throw new Error(
      "AUTOMATION_INGEST_TOKEN must be different from ADMIN_PASSWORD.",
    );
  const app = express();
  app.disable("x-powered-by");
  observability(app, store, { trustProxy, logger });
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "SAMEORIGIN",
    });
    if (/^\/api\/(admin|auth)/.test(req.path))
      res.set("Cache-Control", "no-store");
    const requestOrigin = req.get("origin");
    if (requestOrigin && ![origin, ...allowedOrigins].includes(requestOrigin))
      return next(new HttpError(403, "This origin is not allowed."));
    if (requestOrigin)
      res.set({
        "Access-Control-Allow-Origin": requestOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Expose-Headers":
          "X-Request-Id, Retry-After, Idempotency-Replayed",
        Vary: "Origin",
      });
    if (req.method === "OPTIONS")
      return res
        .set({
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Idempotency-Key, X-Request-Id, traceparent",
        })
        .sendStatus(204);
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      !req.is("application/json")
    )
      return next(new HttpError(415, "Send application/json."));
    next();
  });
  app.use(
    "/api/automation/media",
    automationAuth(automationToken),
    express.json({ limit: "8mb" }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return next(new HttpError(400, "Send a JSON object."));
    next();
  });
  const auth = createAuth({
    email: adminEmail,
    password: adminPassword,
    production,
    store,
  });
  app.post("/api/auth/login", auth.login);
  app.post("/api/auth/logout", auth.logout);
  app.get("/api/auth/me", auth.requireUser, (req, res) =>
    res.json({ user: req.user }),
  );
  app.get("/api/sections", (req, res) => res.json({ sections: categories }));
  async function pageData(requestedPath) {
    const url = new URL(requestedPath, origin);
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map((x) => decodeURIComponent(x));
    const locale = locales.includes(parts[0]) ? parts[0] : "en";
    const card = (a) => {
      const { body, ...rest } = publicArticle(a, locale);
      return rest;
    };
    const latest = await store.query({ public: true, locale, pageSize: 5 });
    const breaking = await store.query({
      public: true,
      locale,
      breaking: true,
      pageSize: 3,
    });
    const data = {
      locale,
      path: url.pathname + url.search,
      kind: "home",
      sections: categories,
      demo: store.demo,
      origin,
      articles: [],
      latest: latest.articles.map(card),
      breaking: breaking.articles.map(card),
      total: latest.pagination.total,
    };
    if (!locales.includes(parts[0])) return { ...data, kind: "notfound" };
    if (parts.length === 1) {
      const result = await store.query({ public: true, locale, pageSize: 30 });
      data.articles = result.articles.map(card);
    } else if (parts.length === 3 && parts[1] === "article") {
      const raw = await store.get(parts[2], true);
      if (!raw || !hasLocale(raw, locale)) return { ...data, kind: "notfound" };
      const article = publicArticle(raw, locale);
      const related = await store.query({
        public: true,
        locale,
        section: article.category,
        pageSize: 4,
      });
      Object.assign(data, {
        kind: "article",
        article,
        canonicalPath: `/${locale}/article/${article.slug}`,
        articles: related.articles
          .filter((a) => a.id !== article.id)
          .slice(0, 3)
          .map(card),
      });
    } else if (
      parts.length === 3 &&
      parts[1] === "section" &&
      categories.some((c) => c.slug === parts[2])
    ) {
      const result = await store.query({
        public: true,
        locale,
        section: parts[2],
        page: url.searchParams.get("page"),
        pageSize: 12,
      });
      Object.assign(data, {
        kind: "section",
        category: parts[2],
        articles: result.articles.map(card),
        pagination: result.pagination,
        canonicalPath: `/${locale}/section/${parts[2]}${result.pagination.page > 1 ? "?page=" + result.pagination.page : ""}`,
      });
    } else if (parts.length === 2 && parts[1] === "search") {
      data.kind = "search";
      data.query = (url.searchParams.get("q") || "").slice(0, 150);
      const result = await store.query({
        public: true,
        locale,
        q: data.query,
        page: url.searchParams.get("page"),
        pageSize: 12,
      });
      data.articles = data.query.trim() ? result.articles.map(card) : [];
      data.pagination = data.query.trim()
        ? result.pagination
        : { page: 1, pageSize: 12, total: 0, hasMore: false };
    } else if (parts.length === 2 && parts[1] === "saved") data.kind = "saved";
    else if (
      parts.length === 2 &&
      ["about", "editorial", "privacy"].includes(parts[1])
    )
      Object.assign(data, { kind: "information", information: parts[1] });
    else return { ...data, kind: "notfound" };
    return data;
  }
  app.get("/api/page", async (req, res) => {
    const data = await pageData(
      typeof req.query.path === "string" ? req.query.path : "/en",
    );
    if (["search", "saved", "notfound"].includes(data.kind))
      res.set("Cache-Control", "no-store");
    res.status(data.kind === "notfound" ? 404 : 200).json(data);
  });
  const canonical = (value) =>
    JSON.stringify(value, (_, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, v[k]]),
          )
        : v,
    );
  const mutation = (status, fn) => async (req, res) => {
    const raw = req.get("Idempotency-Key");
    if ((req.versioned || raw) && !/^[\x20-\x7e]{8,128}$/.test(raw || ""))
      throw new HttpError(
        422,
        "Supply an Idempotency-Key of 8–128 printable ASCII characters.",
      );
    const run = async () => {
      const body = await fn(req, res);
      return {
        status: typeof status === "function" ? status(body) : status,
        body,
      };
    };
    const result = raw
      ? await store.idempotent(
          digest(
            `${req.automation ? "automation:ingest" : req.user?.email || "newsletter"}:${req.method}:${req.path}:${raw}`,
          ),
          digest(canonical(req.body)),
          run,
        )
      : await run();
    if (result.replayed) res.set("Idempotency-Replayed", "true");
    res.status(result.status).json(result.body);
  };
  app.post(
    "/api/newsletter",
    async (req, res, next) => {
      const rate = await store.rateLimit("newsletter:" + req.ip, 20, 3600000);
      if (!rate.allowed) {
        res.set("Retry-After", String(rate.retryAfter));
        throw new HttpError(429, "Too many signups. Try again later.");
      }
      next();
    },
    mutation(201, async (req) => {
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
        throw new HttpError(422, "Enter a valid email address.");
      if (req.body.consent !== true)
        throw new HttpError(422, "Confirm newsletter consent.");
      await store.subscribe(email);
      return { ok: true };
    }),
  );
  app.use("/api/automation", automationAuth(automationToken));
  app.post(
    "/api/automation/media",
    mutation(201, async (req) => {
      const media = await store.putMedia(await validateMedia(req.body));
      return { media: { ...media, url: `${origin}/media/${media.hash}.webp` } };
    }),
  );
  app.post(
    "/api/automation/articles",
    mutation(
      (body) => (body.duplicate ? 200 : 201),
      async (req) => store.ingestAutomation(automationArticle(req.body)),
    ),
  );
  app.post(
    "/api/automation/jobs",
    mutation(
      (body) => (body.duplicate ? 200 : 201),
      (req) => store.automation.enqueue(req.body),
    ),
  );
  app.post(
    "/api/automation/jobs/claim",
    mutation(
      (body) => (body ? 200 : 204),
      (req) => store.automation.claim(req.body),
    ),
  );
  app.get("/api/automation/jobs/:id", async (req, res) =>
    res.json(await store.automation.get(req.params.id)),
  );
  app.patch(
    "/api/automation/jobs/:id",
    mutation(200, (req) => store.automation.patch(req.params.id, req.body)),
  );
  app.post(
    "/api/automation/jobs/:id/reservations",
    mutation(201, (req) => store.automation.reserve(req.params.id, req.body)),
  );
  app.patch(
    "/api/automation/jobs/:id/reservations/:key",
    mutation(200, (req) =>
      store.automation.reconcile(req.params.id, req.params.key, req.body),
    ),
  );
  app.get("/api/automation/days/current", async (req, res) =>
    res.json(await store.automation.day()),
  );
  app.get("/api/automation/days/:day", async (req, res) =>
    res.json(await store.automation.day(req.params.day)),
  );
  app.use("/api/admin", auth.requireUser);
  app.get("/api/admin/articles", async (req, res) => {
    const result = await store.query({
      ...req.query,
      sort: "updatedAt",
      pageSize: options({ pageSize: req.query.pageSize }).pageSize,
    });
    res.json({
      ...result,
      articles: result.articles.map((a) => ({
        ...a,
        ...(a.provenance
          ? {
              provenance: {
                origin: a.provenance.origin,
                imageGenerated: false,
              },
            }
          : {}),
        status: effectiveStatus(a),
      })),
      sections: categories,
      demo: store.demo,
      counts: await store.counts(),
    });
  });
  app.get("/api/admin/stats", async (req, res) => {
    const counts = await store.counts();
    const sectionCounts = await store.sectionCounts();
    const recent = await store.query({ sort: "updatedAt", pageSize: 5 });
    res.json({
      counts,
      total: counts.all,
      subscribers: (await store.subscriberQuery({ pageSize: 1 })).pagination
        .total,
      sections: categories.map((c) => ({
        ...c,
        count: sectionCounts[c.slug] || 0,
      })),
      recent: recent.articles.map((a) => ({
        ...a,
        ...(a.provenance
          ? {
              provenance: {
                origin: a.provenance.origin,
                imageGenerated: false,
              },
            }
          : {}),
        status: effectiveStatus(a),
      })),
      demo: store.demo,
    });
  });
  app.get("/api/admin/articles/:id", async (req, res) => {
    const article = await store.get(req.params.id);
    if (!article) throw new HttpError(404, "Story not found.");
    res.json({ article: { ...article, status: effectiveStatus(article) } });
  });
  app.post(
    "/api/admin/articles",
    mutation(201, async (req) => ({
      article: await store.save(validateArticle(req.body)),
    })),
  );
  app.put(
    "/api/admin/articles/:id",
    mutation(200, async (req) => {
      const previous = await store.get(req.params.id);
      if (!previous) throw new HttpError(404, "Story not found.");
      if (Date.parse(req.body.updatedAt) !== Date.parse(previous.updatedAt))
        throw new HttpError(
          409,
          "This story changed in another session. Reload before saving.",
        );
      return {
        article: await store.save(
          validateArticle(req.body, previous),
          previous.updatedAt,
        ),
      };
    }),
  );
  app.delete(
    "/api/admin/articles/:id",
    mutation(200, async (req) => {
      if (req.versioned && !req.body.updatedAt)
        throw new HttpError(
          422,
          "Supply the story updatedAt revision before archiving.",
        );
      await store.archive(req.params.id, req.body.updatedAt);
      return { ok: true };
    }),
  );
  app.get("/api/admin/subscribers", async (req, res) =>
    res.json(
      await store.subscriberQuery({
        ...req.query,
        pageSize: req.query.pageSize || 50,
      }),
    ),
  );
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.get("/media/:filename", async (req, res, next) => {
    const match = /^([a-f0-9]{64})\.webp$/.exec(req.params.filename);
    if (!match) throw new HttpError(404, "Media not found.");
    const media = await store.getMedia(match[1]);
    if (!media) throw new HttpError(404, "Media not found.");
    res.type(media.contentType).set({
      ETag: `"${media.hash}"`,
      "Cache-Control":
        req.get("cookie") || req.get("authorization")
          ? "no-store"
          : "public, max-age=31536000, immutable",
      "Content-Length": String(media.bytes),
    });
    if (req.fresh) return res.status(304).end();
    const stream = media.open();
    stream.on("error", next);
    stream.pipe(res);
  });
  app.get("/robots.txt", (req, res) =>
    res
      .type("text")
      .send(
        `User-agent: *\nAllow: /\nDisallow: /newsroom/\nDisallow: /api/\n\n# Search discovery is separate from model training.\nUser-agent: OAI-SearchBot\nAllow: /\nDisallow: /newsroom/\nDisallow: /api/\n\n# Preserve the publication's existing training-crawler preferences.\n${["GPTBot", "Google-Extended", "CCBot", "FacebookBot", "anthropic-ai", "Claude-Web", "Applebot-Extended"].map((bot) => `User-agent: ${bot}\nDisallow: /\n`).join("\n")}\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/news-sitemap.xml\n`,
      ),
  );
  app.get(
    [
      "/sitemap.xml",
      "/news-sitemap.xml",
      /^\/sitemaps\/(general|news)-(\d+)\.xml$/,
    ],
    async (req, res) => {
      const chunk = req.path.match(/^\/sitemaps\/(general|news)-(\d+)\.xml$/);
      const news = req.path === "/news-sitemap.xml" || chunk?.[1] === "news";
      const limit = news ? 500 : 24990;
      const page = chunk ? Number(chunk[2]) : 1;
      if (page < 1)
        return res.status(404).type("text").send("Sitemap not found.");
      const result = await store.query({
        public: true,
        internal: true,
        page,
        pageSize: limit,
        sitemap: true,
        ...(news ? { since: Date.now() - 2 * 86400000 } : {}),
      });
      if (page > 1 && result.articles.length === 0)
        return res.status(404).type("text").send("Sitemap not found.");
      if (!chunk && result.pagination.hasMore)
        return res
          .type("application/xml")
          .send(
            `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: Math.ceil(result.pagination.total / limit) }, (_, i) => `<sitemap><loc>${escape(origin)}/sitemaps/${news ? "news" : "general"}-${i + 1}.xml</loc></sitemap>`).join("")}</sitemapindex>`,
          );
      const articles = result.articles;
      const items = [];
      if (!news && page === 1)
        for (const l of locales) {
          items.push(`<url><loc>${escape(origin)}/${l}</loc></url>`);
          for (const c of categories)
            items.push(
              `<url><loc>${escape(origin)}/${l}/section/${c.slug}</loc></url>`,
            );
        }
      for (const a of articles)
        for (const l of locales)
          if (hasLocale(a, l))
            items.push(
              `<url><loc>${escape(`${origin}/${l}/article/${a.slug}`)}</loc><lastmod>${new Date(a.updatedAt).toISOString()}</lastmod>${news ? `<news:news><news:publication><news:name>Digital Jagran</news:name><news:language>${l}</news:language></news:publication><news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date><news:title>${escape(a.translations[l].title)}</news:title></news:news>` : ""}</url>`,
            );
      res
        .type("application/xml")
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${news ? ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"' : ""}>${items.join("")}</urlset>`,
        );
    },
  );
  app.get(/^\/(en|hi)\/feed\.xml$/, async (req, res) => {
    const locale = req.path.split("/")[1];
    const stories = (await store.query({ public: true, locale, pageSize: 30 }))
      .articles;
    const items = stories
      .map(
        (a) =>
          `<item><title>${escape(a.translations[locale].title)}</title><link>${escape(encodeURI(`${origin}/${locale}/article/${a.slug}`))}</link><guid isPermaLink="true">${escape(encodeURI(`${origin}/${locale}/article/${a.slug}`))}</guid><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate><description>${escape(a.translations[locale].summary)}</description></item>`,
      )
      .join("");
    res
      .type("application/rss+xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Digital Jagran</title><link>${escape(origin)}/${locale}</link><description>News, context and perspectives.</description><language>${locale}</language>${items}</channel></rss>`,
      );
  });
  const clientDist = path.resolve(__dirname, "../../client/dist");
  const cmsDist = path.resolve(__dirname, "../../cms/dist");
  app.get("/", (req, res) => res.redirect(302, "/hi"));
  app.get("/article/:slug", async (req, res) => {
    const a = await store.get(req.params.slug, true);
    if (!a) return res.status(404).send("Story not found.");
    res.redirect(301, `/${hasLocale(a, "hi") ? "hi" : "en"}/article/${a.slug}`);
  });
  app.use(
    "/newsroom",
    (req, res, next) => {
      res.set({
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      });
      next();
    },
    express.static(cmsDist, { index: false }),
  );
  app.get(/^\/newsroom(?:\/.*)?$/, async (req, res) => {
    try {
      res.send(await fs.readFile(path.join(cmsDist, "index.html"), "utf8"));
    } catch {
      res
        .status(503)
        .send("Build the newsroom with npm run build --prefix cms.");
    }
  });
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders(res, file) {
        if (
          res.getHeader("Cache-Control") !== "no-store" &&
          /[\\/]assets[\\/]/.test(file)
        )
          res.set("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  let renderer;
  app.get(/.*/, async (req, res) => {
    const data = await pageData(req.originalUrl);
    if (["search", "saved", "notfound"].includes(data.kind))
      res.set("Cache-Control", "no-store");
    if (data.article && decodeURIComponent(req.path) !== data.canonicalPath)
      return res.redirect(301, data.canonicalPath);
    try {
      const template = await fs.readFile(
        path.join(clientDist, "index.html"),
        "utf8",
      );
      renderer ||= import(
        pathToFileURL(
          path.resolve(__dirname, "../../client/dist-server/entry-server.js"),
        ).href
      );
      const { render } = await renderer;
      res
        .status(data.kind === "notfound" ? 404 : 200)
        .type("html")
        .send(
          template
            .replace('<html lang="en">', `<html lang="${data.locale}">`)
            .replace("<!--news-head-->", pageMeta(data, origin))
            .replace(
              '<div id="root"></div>',
              `<div id="root" data-ssr="true">${render(req.originalUrl, data)}</div><script id="news-data" type="application/json">${json(data)}</script>`,
            ),
        );
    } catch (error) {
      console.error(
        JSON.stringify({ event: "render_failed", requestId: req.requestId }),
      );
      res
        .status(503)
        .type("text")
        .send(
          "Run npm run build from the repository root to prepare the news site.",
        );
    }
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: "request_failed",
          requestId: req.requestId,
          name: error.name,
        }),
      );
    res.set("Cache-Control", "no-store");
    res.status(status).json({
      requestId: req.requestId,
      code:
        status === 409
          ? "CONFLICT"
          : status === 422
            ? "VALIDATION"
            : status >= 500
              ? "UNAVAILABLE"
              : "REQUEST_ERROR",
      error:
        status >= 500
          ? "The server could not complete the request."
          : error.message,
    });
  });
  return app;
}
module.exports = { createApp, pageMeta };
