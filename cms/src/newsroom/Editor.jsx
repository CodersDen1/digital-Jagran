import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api, formatDate, publicUrl, sections } from "./api";
import { Alert, Field, Loading, Status } from "./ui";
import { mutationFor } from "./transport";

const blank = () => ({
  slug: "",
  category: "india",
  status: "draft",
  author: "Digital Jagran Desk",
  authorBio: "",
  image: "",
  imageAlt: "",
  imageCredit: "",
  featured: false,
  breaking: false,
  sources: [],
  correction: "",
  publishedAt: new Date().toISOString(),
  translations: {
    en: { title: "", summary: "", body: "", metaTitle: "", description: "" },
    hi: { title: "", summary: "", body: "", metaTitle: "", description: "" },
  },
});
function Preview({ article, locale }) {
  const t = article.translations?.[locale] || {};
  return (
    <div className="article-preview" lang={locale}>
      <div className="preview-brand">
        digital<span>jagran</span>
        <small>
          ARTICLE PREVIEW · {locale === "hi" ? "हिन्दी" : "ENGLISH"}
        </small>
      </div>
      <span className="overline">{article.category}</span>
      <h1>
        {t.title ||
          (locale === "hi" ? "आपकी खबर का शीर्षक" : "Your story headline")}
      </h1>
      <p className="preview-summary">
        {t.summary || "A clear summary gives readers a reason to stay."}
      </p>
      <div className="preview-byline">
        {article.author} · {formatDate(article.publishedAt)}
      </div>
      {/^https?:\/\//.test(article.image) && (
        <figure>
          <img src={article.image} alt={article.imageAlt} />
          <figcaption>{article.imageCredit}</figcaption>
        </figure>
      )}
      <div className="preview-body">
        {t.body?.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {article.sources?.length > 0 && (
        <div className="preview-sources">
          <h3>Sources & references</h3>
          {article.sources.map((s, i) => (
            <p key={i}>
              {s.label} · {s.url}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [locale, setLocale] = useState("en");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [pending, setPending] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState(null);
  const saving = useRef(false);
  const saveController = useRef(null);
  const recoveryKey = `dj-draft-${id || "new"}`;
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    let pendingDraft = null;
    try {
      const draft = localStorage.getItem(recoveryKey);
      if (draft) {
        const saved = JSON.parse(draft);
        setRecovery(saved.article || saved);
        if (saved.pending) {
          pendingDraft = saved.article;
          setPending(saved.pending);
          setDirty(true);
        }
      }
    } catch { /* Optional browser recovery. */ }
    if (id)
      api(`/admin/articles/${id}`, { signal: controller.signal })
        .then((d) => { if (current) setArticle(pendingDraft || d.article); })
        .catch((e) => {
          if (current && e.name !== "AbortError") {
            setError(e.message);
            if (pendingDraft) setArticle(pendingDraft);
          }
        });
    else setArticle(pendingDraft || blank());
    return () => {
      current = false;
      controller.abort();
      saveController.current?.abort();
    };
  }, [id, recoveryKey]);
  useEffect(() => {
    if (article && dirty) {
      try {
        localStorage.setItem(recoveryKey, JSON.stringify({ article, pending }));
      } catch {
        /* Server save remains available. */
      }
    }
  }, [article, dirty, pending, recoveryKey]);
  useEffect(() => {
    if (!dirty && !busy && !pending) return;
    const before = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const link = (e) => {
      const anchor = e.target.closest("a");
      if (anchor && !anchor.target && busy) { e.preventDefault(); return; }
      if (
        anchor &&
        !anchor.target &&
        !e.defaultPrevented &&
        !window.confirm(
          "Leave this editor? Unsaved changes are kept as a recovery draft on this device.",
        )
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", link, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", link, true);
    };
  }, [dirty, busy, pending]);
  const change = (key, value) => {
    setArticle((a) => ({ ...a, [key]: value }));
    setDirty(true);
    setNotice("");
  };
  const translate = (key, value) => {
    setArticle((a) => ({
      ...a,
      translations: {
        ...a.translations,
        [locale]: { ...a.translations[locale], [key]: value },
      },
    }));
    setDirty(true);
    setNotice("");
  };
  async function save(status) {
    if (saving.current || conflict) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = { ...article, status };
      const mutation = pending || mutationFor(JSON.stringify(payload));
      setPending(mutation);
      try { localStorage.setItem(recoveryKey, JSON.stringify({ article: payload, pending: mutation })); }
      catch { /* Keep the key in memory even when device storage is unavailable. */ }
      const controller = new AbortController();
      saveController.current = controller;
      const data = await api(id ? `/admin/articles/${id}` : "/admin/articles", {
        method: id ? "PUT" : "POST",
        body: mutation.body,
        headers: { "Idempotency-Key": mutation.key },
        signal: controller.signal,
      });
      setPending(null);
      setArticle(data.article);
      setDirty(false);
      setNotice(
        data.article.status === "published"
          ? "Your story is live."
          : data.article.status === "scheduled"
            ? "Your story is scheduled."
            : "Story saved.",
      );
      try {
        localStorage.removeItem(recoveryKey);
      } catch {
        /* A successful server save is authoritative. */
      }
      setRecovery(null);
      if (!id) navigate(`/stories/${data.article.id}`, { replace: true });
    } catch (e) {
      if (e.name === "AbortError") return;
      if (!e.uncertain) {
        setPending(null);
        try { localStorage.setItem(recoveryKey, JSON.stringify({ article })); } catch { /* Optional recovery. */ }
      }
      setConflict(e.status === 409 && Boolean(id));
      setError(e.message + (e.uncertain ? " Save result is unknown. Retry the same save below before making further changes." : ""));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (!article) return error ? <Alert error={error} /> : <Loading />;
  const t = article.translations[locale] || {};
  const filled = Object.values(article.translations).filter(
    (x) => x.title,
  ).length;
  const checklist = [
    ["Headline and summary", Boolean(t.title && t.summary)],
    ["Story body", Boolean(t.body)],
    ["Author attribution", Boolean(article.author)],
    ["Image description", !article.image || Boolean(article.imageAlt)],
    ["Source references", article.sources?.length > 0],
    ["Search description", Boolean(t.description || t.summary)],
  ];
  const bodyWords = (t.body || "").trim().split(/\s+/).filter(Boolean).length;
  const dateInput = article.publishedAt
    ? new Date(
        new Date(article.publishedAt).getTime() -
          new Date(article.publishedAt).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  return (
    <>
      <div className="editor-heading">
        <div>
          <Link className="subtle-link" to="/stories">
            <ArrowLeft size={14} />
            All stories
          </Link>
          <h1>{id ? "Shape the story." : "A story starts here."}</h1>
          <div className="editor-state">
            <Status value={article.status} />
            <span>
              {dirty
                ? "Unsaved changes"
                : id
                  ? `Saved ${formatDate(article.updatedAt)}`
                  : "New draft"}{" "}
              · {filled} language{filled !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="editor-buttons">
          <button
            className="btn"
            disabled={busy}
            onClick={() => setPreview(!preview)}
          >
            <Eye size={16} />
            {preview ? "Back to editor" : "Preview"}
          </button>
          <button className="btn" onClick={() => save("draft")} disabled={busy || Boolean(pending) || conflict}>
            <Save size={16} />
            Save draft
          </button>
          <button
            className="btn primary"
            onClick={() =>
              save(article.status === "scheduled" ? "scheduled" : "published")
            }
            disabled={busy || Boolean(pending) || conflict}
          >
            {busy
              ? "Saving…"
              : article.status === "scheduled"
                ? "Schedule story"
                : "Publish story"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <Alert error={error} />
      {pending && <div className="recovery-notice">
        <span>A saved request is awaiting confirmation. Retrying sends the original content and request key.</span>
        <button disabled={busy} onClick={() => save(article.status)}>Retry original save</button>
      </div>}
      {conflict && <div className="conflict-panel" role="region" aria-label="Resolve story conflict">
        <p>Your local text is preserved. Load the current server story and compare it before choosing how to continue.</p>
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { const result = await api(`/admin/articles/${id}`); setLatest(result.article); }
          catch (e) { setError(e.message); }
          finally { setBusy(false); }
        }}>Load latest version for comparison</button>
        {latest && <>
          <p>Server version saved {formatDate(latest.updatedAt)}. Compare both languages, sources and publishing details below. Your local version is available with Preview.</p>
          <details><summary>Current server version</summary>
            <div className="server-comparison">
              <p>Workflow: {latest.status} · URL: {latest.slug}</p>
              <p>Publication time: {formatDate(latest.publishedAt)}</p>
              <p>Author biography: {latest.authorBio || "None"}</p>
              <p>Image description: {latest.imageAlt || "None"}</p>
              <p>Front-page feature: {latest.featured ? "Yes" : "No"} · Breaking: {latest.breaking ? "Yes" : "No"}</p>
              <p>Correction: {latest.correction || "None"}</p>
              {["en", "hi"].map(language => latest.translations?.[language]?.title &&
                <section key={language} lang={language}>
                  <h3>{language === "hi" ? "हिन्दी" : "English"}</h3>
                  <Preview article={latest} locale={language} />
                  <p>Search title: {latest.translations[language].metaTitle || "Headline fallback"}</p>
                  <p>Search description: {latest.translations[language].description || "Summary fallback"}</p>
                </section>)}
            </div>
          </details>
          <button className="btn" disabled={busy} onClick={() => {
            setRecovery(article); setArticle(latest); setDirty(false); setConflict(false); setLatest(null); setError("");
            setNotice("Server version loaded. Your previous local draft remains available to restore.");
          }}>Use server version; keep local recovery</button>
          <button className="btn" disabled={busy} onClick={() => {
            setArticle(a => ({ ...a, updatedAt: latest.updatedAt })); setDirty(true); setConflict(false); setLatest(null); setError("");
            setNotice("Your local draft is now based on the latest revision. Review it, then save to replace the server content.");
          }}>Keep my text and review before replacing</button>
        </>}
      </div>}
      <p role="status" className="success-text">
        {notice}
      </p>
      {recovery && (
        <div className="recovery-notice">
          <span>A recovery draft is available on this device.</span>
          <button
            disabled={busy || Boolean(pending)}
            onClick={() => {
              setArticle(recovery);
              setDirty(true);
              setRecovery(null);
            }}
          >
            Restore draft
          </button>
          <button
            disabled={busy || Boolean(pending)}
            onClick={() => {
              try {
                localStorage.removeItem(recoveryKey);
              } catch {
                /* Optional storage. */
              }
              setRecovery(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="language-editor-tabs">
        {["en", "hi"].map((l) => (
          <button
            disabled={busy}
            key={l}
            className={locale === l ? "active" : ""}
            onClick={() => setLocale(l)}
          >
            {l === "en" ? "English" : "हिन्दी"}
            {article.translations[l]?.title && <Check size={13} />}
          </button>
        ))}
        <span>
          <Globe2 size={13} />
          Separate language URLs. One connected story.
        </span>
      </div>
      {preview ? (
        <Preview article={article} locale={locale} />
      ) : (
        <fieldset className="editor-controls" disabled={busy || Boolean(pending) || conflict}>
          <div className="editor-grid">
            <div>
              <section className="panel editor-panel">
                <div className="panel-heading">
                  <div>
                    <h2>The story</h2>
                    <p>
                      {locale === "hi"
                        ? "हिंदी में अपनी खबर लिखें।"
                        : "A clear headline. A useful summary. A story that matters."}
                    </p>
                  </div>
                  <span className="locale-pill">{locale.toUpperCase()}</span>
                </div>
                <div className="editor-fields" lang={locale}>
                  <Field label={locale === "hi" ? "शीर्षक" : "Headline"}>
                    <textarea
                      className="headline-input"
                      value={t.title || ""}
                      onChange={(e) => translate("title", e.target.value)}
                      maxLength={240}
                      rows={2}
                      placeholder={
                        locale === "hi"
                          ? "खबर की शुरुआत एक अच्छे शीर्षक से होती है…"
                          : "Give your story a headline…"
                      }
                    />
                  </Field>
                  <Field
                    label={locale === "hi" ? "सारांश" : "Summary / standfirst"}
                    note={`${(t.summary || "").length}/700 characters`}
                  >
                    <textarea
                      rows={3}
                      value={t.summary || ""}
                      onChange={(e) => translate("summary", e.target.value)}
                      maxLength={700}
                      placeholder="The essential context, in a sentence or two."
                    />
                  </Field>
                  <Field
                    label={locale === "hi" ? "लेख" : "Story body"}
                    note={`${bodyWords} words · Separate paragraphs with an empty line. Plain text keeps every story accessible.`}
                  >
                    <textarea
                      className="body-input"
                      rows={16}
                      value={t.body || ""}
                      onChange={(e) => translate("body", e.target.value)}
                      maxLength={100000}
                      placeholder={
                        locale === "hi"
                          ? "यहाँ अपनी खबर लिखें…"
                          : "Start with what matters…"
                      }
                    />
                  </Field>
                </div>
              </section>
              <section className="panel editor-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Lead image</h2>
                    <p>A photograph that adds something to the story.</p>
                  </div>
                </div>
                <div className="editor-fields">
                  {article.image && /^https?:\/\//.test(article.image) && (
                    <img
                      className="image-preview"
                      src={article.image}
                      alt={article.imageAlt || "Lead image preview"}
                    />
                  )}
                  <Field
                    label="Image URL"
                    note="Use an absolute HTTPS URL for an image you have the right to publish."
                  >
                    <input
                      value={article.image}
                      onChange={(e) => change("image", e.target.value)}
                      type="url"
                      placeholder="https://…"
                    />
                  </Field>
                  <div className="field-row">
                    <Field
                      label="Image description"
                      note="Describe the information the image conveys."
                    >
                      <input
                        value={article.imageAlt}
                        onChange={(e) => change("imageAlt", e.target.value)}
                        maxLength={500}
                      />
                    </Field>
                    <Field label="Credit / caption">
                      <input
                        value={article.imageCredit}
                        onChange={(e) => change("imageCredit", e.target.value)}
                        maxLength={300}
                      />
                    </Field>
                  </div>
                </div>
              </section>
              <section className="panel editor-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Sources & corrections</h2>
                    <p>
                      Make the evidence easy to follow, for readers and search
                      systems.
                    </p>
                  </div>
                  <ShieldCheck size={19} />
                </div>
                <div className="editor-fields">
                  {(article.sources || []).map((s, i) => (
                    <div className="source-row" key={i}>
                      <Field label={`Source ${i + 1}`}>
                        <input
                          placeholder="Source name"
                          value={s.label}
                          onChange={(e) =>
                            change(
                              "sources",
                              article.sources.map((x, j) =>
                                j === i ? { ...x, label: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Reference URL">
                        <input
                          type="url"
                          placeholder="https://…"
                          value={s.url}
                          onChange={(e) =>
                            change(
                              "sources",
                              article.sources.map((x, j) =>
                                j === i ? { ...x, url: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </Field>
                      <button
                        className="icon-btn"
                        aria-label={`Remove source ${i + 1}`}
                        onClick={() =>
                          change(
                            "sources",
                            article.sources.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn"
                    onClick={() =>
                      change("sources", [
                        ...(article.sources || []),
                        { label: "", url: "" },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add a source
                  </button>
                  <Field
                    label="Correction note"
                    note="Explain substantive corrections to readers."
                  >
                    <textarea
                      rows={3}
                      value={article.correction || ""}
                      onChange={(e) => change("correction", e.target.value)}
                      maxLength={2000}
                    />
                  </Field>
                </div>
              </section>
              <section className="panel editor-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Search & sharing</h2>
                    <p>
                      Language-specific metadata, with headline and summary
                      fallbacks.
                    </p>
                  </div>
                  <Search size={18} />
                </div>
                <div className="editor-fields">
                  <Field
                    label="Search title"
                    note="Optional. Leave blank to use the full headline."
                  >
                    <input
                      value={t.metaTitle || ""}
                      onChange={(e) => translate("metaTitle", e.target.value)}
                      maxLength={240}
                    />
                  </Field>
                  <Field
                    label="Search description"
                    note="Optional. Leave blank to use the summary."
                  >
                    <textarea
                      rows={3}
                      value={t.description || ""}
                      onChange={(e) => translate("description", e.target.value)}
                      maxLength={500}
                    />
                  </Field>
                  <div className="search-preview">
                    <small>digitaljagran.com › {locale} › article</small>
                    <strong>
                      {t.metaTitle || t.title || "Your story title"} | Digital
                      Jagran
                    </strong>
                    <p>
                      {t.description ||
                        t.summary ||
                        "Your story summary will appear here."}
                    </p>
                  </div>
                </div>
              </section>
            </div>
            <aside className="editor-aside">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Publishing details</h2>
                </div>
                <div className="editor-fields">
                  <Field label="Section">
                    <select
                      value={article.category}
                      onChange={(e) => change("category", e.target.value)}
                    >
                      {sections.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Workflow status">
                    <select
                      value={article.status}
                      onChange={(e) => change("status", e.target.value)}
                    >
                      {[
                        "draft",
                        "review",
                        "scheduled",
                        "published",
                        "archived",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Publication time"
                    note="Your browser’s local time. Scheduled stories become public at this time."
                  >
                    <input
                      type="datetime-local"
                      value={dateInput}
                      onChange={(e) =>
                        e.target.value &&
                        change(
                          "publishedAt",
                          new Date(e.target.value).toISOString(),
                        )
                      }
                    />
                  </Field>
                  <Field
                    label="URL slug"
                    note="Auto-generated on first save. Published URLs are kept stable."
                  >
                    <input
                      value={article.slug}
                      onChange={(e) => change("slug", e.target.value)}
                      maxLength={140}
                      disabled={Boolean(article.id)}
                      placeholder="your-story-url"
                    />
                  </Field>
                  <Field label="Author name">
                    <input
                      value={article.author}
                      onChange={(e) => change("author", e.target.value)}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Author biography">
                    <textarea
                      value={article.authorBio || ""}
                      onChange={(e) => change("authorBio", e.target.value)}
                      rows={3}
                      maxLength={1000}
                    />
                  </Field>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={article.featured}
                      onChange={(e) => change("featured", e.target.checked)}
                    />
                    <span>
                      Feature on the front page
                      <small>Give this story lead placement.</small>
                    </span>
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={article.breaking}
                      onChange={(e) => change("breaking", e.target.checked)}
                    />
                    <span>
                      Breaking news<small>Include in the breaking strip.</small>
                    </span>
                  </label>
                  <button
                    className="btn full"
                    disabled={busy || Boolean(pending) || conflict}
                    onClick={() => save(article.status)}
                  >
                    <Save size={15} />
                    Save changes
                  </button>
                  {article.id && article.status === "published" && t.title && (
                    <a
                      className="btn full"
                      href={publicUrl(`/${locale}/article/${article.slug}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open published story
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </section>
              <section className="panel checklist">
                <div className="panel-heading">
                  <h2>Before you publish</h2>
                </div>
                {checklist.map(([label, ready]) => (
                  <div key={label}>
                    <CheckCircle2 size={16} className={ready ? "ready" : ""} />
                    <span>{label}</span>
                  </div>
                ))}
                <p>
                  Source links support attribution. Their presence does not
                  verify a claim or guarantee an AI citation.
                </p>
              </section>
            </aside>
          </div>
        </fieldset>
      )}
    </>
  );
}
