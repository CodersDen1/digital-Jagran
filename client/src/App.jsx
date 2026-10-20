import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Mail,
  Menu,
  Search,
  Share2,
  X,
} from "lucide-react";
import { mutationKey, request } from "./newsroom/api";
import { updateMetadata } from "./newsroom/meta";

const words = {
  en: {
    home: "The Front Page",
    latest: "The latest",
    sections: "Explore the sections",
    more: "More perspectives",
    newsletter: "A little clarity. In your inbox.",
    newsletterText:
      "Join the Digital Jagran reading list for our future newsletter.",
    email: "Your email address",
    subscribe: "Join the list",
    consent:
      "I agree to receive the newsletter. I can request removal at any time.",
    saved: "Reading list",
    read: "Read the story",
    search: "Search stories",
    related: "The story continues",
    summary: "At a glance",
    sources: "Sources & references",
    updated: "Updated",
    min: "min read",
    demo: "Preview edition · Illustrative stories, not current reporting",
    empty: "No stories here yet.",
    browse: "Explore the front page",
    copy: "Copy link",
    copied: "Link copied",
    save: "Save story",
    unsave: "Remove from reading list",
    listen: "Listen",
    stop: "Stop listening",
    about: "About us",
    editorial: "Editorial principles",
    privacy: "Privacy",
    load: "Loading the newsroom…",
    error: "We couldn’t load this page.",
    retry: "Try again",
    note: "Made for a more informed day.",
    tagline: "News. Context. Perspective.",
    all: "All stories",
    savedEmpty: "Your next good read belongs here.",
    savedText:
      "Save a story to find it here later. Your reading list stays on this device.",
  },
  hi: {
    home: "मुख्य पृष्ठ",
    latest: "ताज़ा खबरें",
    sections: "हर विषय पर एक नज़र",
    more: "और भी नज़रिए",
    newsletter: "ज़रूरी खबरें। सीधे आपके इनबॉक्स में।",
    newsletterText: "डिजिटल जागरण की भावी न्यूज़लेटर सूची में अपना नाम जोड़ें।",
    email: "आपका ईमेल पता",
    subscribe: "सूची में जुड़ें",
    consent:
      "मैं न्यूज़लेटर पाने के लिए सहमत हूँ। मैं कभी भी अपना नाम हटाने का अनुरोध कर सकता हूँ।",
    saved: "पठन सूची",
    read: "पूरी खबर पढ़ें",
    search: "खबर खोजें",
    related: "इससे जुड़ी और खबरें",
    summary: "एक नज़र में",
    sources: "स्रोत और संदर्भ",
    updated: "अपडेट",
    min: "मिनट में पढ़ें",
    demo: "पूर्वावलोकन संस्करण · उदाहरण लेख, वर्तमान समाचार नहीं",
    empty: "यहाँ अभी कोई खबर नहीं है।",
    browse: "मुख्य पृष्ठ पर जाएँ",
    copy: "लिंक कॉपी करें",
    copied: "लिंक कॉपी हुआ",
    save: "खबर सेव करें",
    unsave: "पठन सूची से हटाएँ",
    listen: "सुनें",
    stop: "सुनना रोकें",
    about: "हमारे बारे में",
    editorial: "संपादकीय सिद्धांत",
    privacy: "गोपनीयता",
    load: "खबरें लोड हो रही हैं…",
    error: "यह पृष्ठ लोड नहीं हो सका।",
    retry: "फिर कोशिश करें",
    note: "हर दिन, बेहतर समझ के साथ।",
    tagline: "खबरें। संदर्भ। नज़रिया।",
    all: "सभी खबरें",
    savedEmpty: "अपनी पसंद की खबरें यहाँ रखें।",
    savedText:
      "खबर को बाद में पढ़ने के लिए सेव करें। यह सूची इसी डिवाइस पर रहती है।",
  },
};
const date = (value, locale, time = false) =>
  new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
const imageSize = (url, width) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "images.unsplash.com") return url;
    parsed.searchParams.set("w", width);
    return parsed.href;
  } catch {
    return url;
  }
};
const responsiveImages = (url) =>
  url.includes("images.unsplash.com/")
    ? [400, 800, 1200, 1600]
        .map((width) => `${imageSize(url, width)} ${width}w`)
        .join(", ")
    : undefined;
const storyPath = (a) => `/${a.locale}/article/${a.slug}`;
const bookmarkCard = (article) => ({
  id: article.id || article.slug,
  slug: article.slug,
  locale: article.locale,
  title: article.title,
  author: article.author,
  summary: typeof article.summary === "string" ? article.summary : "",
  category: typeof article.category === "string" ? article.category : "",
  image: typeof article.image === "string" ? article.image : "",
  readingMinutes: Number(article.readingMinutes) || 1,
});

function StoryCard({ article: a, section, mode = "", priority = false }) {
  return (
    <article className={`story-card ${mode}`}>
      {a.image && (
        <Link
          className="story-image"
          to={storyPath(a)}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img
            src={imageSize(a.image, 800)}
            srcSet={responsiveImages(a.image)}
            sizes="(max-width: 767px) 90vw, (max-width: 1100px) 50vw, 40vw"
            alt=""
            width="960"
            height="600"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
        </Link>
      )}
      <div className="story-copy">
        <Link className="eyebrow" to={`/${a.locale}/section/${a.category}`}>
          {section}
        </Link>
        <h2>
          <Link to={storyPath(a)}>{a.title}</Link>
        </h2>
        {mode !== "compact" && <p className="story-summary">{a.summary}</p>}
        <div className="story-meta">
          <span>{a.author}</span>
          <span>
            <Clock3 size={12} /> {a.readingMinutes} {words[a.locale].min}
          </span>
        </div>
      </div>
    </article>
  );
}

function Header({ data }) {
  const { locale, sections, article, path } = data;
  const w = words[locale];
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const other = locale === "en" ? "hi" : "en";
  const otherPath =
    article && !article.availableLocales.includes(other)
      ? `/${other}`
      : path.replace(/^\/(en|hi)/, `/${other}`);
  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="site-header">
      <div className="utility-bar shell">
        <span>{w.tagline}</span>
        <div>
          <Link to={`/${locale}/saved`}>
            <Bookmark size={13} />
            {w.saved}
          </Link>
          <a href="#newsletter">
            <Mail size={13} />
            {locale === "hi" ? "न्यूज़लेटर" : "Newsletter"}
          </a>
        </div>
      </div>
      <div className="masthead shell">
        <button
          ref={menuButton}
          className="icon-button mobile-menu"
          aria-label={locale === "hi" ? (open ? "मेन्यू बंद करें" : "मेन्यू खोलें") : (open ? "Close navigation" : "Open navigation")}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <Link
          to={`/${locale}`}
          className="wordmark"
          aria-label="Digital Jagran home"
        >
          <span className="brand-symbol">ज</span>
          <span>
            digital<span className="brand-red">jagran</span>
            <small>
              {locale === "hi" ? "डिजिटल जागरण" : "A CLEARER VIEW."}
            </small>
          </span>
        </Link>
        <div className="masthead-actions">
          <Link to={otherPath} className="language-switch" lang={other}>
            {other === "hi" ? "हिन्दी" : "English"}
            <ArrowRight size={13} />
          </Link>
          <Link
            to={`/${locale}/search`}
            className="icon-button"
            aria-label={w.search}
          >
            <Search size={19} />
          </Link>
        </div>
      </div>
      <nav
        id="primary-nav"
        aria-label={locale === "hi" ? "मुख्य नेविगेशन" : "Primary"}
        className={`primary-nav ${open ? "is-open" : ""}`}
      >
        <div className="shell">
          <NavLink to={`/${locale}`} end onClick={() => setOpen(false)}>
            {w.home}
          </NavLink>
          {sections.map((c) => (
            <NavLink
              key={c.slug}
              to={`/${locale}/section/${c.slug}`}
              onClick={() => setOpen(false)}
            >
              {c[locale]}
            </NavLink>
          ))}
        </div>
      </nav>
      {data.demo && <div className="demo-strip">{w.demo}</div>}
      {data.breaking.length > 0 && (
        <div className="breaking-strip shell">
          <strong>{locale === "hi" ? "अभी-अभी" : "BREAKING"}</strong>
          <Link to={storyPath(data.breaking[0])}>{data.breaking[0].title}</Link>
          <ArrowRight size={14} />
        </div>
      )}
    </header>
  );
}

function Newsletter({ locale }) {
  const w = words[locale];
  const [state, setState] = useState({ status: "", message: "" });
  const pending = useRef(new Map());
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  async function submit(event) {
    event.preventDefault();
    if (active.current) return;
    const form = new FormData(event.currentTarget);
    const body = JSON.stringify({ email: String(form.get("email")).trim().toLowerCase(), consent: form.get("consent") === "on" });
    try {
      const stored = JSON.parse(sessionStorage.getItem("dj-newsletter-pending") || "[]");
      for (const entry of stored) {
        if (Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string") pending.current.set(...entry);
      }
    } catch { /* In-memory keys still protect retries when storage is unavailable. */ }
    const key = pending.current.get(body) || mutationKey();
    pending.current.set(body, key);
    const persist = () => {
      try { sessionStorage.setItem("dj-newsletter-pending", JSON.stringify([...pending.current].slice(-10))); } catch { /* Optional recovery storage. */ }
    };
    persist();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: "pending", message: "" });
    try {
      const result = await request("/api/v1/newsletter", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        signal: controller.signal,
        body,
      });
      pending.current.delete(body);
      persist();
      setState({
        status: "done",
        message:
          locale === "hi"
            ? "धन्यवाद! आपका नाम सूची में जुड़ गया है।"
            : result.message,
      });
    } catch (error) {
      if (error.name !== "AbortError") setState({ status: "error", message: error.message });
    } finally {
      active.current = null;
    }
  }
  return (
    <section className="newsletter" id="newsletter">
      <div>
        <span className="eyebrow">DIGITAL JAGRAN · THE BRIEF</span>
        <h2>{w.newsletter}</h2>
        <p>{w.newsletterText}</p>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="newsletter-email">
          {w.email}
        </label>
        <div className="email-row">
          <input
            type="email"
            id="newsletter-email"
            name="email"
            placeholder={w.email}
            required
            maxLength={254}
            autoComplete="email"
            disabled={["pending", "done"].includes(state.status)}
          />
          <button
            className="button dark"
            disabled={["pending", "done"].includes(state.status)}
          >
            {state.status === "done" ? <Check size={18} /> : w.subscribe}
            <ArrowRight size={17} />
          </button>
        </div>
        <label className="consent">
          <input type="checkbox" name="consent" required disabled={["pending", "done"].includes(state.status)} />
          {w.consent}
        </label>
        <p
          role="status"
          className={state.status === "error" ? "error-text" : ""}
        >
          {state.message}
        </p>
      </form>
    </section>
  );
}

function FrontPage({ data }) {
  const w = words[data.locale];
  const section = (a) =>
    data.sections.find((c) => c.slug === a.category)?.[data.locale];
  const ordered = [...data.articles].sort(
    (a, b) => Number(b.featured) - Number(a.featured),
  );
  const lead = ordered[0];
  if (!lead) return <Empty text={w.empty} locale={data.locale} />;
  return (
    <>
      <div className="edition-line">
        <span>
          <i />
          {data.locale === "hi" ? "आज का संस्करण" : "THE DAILY EDITION"}
        </span>
        <span>
          {date(lead.publishedAt, data.locale)} ·{" "}
          {data.locale === "hi" ? "भारत" : "INDIA"}
        </span>
      </div>
      <section className="front-heading">
        <h1>
          {data.locale === "hi" ? (
            <>
              दुनिया को देखें,
              <br />
              <em>एक नए नज़रिए से।</em>
            </>
          ) : (
            <>
              The world, through
              <br />
              <em>a clearer lens.</em>
            </>
          )}
        </h1>
        <p>
          {data.locale === "hi"
            ? "उन खबरों के लिए जो मायने रखती हैं। और उस संदर्भ के लिए जो समझ बढ़ाता है।"
            : "For the stories that matter. And the context that makes all the difference."}
        </p>
      </section>
      <div className="lead-grid">
        <StoryCard
          article={lead}
          section={section(lead)}
          mode="lead"
          priority
        />
        <div className="secondary-stories">
          {ordered.slice(1, 3).map((a) => (
            <StoryCard
              key={a.id}
              article={a}
              section={section(a)}
              mode="secondary"
            />
          ))}
        </div>
        <aside className="latest-column">
          <div className="section-label">
            <span className="live-dot" />
            {w.latest}
            <ArrowRight size={15} />
          </div>
          {data.latest.map((a, i) => (
            <Link className="latest-item" key={a.id} to={storyPath(a)}>
              <span className="latest-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="eyebrow">{section(a)}</span>
                <h3>{a.title}</h3>
                <time dateTime={a.publishedAt}>
                  {date(a.publishedAt, data.locale)}
                </time>
              </div>
            </Link>
          ))}
        </aside>
      </div>
      <div className="section-heading">
        <h2>{w.more}</h2>
        <span>01 — {String(ordered.length).padStart(2, "0")}</span>
      </div>
      <div className="story-grid">
        {ordered.slice(3).map((a) => (
          <StoryCard key={a.id} article={a} section={section(a)} />
        ))}
      </div>
      <div className="section-heading">
        <h2>{w.sections}</h2>
      </div>
      <div className="topic-grid">
        {data.sections.map((c, i) => (
          <Link to={`/${data.locale}/section/${c.slug}`} key={c.slug}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h3>{c[data.locale]}</h3>
            <ArrowRight size={19} />
          </Link>
        ))}
      </div>
    </>
  );
}

function Empty({ text, locale }) {
  return (
    <div className="empty-state">
      <Bookmark size={30} />
      <h2>{text}</h2>
      <Link className="text-link" to={`/${locale}`}>
        {words[locale].browse}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function Listing({ data }) {
  const navigate = useNavigate();
  const w = words[data.locale];
  const params = new URLSearchParams(data.path.split("?")[1]);
  const currentPage = data.pagination?.page || Math.max(1, Number(params.get("page")) || 1);
  const pagination = data.pagination || { page: currentPage, pageSize: 12, total: data.articles.length, hasMore: currentPage * 12 < data.articles.length };
  const articles = data.pagination ? data.articles : data.articles.slice((currentPage - 1) * 12, currentPage * 12);
  const pageLink = (page) => {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete("page"); else next.set("page", page);
    return data.path.split("?")[0] + (next.size ? `?${next}` : "");
  };
  const title =
    data.kind === "search"
      ? w.search
      : data.sections.find((c) => c.slug === data.category)?.[data.locale];
  return (
    <>
      <div className="listing-heading">
        <span className="eyebrow">DIGITAL JAGRAN</span>
        <h1>{title}</h1>
        <p>
          {data.kind === "search" && data.query
            ? `${pagination.total} ${data.locale === "hi" ? "नतीजे" : "results"} · “${data.query}”`
            : data.locale === "hi"
              ? "खबरों से आगे, पूरी बात समझिए।"
              : "Go beyond the headline. Find the fuller picture."}
        </p>
      </div>
      {data.kind === "search" && (
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(
              `/${data.locale}/search?q=${encodeURIComponent(new FormData(e.currentTarget).get("q"))}`,
            );
          }}
        >
          <label className="sr-only" htmlFor="story-search">
            {w.search}
          </label>
          <input
            key={data.query}
            type="search"
            name="q"
            id="story-search"
            defaultValue={data.query}
            maxLength={150}
            placeholder={w.search}
            required
          />
          <button className="button dark">
            <Search size={18} />
            {w.search}
          </button>
        </form>
      )}
      {articles.length ? (
        <>
          <div className="story-grid listing">
            {articles.map((a) => (
              <StoryCard
                key={a.id}
                article={a}
                section={
                  data.sections.find((c) => c.slug === a.category)?.[
                    data.locale
                  ]
                }
              />
            ))}
          </div>
        </>
      ) : (
        <Empty text={w.empty} locale={data.locale} />
      )}
      {(pagination.page > 1 || pagination.hasMore) && (
        <nav className="pagination" aria-label={data.locale === "hi" ? "खबरों के पृष्ठ" : "Story pages"}>
          {pagination.page > 1 && <Link className="button" rel="prev" to={pageLink(pagination.page - 1)}>{data.locale === "hi" ? "पिछला पृष्ठ" : "Previous page"}</Link>}
          <span>{data.locale === "hi" ? "पृष्ठ" : "Page"} {pagination.page}</span>
          {pagination.hasMore && <Link className="button" rel="next" to={pageLink(pagination.page + 1)}>{data.locale === "hi" ? "अगला पृष्ठ" : "Next page"}<ArrowRight size={16} /></Link>}
        </nav>
      )}
    </>
  );
}

function Article({ data, saved, onSave }) {
  const { article: a, locale } = data;
  const w = words[locale];
  const [notice, setNotice] = useState("");
  const [size, setSize] = useState(20);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const selected = saved.some((s) => s.slug === a.slug && s.locale === locale);
  useEffect(() => {
    // Discover browser-only speech support after SSR hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanListen("speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  const listen = () => {
    if (listening) {
      window.speechSynthesis.cancel();
      setListening(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `${a.title}. ${a.summary}. ${a.body}`,
    );
    utterance.lang = locale === "hi" ? "hi-IN" : "en-IN";
    utterance.onend = () => setListening(false);
    utterance.onerror = () => {
      setListening(false);
      setNotice(
        locale === "hi"
          ? "इस डिवाइस पर आवाज़ उपलब्ध नहीं है।"
          : "A reading voice is unavailable on this device.",
      );
    };
    window.speechSynthesis.speak(utterance);
    setListening(true);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${data.origin}/${locale}/article/${a.slug}`,
      );
      setNotice(w.copied);
    } catch {
      setNotice(
        locale === "hi"
          ? "पता बार से लिंक कॉपी करें।"
          : "Copy the address from your browser’s address bar.",
      );
    }
  };
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={`/${locale}`}>{w.home}</Link>
        <ChevronRight size={13} />
        <Link to={`/${locale}/section/${a.category}`}>
          {data.sections.find((c) => c.slug === a.category)?.[locale]}
        </Link>
      </nav>
      <article className="full-story">
        <header className="article-heading">
          <span className="eyebrow">
            {data.sections.find((c) => c.slug === a.category)?.[locale]}{" "}
            <span className="label-rule" /> DIGITAL JAGRAN
          </span>
          <h1>{a.title}</h1>
          <p className="standfirst">{a.summary}</p>
          <div className="byline">
            <span className="author-initial">{a.author.charAt(0)}</span>
            <div>
              <strong>{a.author}</strong>
              <div>
                <time dateTime={a.publishedAt}>
                  {date(a.publishedAt, locale, true)} IST
                </time>
                <span>
                  {" "}
                  · {a.readingMinutes} {w.min}
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className="reading-tools">
          <div>
            <button onClick={() => onSave(a)} aria-pressed={selected}>
              <Bookmark size={16} fill={selected ? "currentColor" : "none"} />
              {selected ? w.unsave : w.save}
            </button>
            <button onClick={copy}>
              <Share2 size={16} />
              {w.copy}
            </button>
            {canListen && (
              <button onClick={listen} aria-pressed={listening}>
                <Headphones size={16} />
                {listening ? w.stop : w.listen}
              </button>
            )}
          </div>
          <div>
            <button
              onClick={() => setSize(Math.max(16, size - 2))}
              aria-label={locale === "hi" ? "अक्षर छोटे करें" : "Decrease text size"}
              disabled={size === 16}
            >
              A−
            </button>
            <button
              onClick={() => setSize(Math.min(28, size + 2))}
              aria-label={locale === "hi" ? "अक्षर बड़े करें" : "Increase text size"}
              disabled={size === 28}
            >
              A+
            </button>
          </div>
        </div>
        <p className="tool-notice" role="status">
          {notice}
        </p>
        {a.image && (
          <figure className="article-photo">
            <img
              src={a.image}
              srcSet={responsiveImages(a.image)}
              sizes="(max-width: 767px) 95vw, 1100px"
              alt={a.imageAlt}
              width="1600"
              height="1000"
              fetchPriority="high"
            />
            <figcaption>{a.imageCredit}</figcaption>
          </figure>
        )}
        <div className="article-layout">
          <aside className="article-summary">
            <span className="eyebrow">{w.summary}</span>
            <p>{a.summary}</p>
            <span className="small muted">
              {w.updated}
              <br />
              <time dateTime={a.updatedAt}>
                {date(a.updatedAt, locale, true)} IST
              </time>
            </span>
          </aside>
          <div className="article-body" style={{ fontSize: size }}>
            {a.body
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            {a.sources?.length > 0 && (
              <section className="source-list">
                <h2>{w.sources}</h2>
                <ol>
                  {a.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.label || s.url}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {a.correction && (
              <aside className="correction">
                <strong>{locale === "hi" ? "सुधार" : "Correction"}</strong>
                <p>{a.correction}</p>
              </aside>
            )}
            <div className="author-card">
              <span className="author-initial">{a.author.charAt(0)}</span>
              <div>
                <span className="eyebrow">
                  {locale === "hi" ? "लेखक" : "ABOUT THE AUTHOR"}
                </span>
                <h3>{a.author}</h3>
                {a.authorBio && <p>{a.authorBio}</p>}
              </div>
            </div>
          </div>
        </div>
      </article>
      {data.articles.length > 0 && (
        <>
          <div className="section-heading">
            <h2>{w.related}</h2>
          </div>
          <div className="story-grid">
            {data.articles.map((related) => (
              <StoryCard
                key={related.id}
                article={related}
                section={
                  data.sections.find((c) => c.slug === related.category)?.[
                    locale
                  ]
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Information({ data }) {
  const hi = data.locale === "hi";
  const content = {
    about: [
      hi ? "डिजिटल जागरण के बारे में" : "About Digital Jagran",
      hi
        ? "डिजिटल जागरण हिंदी और अंग्रेज़ी में खबरें, संदर्भ और नज़रिए प्रस्तुत करने वाला मंच है। हमारा उद्देश्य पाठकों को विषय की स्पष्ट समझ देना है।"
        : "Digital Jagran is a Hindi and English publication built around news, context and perspectives. Our aim is to make important subjects easier to understand.",
    ],
    editorial: [
      hi ? "संपादकीय सिद्धांत" : "Editorial principles",
      hi
        ? "खबर प्रकाशित करने से पहले तथ्यों की पुष्टि करें। रिपोर्टिंग, राय और विज्ञापन को स्पष्ट रूप से अलग रखें। स्रोत और लेखक की जानकारी दें। गलती होने पर सुधार और समय साफ़ तौर पर दिखाएँ।"
        : "Verify facts before publication. Clearly distinguish reporting, opinion and advertising. Attribute sources, identify authors and make publication dates visible. Record substantive corrections openly. These are the publishing standards for this newsroom.",
    ],
    privacy: [
      hi ? "गोपनीयता" : "Privacy",
      hi
        ? "पठन सूची इसी ब्राउज़र में रखी जाती है। न्यूज़लेटर में शामिल होने पर आपका ईमेल और सहमति का समय सुरक्षित होता है। न्यूज़रूम प्रवेश के लिए सत्र कुकी उपयोग होती है। बाहरी तस्वीरें लोड होने पर संबंधित प्रदाता को आपका आईपी पता दिखाई दे सकता है।"
        : "Your reading list is stored in this browser. Joining the newsletter stores your email address and consent date. The newsroom uses an essential session cookie for sign-in. Remote images may share your IP address with their image provider. No third-party analytics or advertising scripts are included in this rebuild.",
    ],
  };
  const [title, body] = content[data.information];
  return (
    <article className="information-page">
      <span className="eyebrow">DIGITAL JAGRAN</span>
      <h1>{title}</h1>
      <p>{body}</p>
      {data.demo && (
        <p className="notice">
          {hi
            ? "यह स्थानीय पूर्वावलोकन है। सार्वजनिक लॉन्च से पहले स्वामित्व, संपर्क, गोपनीयता अनुरोध और संपादकीय नीतियों की पूरी जानकारी जोड़ें।"
            : "This is a local preview. Before a public launch, provide verified ownership, newsroom contact details, privacy request procedures and complete editorial policies."}
        </p>
      )}
    </article>
  );
}

export default function App({ initialData }) {
  const location = useLocation();
  const requestedPath = location.pathname + location.search;
  const locale = /^\/hi(?:\/|$)/.test(location.pathname) ? "hi" : "en";
  const w = words[locale];
  const [page, setPage] = useState(initialData || null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState([]);
  const [storageNotice, setStorageNotice] = useState("");
  const navigated = useRef(false);
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("dj-reading-list") || "[]");
      if (Array.isArray(list))
        // Browser storage is intentionally read after SSR hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSaved(
          list.filter(
            (a) =>
              a &&
              typeof a.slug === "string" &&
              typeof a.title === "string" &&
              typeof a.author === "string" &&
              ["en", "hi"].includes(a.locale),
          ).map(bookmarkCard),
        );
    } catch {
      setStorageNotice("Your browser could not load the reading list.");
    }
  }, []);
  useEffect(() => {
    if (requestedPath === "/") return;
    if (initialData?.path !== requestedPath) navigated.current = true;
    if (initialData?.path === requestedPath && !navigated.current && attempt === 0) {
      return;
    }
    const controller = new AbortController();
    // Clear the previous route's failure before subscribing to this request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("");
    request(`/api/v1/page?path=${encodeURIComponent(requestedPath)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPage(data);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError({ path: requestedPath, message: e.message, status: e.status });
      });
    return () => controller.abort();
  }, [requestedPath, initialData, attempt]);
  useEffect(() => {
    if (error?.path === requestedPath) {
      updateMetadata({ locale, path: requestedPath, origin: page?.origin || window.location.origin, kind: "notfound", sections: [] });
    } else if (page?.path === requestedPath) {
      updateMetadata(page);
      window.scrollTo(0, 0);
      if (navigated.current) document.getElementById("main-content")?.focus({ preventScroll: true });
    }
  }, [page, requestedPath, error, locale]);
  const onSave = (article) => {
    const next = saved.some(
      (a) => a.slug === article.slug && a.locale === article.locale,
    )
      ? saved.filter(
          (a) => !(a.slug === article.slug && a.locale === article.locale),
        )
      : [...saved, bookmarkCard(article)];
    try {
      localStorage.setItem("dj-reading-list", JSON.stringify(next));
      setSaved(next);
      setStorageNotice("");
    } catch {
      setStorageNotice("Your browser could not save this reading list.");
    }
  };
  const activeError = error?.path === requestedPath
    ? locale === "hi" && error.status === 429 ? "बहुत अधिक अनुरोध आए हैं। कृपया थोड़ी देर बाद फिर कोशिश करें।"
      : locale === "hi" && error.status === 503 ? "न्यूज़रूम अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।"
        : error.message : "";
  if (location.pathname === "/") return <Navigate to="/hi" replace />;
  if (activeError)
    return <main className="shell empty-state" id="main-content">
      <h1>{w.error}</h1><p role="alert">{activeError}</p>
      <button className="button" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>{w.retry}</button>
      <Link className="text-link" to={`/${locale}`}>{w.browse}</Link>
    </main>;
  if (!page || page.path !== requestedPath)
    return (
      <div className="page-loading" role="status">
        <span className="brand-symbol">ज</span>
        <p>{w.load}</p>
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#main-content">
        {locale === "hi" ? "मुख्य सामग्री पर जाएँ" : "Skip to content"}
      </a>
      <Header key={`${page.locale}-${location.pathname}`} data={page} />
      <main className="shell main-content" id="main-content" tabIndex={-1}>
        {storageNotice && (
          <p role="status" className="notice">
            {storageNotice}
          </p>
        )}
        {page.kind === "home" ? (
          <FrontPage data={page} />
        ) : ["section", "search"].includes(page.kind) ? (
          <Listing key={page.path} data={page} />
        ) : page.kind === "article" ? (
          <Article key={page.path} data={page} saved={saved} onSave={onSave} />
        ) : page.kind === "saved" ? (
          <>
            <div className="listing-heading">
              <span className="eyebrow">YOUR DIGITAL JAGRAN</span>
              <h1>{w.saved}</h1>
              <p>{w.savedText}</p>
            </div>
            {saved.length ? (
              <div className="story-grid">
                {saved.map((a) => (
                  <div key={`${a.slug}-${a.locale}`}>
                    <StoryCard
                      article={a}
                      section={
                        page.sections.find((c) => c.slug === a.category)?.[
                          a.locale
                        ]
                      }
                    />
                    <button className="text-link" onClick={() => onSave(a)}>
                      {words[a.locale].unsave}
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty locale={locale} text={w.savedEmpty} />
            )}
          </>
        ) : page.kind === "information" ? (
          <Information data={page} />
        ) : (
          <div className="empty-state">
            <span className="eyebrow">404</span>
            <h1>
              {locale === "hi"
                ? "यह पृष्ठ नहीं मिला।"
                : "This page is off the press."}
            </h1>
            <Link className="button" to={`/${locale}`}>
              {w.browse}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
        <Newsletter key={requestedPath} locale={locale} />
      </main>
      <footer className="site-footer">
        <div className="shell">
          <div className="footer-top">
            <Link className="wordmark" to={`/${locale}`}>
              <span className="brand-symbol">ज</span>
              <span>
                digital<span className="brand-red">jagran</span>
              </span>
            </Link>
            <p>{w.note}</p>
          </div>
          <div className="footer-bottom">
            <span>
              ©{" "}
              {new Date(
                page.latest[0]?.publishedAt || "2026-01-01",
              ).getUTCFullYear()}{" "}
              Digital Jagran
            </span>
            <nav aria-label="Footer">
              <Link to={`/${locale}/about`}>{w.about}</Link>
              <Link to={`/${locale}/editorial`}>{w.editorial}</Link>
              <Link to={`/${locale}/privacy`}>{w.privacy}</Link>
              <a href="/newsroom/">
                Newsroom
                <ArrowRight size={12} />
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
