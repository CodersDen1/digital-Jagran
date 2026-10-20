import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../dist-server/entry-server.js";

const article = { id: "one", slug: "test-story", locale: "hi", title: "परीक्षण खबर", summary: "खबर का सारांश", author: "संपादक", category: "india", readingMinutes: 2 };
const data = { path: "/hi/search?q=climate&page=2", kind: "search", query: "climate", locale: "hi", sections: [{ slug: "india", hi: "भारत", en: "India" }], articles: [article], latest: [], breaking: [], pagination: { page: 2, pageSize: 12, total: 30, hasMore: true } };

test("initial SSR listing renders actual page cards and query-preserving links", () => {
  const html = render(data.path, data);
  assert.match(html, /परीक्षण खबर/);
  assert.match(html, /30 नतीजे/);
  assert.match(html, /rel="prev" href="\/hi\/search\?q=climate"/);
  assert.match(html, /rel="next" href="\/hi\/search\?q=climate&amp;page=3"/);
  assert.doesNotMatch(html, /Loading the newsroom/);
});

test("empty out-of-range page still lets readers go back", () => {
  const page = { ...data, articles: [], pagination: { ...data.pagination, hasMore: false } };
  const html = render(page.path, page);
  assert.match(html, /rel="prev"/);
  assert.doesNotMatch(html, /rel="next"/);
});

test("legacy unpaginated listings use the requested slice", () => {
  const page = { ...data, pagination: undefined, articles: Array.from({ length: 25 }, (_, i) => ({ ...article, id: String(i), title: `headline-${i}-end` })) };
  const html = render(page.path, page);
  assert.match(html, /headline-12-end/);
  assert.match(html, /headline-23-end/);
  assert.doesNotMatch(html, /headline-0-end|headline-24-end/);
});
