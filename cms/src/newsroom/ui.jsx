export function Status({ value }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {value}
    </span>
  );
}
export function Alert({ error }) {
  return error ? (
    <div className="alert" role="alert">
      {error}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your newsroom…
    </div>
  );
}
export function Pagination({ pagination, onPage }) {
  if (!pagination) return null;
  const { page, total, hasMore } = pagination;
  return <nav className="pagination" aria-label="Results pages">
    <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span role="status">Page {page} · {total} results</span>
    <button className="btn" disabled={!hasMore} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}
export function Logo() {
  return (
    <span className="cms-logo">
      <b>ज</b>
      <span>
        digital<span>jagran</span>
        <small>THE NEWSROOM</small>
      </span>
    </span>
  );
}
export function Field({ label, note, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {note && <small>{note}</small>}
    </label>
  );
}
export function PageHeader({ eyebrow, heading, description, children }) {
  return (
    <div className="page-header">
      <div>
        <span className="overline">{eyebrow}</span>
        <h1>{heading}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
