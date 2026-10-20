import { createElement, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Globe2,
  Mail,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api, formatDate, sections, storyTitle } from "./api";
import { mutationFor } from "./transport";
import { collectSubscribers, subscriberCsv } from "./subscriberExport";
import { Pagination, Alert, Loading, PageHeader, Status } from "./ui";

export function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api("/admin/stats", { signal: controller.signal })
      .then(d => { if (!controller.signal.aborted) setData(d); })
      .catch(e => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, []);
  if (!data) return error ? <Alert error={error} /> : <Loading />;
  const metrics = [
    [
      "Published stories",
      data.counts.published,
      "Available to your readers",
      FileText,
      "rose",
    ],
    [
      "In progress",
      data.counts.draft + data.counts.review,
      "Drafts and stories in review",
      Clock3,
      "amber",
    ],
    [
      "Scheduled",
      data.counts.scheduled,
      "Ready for their moment",
      CheckCircle2,
      "blue",
    ],
    [
      "Newsletter readers",
      data.subscribers,
      "People who opted in",
      Users,
      "green",
    ],
  ];
  return (
    <>
      <PageHeader
        eyebrow="YOUR PUBLICATION AT A GLANCE"
        heading="A new day. A new perspective."
        description="Here’s what’s happening across your newsroom."
      >
        <Link className="btn primary" to="/stories/new">
          <Plus size={17} />
          Create a story
        </Link>
      </PageHeader>
      {data.demo && (
        <div className="demo-notice">
          <span>PREVIEW EDITION</span> You’re working with isolated
          demonstration stories. Your existing database is untouched.
        </div>
      )}
      <div className="metrics">
        {metrics.map(([label, value, note, Icon, color]) => (
          <div className="metric" key={label}>
            <div>
              <span>{label}</span>
              <span className={`metric-icon ${color}`}>
                {createElement(Icon, { size: 18 })}
              </span>
            </div>
            <strong>{value}</strong>
            <p>{note}</p>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>The editorial desk</h2>
              <p>Your most recently updated stories.</p>
            </div>
            <Link className="subtle-link" to="/stories">
              View all stories
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="recent-list">
            {data.recent.map((a) => (
              <Link to={`/stories/${a.id}`} className="recent-story" key={a.id}>
                {a.image ? (
                  <img src={a.image} alt="" width="70" height="54" />
                ) : (
                  <span className="image-placeholder">
                    <FileText size={20} />
                  </span>
                )}
                <div>
                  <span className="overline">{a.category}</span>
                  <h3>{storyTitle(a)}</h3>
                  <small>
                    {a.author} · {formatDate(a.updatedAt)}
                  </small>
                </div>
                <Status value={a.status} />
                <ChevronRight size={16} />
              </Link>
            ))}
            {data.recent.length === 0 && (
              <div className="empty">
                Your first story starts here.
                <Link to="/stories/new">Create a story</Link>
              </div>
            )}
          </div>
        </section>
        <aside className="panel section-panel">
          <div className="panel-heading">
            <div>
              <h2>Across the sections</h2>
              <p>Where your stories live.</p>
            </div>
            <Globe2 size={18} />
          </div>
          {data.sections.map((c) => (
            <div className="section-row" key={c.slug}>
              <span>{c.en}</span>
              <div>
                <span
                  style={{
                    width: `${data.total ? (c.count / data.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{c.count}</strong>
            </div>
          ))}
          <div className="editorial-tip">
            <span className="tip-icon">
              <CircleHelp size={19} />
            </span>
            <strong>A story worth trusting</strong>
            <p>
              Clear attribution, useful context and original reporting make
              every story stronger.
            </p>
            <Link to="/standards">
              Our publishing checklist
              <ArrowRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
      <section className="start-story">
        <div className="start-symbol">
          <BookOpen size={27} />
        </div>
        <div>
          <span className="overline">SOMETHING WORTH SHARING?</span>
          <h2>Give the next story a place to begin.</h2>
          <p>
            Write in English, Hindi, or both. Shape the story before it goes
            live.
          </p>
        </div>
        <Link to="/stories/new" className="btn">
          Open the editor
          <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}

export function Stories() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [section, setSection] = useState("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [archiving, setArchiving] = useState(null);
  const pendingArchives = useRef(new Map());
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page, pageSize: 20, q: query,
      status: status === "all" ? "" : status, section: section === "all" ? "" : section });
    const timer = setTimeout(() => {
      api(`/admin/articles?${params}`, { signal: controller.signal })
        .then(d => { if (!controller.signal.aborted) setData(d); })
        .catch(e => { if (e.name !== "AbortError") { setError(e.message); setData(null); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, query, status, section, revision]);
  const refresh = () => { setLoading(true); setError(""); setRevision(n => n + 1); };
  const filter = (setter, value) => { setter(value); setPage(1); setLoading(true); setError(""); };
  async function archive(article) {
    if (archiving) return;
    setArchiving(article.id);
    setError("");
    const storageKey = `dj-archive-${article.id}`;
    let previous = pendingArchives.current.get(article.id);
    try { previous ||= JSON.parse(localStorage.getItem(storageKey)); } catch { /* Optional recovery. */ }
    const mutation = previous || mutationFor(JSON.stringify({ updatedAt: article.updatedAt }));
    pendingArchives.current.set(article.id, mutation);
    try { localStorage.setItem(storageKey, JSON.stringify(mutation)); } catch { /* Session key remains available. */ }
    try {
      await api(`/admin/articles/${article.id}`, { method: "DELETE", body: mutation.body,
        headers: { "Idempotency-Key": mutation.key } });
      pendingArchives.current.delete(article.id);
      try { localStorage.removeItem(storageKey); } catch { /* Optional recovery. */ }
      setNotice("Story archived. Open it to restore it as a draft.");
      refresh();
    } catch (e) {
      if (!e.uncertain) {
        pendingArchives.current.delete(article.id);
        try { localStorage.removeItem(storageKey); } catch { /* Optional recovery. */ }
      }
      setError(e.message + (e.uncertain ? " Archive result is unknown. Retry Archive to check the same request safely." : ""));
    } finally { setArchiving(null); }
  }
  const articles = data?.articles;
  return (
    <>
      <PageHeader
        eyebrow="THE EDITORIAL LIBRARY"
        heading="Every story starts somewhere."
        description="Organize, refine and publish your coverage."
      >
        <Link to="/stories/new" className="btn primary">
          <Plus size={17} />
          Create a story
        </Link>
      </PageHeader>
      <Alert error={error} />
      <p role="status" className="success-text">
        {notice}
      </p>
      <section className="panel">
        <div className="story-tabs">
          {["all", "published", "draft", "review", "scheduled", "archived"].map(
            (s) => (
              <button
                key={s}
                className={status === s ? "selected" : ""}
                aria-pressed={status === s}
                onClick={() => { if (s !== status) filter(setStatus, s); }}
              >
                {s === "all" ? "All stories" : s}
                <span>
                  {data ? (data.counts[s] ?? 0) : "—"}
                </span>
              </button>
            ),
          )}
        </div>
        <div className="table-toolbar">
          <label className="filter-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => filter(setQuery, e.target.value)}
              placeholder="Find a story or author…"
              aria-label="Find a story or author"
            />
          </label>
          <label className="filter-section">
            <Settings2 size={15} />
            <select
              aria-label="Filter by section"
              value={section}
              onChange={(e) => filter(setSection, e.target.value)}
            >
              <option value="all">All sections</option>
              {sections.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <span className="result-count">{data?.pagination.total ?? "—"} stories</span>
        </div>
        {loading ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>STORY</th>
                  <th>STATUS</th>
                  <th>LANGUAGE</th>
                  <th>LAST UPDATED</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles?.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link className="table-story" to={`/stories/${a.id}`}>
                        {a.image && (
                          <img src={a.image} alt="" width="64" height="48" />
                        )}
                        <div>
                          <span className="overline">{a.category}</span>
                          <strong>{storyTitle(a)}</strong>
                          <small>{a.author}</small>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    <td>
                      <div className="language-tags">
                        {Object.entries(a.translations)
                          .filter(([, t]) => t.title)
                          .map(([l]) => (
                            <span key={l}>{l === "hi" ? "हिन्दी" : "EN"}</span>
                          ))}
                      </div>
                    </td>
                    <td className="date-cell">{formatDate(a.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/stories/${a.id}`} className="subtle-link">
                          Edit
                          <ChevronRight size={13} />
                        </Link>
                        {a.status !== "archived" && (
                          <button
                            className="text-button"
                            disabled={Boolean(archiving)}
                            onClick={() => archive(a)}
                          >
                            {archiving === a.id ? "Archiving…" : "Archive"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {articles?.length === 0 && (
              <div className="empty">
                <Search size={25} />
                <h3>No matching stories</h3>
                <p>Try a different search or start a new draft.</p>
              </div>
            )}
          </div>
        )}
        {!loading && data && <Pagination pagination={data.pagination} onPage={p => { setPage(p); setLoading(true); }} />}
        {error && <button className="btn" onClick={refresh}>Retry loading stories</button>}
      </section>
    </>
  );
}

export function Audience() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const exportController = useRef(null);
  useEffect(() => () => exportController.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page, pageSize: 50, q: query });
    const timer = setTimeout(() => {
      api(`/admin/subscribers?${params}`, { signal: controller.signal })
        .then(d => { if (!controller.signal.aborted) setData(d); })
        .catch(e => { if (e.name !== "AbortError") { setError(e.message); setData(null); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, query, revision]);
  const subscribers = data?.subscribers;
  async function download() {
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true); setError("");
    setExportNotice("Reading subscriber pages… You can cancel this export.");
    try {
      const { subscribers: exported, partial } = await collectSubscribers(api, {
        query, signal: controller.signal,
        onProgress: count => setExportNotice(`Read ${count} subscriber records…`),
      });
      const csv = subscriberCsv(exported);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url;
      a.download = `digital-jagran-newsletter-${partial ? "partial-" : ""}${query ? "filtered-" : ""}export.csv`;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportNotice(`${partial ? "Partial export: limit of 5,000 rows reached." : "Export completed."} ${exported.length} unique records exported${query ? ` matching “${query}”` : ""}. The list may change while pages are read; this is not a point-in-time snapshot.`);
    } catch (e) {
      setExportNotice(e.name === "AbortError" ? "Export cancelled. No file downloaded." : "Export failed. No file downloaded.");
      if (e.name !== "AbortError") setError(e.message);
    } finally { setExporting(false); exportController.current = null; }
  }
  return (
    <>
      <PageHeader
        eyebrow="THE PEOPLE BEHIND THE READS"
        heading="A readership. A relationship."
        description="Your newsletter community, built one reader at a time."
      >
        <button
          className="btn"
          onClick={download}
          disabled={exporting || loading || !subscribers?.length}
        >
          <ArrowDownToLine size={16} />
          {exporting ? "Exporting…" : query ? "Export matching readers" : "Export subscribers"}
        </button>
      </PageHeader>
      <Alert error={error} />
      <p className="export-notice" role="status">{exportNotice}</p>
      {exporting && <button className="btn" onClick={() => exportController.current?.abort()}>Cancel export</button>}
      <div className="audience-banner">
        <span className="metric-icon rose">
          <Mail size={24} />
        </span>
        <div>
          <strong>{data?.pagination.total ?? "—"}</strong>
          <span>{query ? "matching newsletter readers" : "opted-in newsletter readers"}</span>
        </div>
        <p>
          These readers asked to hear from you.
          <br />
          Make every edition worth opening.
        </p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>The reading list</h2>
            <p>
              Email addresses and recorded consent dates. Newsletter delivery is
              not connected yet.
            </p>
          </div>
          <label className="filter-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); setLoading(true); setError(""); }}
              placeholder="Find a reader…"
              aria-label="Find a reader"
            />
          </label>
        </div>
        {loading ? (
          error ? null : (
            <Loading />
          )
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>EMAIL ADDRESS</th>
                  <th>CONSENT RECORDED</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {subscribers?.map((s) => (
                    <tr key={s.email}>
                      <td>{s.email}</td>
                      <td>{formatDate(s.createdAt)}</td>
                      <td>
                        <span className="status status-published">
                          <i />
                          Opted in
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {subscribers?.length === 0 && (
              <div className="empty">
                <Users size={28} />
                <h3>Your community starts here.</h3>
                <p>
                  Readers can join through the newsletter form on the
                  publication.
                </p>
              </div>
            )}
          </div>
        )}
        {!loading && data && <Pagination pagination={data.pagination} onPage={p => { setPage(p); setLoading(true); }} />}
        {error && <button className="btn" onClick={() => { setLoading(true); setError(""); setRevision(n => n + 1); }}>Retry loading readers</button>}
      </section>
    </>
  );
}

export function Standards() {
  return (
    <>
      <PageHeader
        eyebrow="QUALITY BEFORE QUANTITY"
        heading="Built to be worth citing."
        description="Good discovery starts with useful, verifiable journalism."
      />
      <div className="standards-grid">
        {[
          [
            ShieldCheck,
            "Evidence comes first",
            "Verify factual claims. Link to original documents and primary sources where appropriate. Explain uncertainty and record substantive corrections.",
          ],
          [
            Users,
            "Make authorship clear",
            "Use a truthful byline and a relevant biography. Show publication and update times. Distinguish reporting, opinion and sponsored material.",
          ],
          [
            Globe2,
            "Two languages, real equivalents",
            "Publish complete translations. Every language gets its own URL, metadata and reciprocal language link only when the translation exists.",
          ],
          [
            Search,
            "Readable by people and crawlers",
            "The server delivers article text and metadata in the first response. Published stories appear in sitemaps. Drafts and private newsroom data stay outside public responses.",
          ],
          [
            BookOpen,
            "Give readers the context",
            "Write an informative headline and a useful summary. Keep paragraphs readable. Explain what the source material establishes and what remains unknown.",
          ],
          [
            CheckCircle2,
            "Discoverable, without promises",
            "Valid NewsArticle data and crawler access support discovery. Google and AI systems decide what to index and cite. No invented authority scores or citation guarantees.",
          ],
        ].map(([Icon, heading, body]) => (
          <section className="panel standard" key={heading}>
            {createElement(Icon, { size: 22 })}
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
