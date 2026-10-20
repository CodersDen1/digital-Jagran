import { useEffect, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { api, publicUrl } from "./newsroom/api";
import { Alert, Loading, Logo } from "./newsroom/ui";
import { Overview, Stories, Audience, Standards } from "./newsroom/Workspace";
import Editor from "./newsroom/Editor";
function Login({ onLogin }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Logo />
        <div>
          <span className="overline">THE WORK BEHIND THE WORDS</span>
          <h1>
            Good journalism
            <br />
            starts <em>here.</em>
          </h1>
          <p>
            A considered space to shape stories,
            <br />
            connect perspectives and publish with confidence.
          </p>
        </div>
        <span className="login-foot">DIGITAL JAGRAN · EDITORIAL WORKSPACE</span>
      </div>
      <main className="login-form-wrap">
        <form onSubmit={submit} className="login-form">
          <span className="login-icon">
            <BookOpen size={25} />
          </span>
          <h2>Welcome to the newsroom</h2>
          <p>Sign in to continue your editorial work.</p>
          <Alert error={error} />
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              placeholder="you@digitaljagran.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <div className="login-secure">
            <ShieldCheck size={14} />
            Protected editorial workspace
          </div>
        </form>
      </main>
    </div>
  );
}
function Shell({ user, onLogout }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
      onLogout();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link to="/" onClick={() => setMenu(false)}>
          <Logo />
        </Link>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Newsroom">
          <NavLink to="/" end onClick={() => setMenu(false)}>
            <LayoutDashboard size={17} />
            Overview
          </NavLink>
          <NavLink to="/stories" onClick={() => setMenu(false)}>
            <FileText size={17} />
            Stories
          </NavLink>
          <NavLink to="/audience" onClick={() => setMenu(false)}>
            <Users size={17} />
            Audience
          </NavLink>
          <NavLink to="/standards" onClick={() => setMenu(false)}>
            <ShieldCheck size={17} />
            Publishing standards
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <a
            href={publicUrl()}
            target="_blank"
            rel="noreferrer"
          >
            <Globe2 size={16} />
            View publication
            <ExternalLink size={13} />
          </a>
          <div className="workspace-note">
            <span className="green-dot" />
            YOUR EDITORIAL SPACE
            <p>
              Every good story begins
              <br />
              with a better question.
            </p>
          </div>
          <div className="user-card">
            <span className="avatar">E</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <button className="icon-btn" aria-label="Sign out" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-content">
        <header className="workspace-topbar">
          <div>
            <button
              className="icon-btn menu-toggle"
              aria-label="Toggle menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={19} /> : <Menu size={19} />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>Editorial desk</strong>
          </div>
          <span className="editor-mode">
            <i />
            Editor access
          </span>
        </header>
        <main id="workspace-main" className="workspace-main" tabIndex={-1}>
          <Alert error={error} />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/stories/new" element={<Editor key="new" />} />
            <Route path="/stories/:id" element={<EditorRoute />} />
            <Route path="/audience" element={<Audience />} />
            <Route path="/standards" element={<Standards />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Workspace page not found</h1>
                  <Link to="/">Back to overview</Link>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
function EditorRoute() {
  const { id } = useParams();
  return <Editor key={id} />;
}
function Session() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("newsroom-session-expired", expired);
    return () => window.removeEventListener("newsroom-session-expired", expired);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api("/auth/me", { signal: controller.signal })
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e.status !== 401 && e.name !== "AbortError") setError(e.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="connection-error">
        <Alert error={error} />
        <p>Start the Digital Jagran server, then reload this page.</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Reconnect
        </button>
      </div>
    );
  return user ? (
    <Shell user={user} onLogout={() => setUser(null)} />
  ) : (
    <Login onLogin={setUser} />
  );
}
export default function App() {
  return (
    <BrowserRouter basename="/newsroom">
      <Session />
    </BrowserRouter>
  );
}
