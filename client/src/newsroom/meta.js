export function updateMetadata(data) {
  const { article, locale, origin, path } = data;
  document.documentElement.lang = locale;
  const title = article
    ? `${article.metaTitle || article.title} | Digital Jagran`
    : data.category
      ? `${data.sections.find((c) => c.slug === data.category)?.[locale]} | Digital Jagran`
      : locale === "hi"
        ? "डिजिटल जागरण | खबरें, संदर्भ और नज़रिए"
        : "Digital Jagran | News, context & perspectives";
  const description =
    article?.description ||
    article?.summary ||
    (locale === "hi"
      ? "भारत और दुनिया की खबरें, संदर्भ और नज़रिए।"
      : "News, context and perspectives from India and the world.");
  document
    .querySelectorAll("[data-news-head]")
    .forEach((node) => node.remove());
  const add = (tag, attrs, text) => {
    const node = document.createElement(tag);
    node.setAttribute("data-news-head", "");
    Object.entries(attrs).forEach(([key, value]) =>
      node.setAttribute(key, value),
    );
    if (text) node.textContent = text;
    document.head.append(node);
  };
  add("title", {}, title);
  add("meta", { name: "description", content: description });
  add("meta", {
    name: "robots",
    content: ["notfound", "search", "saved"].includes(data.kind)
      ? "noindex,follow"
      : "index,follow,max-image-preview:large",
  });
  const publicPath = path.split("?")[0];
  const page = Math.max(1, Number(new URLSearchParams(path.split("?")[1]).get("page")) || 1);
  const listingQuery = data.kind === "section" && page > 1 ? `?page=${page}` : "";
  const canonical = origin + (data.canonicalPath || publicPath + listingQuery);
  add("link", { rel: "canonical", href: canonical });
  for (const l of ["search", "saved", "notfound"].includes(data.kind) ? [] : article?.availableLocales || ["en", "hi"])
    add("link", {
      rel: "alternate",
      hreflang: l,
      href:
        origin +
        (article
          ? `/${l}/article/${article.slug}`
          : publicPath.replace(/^\/(en|hi)/, `/${l}`) + listingQuery),
    });
  for (const [property, content] of Object.entries({
    "og:type": article ? "article" : "website",
    "og:title": title,
    "og:description": description,
    "og:url": canonical,
    "og:site_name": "Digital Jagran",
    "og:locale": locale === "hi" ? "hi_IN" : "en_IN",
    ...(article?.image
      ? { "og:image": article.image, "og:image:alt": article.imageAlt }
      : {}),
  }))
    add("meta", { property, content });
  add("meta", {
    name: "twitter:card",
    content: article?.image ? "summary_large_image" : "summary",
  });
  if (article?.image)
    add("meta", { name: "twitter:image", content: article.image });
  add(
    "script",
    { type: "application/ld+json" },
    JSON.stringify(
      article
        ? {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: article.title,
            description,
            image: article.image ? [article.image] : [],
            inLanguage: locale,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
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
          },
    ),
  );
}
