# Digital Jagran public client

The active bilingual publication lives in `src/App.jsx`, with SSR in `src/entry-server.jsx` and request/metadata helpers in `src/newsroom/`. Older page and layout components remain for reference and are not mounted by the current entry point.

Run `npm run dev` from this directory for Vite on port 5173; `/api` is proxied to the local backend on port 5001. The development root redirects to `/hi`. Use the backend on port 5001 to inspect initial server-rendered HTML.

Run `npm run build` followed by `npm test` here. Tests cover request deadlines, cancellation, retry bounds, key preservation, API fallback, metadata replacement, and initial HTML pagination. The SSR tests use the just-built `dist-server` bundle. Focused lint for the active implementation is `npx eslint src/App.jsx src/newsroom/*.js tests/*.js`. Full `npm run lint` also includes retained legacy components with existing lint failures.

Public requests use `/api/v1/page` and `/api/v1/newsletter`, falling back once to the legacy path only on a definitive JSON API-route 404. Public `kind: notfound` responses are rendered directly. Each attempt has a ten-second deadline, including the response body. Reads and keyed writes allow two retries for transient failures, with exponential backoff, jitter and Retry-After capped at ten seconds. Cancellation interrupts requests and retry delays. Auth, conflict and validation responses are not retried.

Newsletter submissions use the same Idempotency-Key across automatic retries and uncertain-result resubmissions. Pending keys are kept in sessionStorage, with an in-memory fallback when browser storage is unavailable; success releases the key. Keys cannot survive a reload if sessionStorage is blocked. Route changes cancel submissions. Reading-list storage failures are shown to the reader, and saved cards omit article bodies.

Section/search pages consume bounded backend pagination and expose ordinary previous/next links preserving the search query. Legacy unpaginated responses are sliced locally during the rollout. Server rendering owns the initial head; the client replaces only nodes marked `data-news-head` after navigation. Article language alternates follow `availableLocales`; search, saved and missing pages are not indexed and omit alternates. Section canonical and alternate URLs retain their page number.

No environment files, existing databases, or deployment settings are changed by client tests. Final integrated browser checks belong to the manager chat.
