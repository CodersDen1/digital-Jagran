import test from "node:test";
import assert from "node:assert/strict";
import { updateMetadata } from "../src/newsroom/meta.js";

test("head replacement preserves paginated canonicals and only actual translations", () => {
  const previous = globalThis.document;
  const nodes = [];
  globalThis.document = {
    documentElement: {},
    querySelectorAll: () => [...nodes],
    head: { append: (node) => nodes.push(node) },
    createElement: (tag) => ({ tag, attrs: {}, setAttribute(key, value) { this.attrs[key] = value; }, remove() { nodes.splice(nodes.indexOf(this), 1); } }),
  };
  const base = { path: "/hi/section/india?page=2&utm_source=test", locale: "hi", origin: "https://news.example", kind: "section", category: "india", sections: [{ slug: "india", hi: "भारत", en: "India" }] };
  try {
    updateMetadata(base);
    assert.equal(nodes.find((node) => node.attrs.rel === "canonical").attrs.href, "https://news.example/hi/section/india?page=2");
    assert.equal(nodes.filter((node) => node.attrs.rel === "alternate").length, 2);
    assert.ok(nodes.filter((node) => node.attrs.rel === "alternate").every((node) => node.attrs.href.endsWith("?page=2")));
    updateMetadata({ ...base, path: "/hi/article/story", kind: "article", category: undefined, article: { title: "खबर", slug: "story", availableLocales: ["hi"], sources: [], author: "लेखक" } });
    assert.equal(nodes.filter((node) => node.tag === "title").length, 1);
    assert.equal(nodes.filter((node) => node.attrs.rel === "canonical").length, 1);
    assert.deepEqual(nodes.filter((node) => node.attrs.rel === "alternate").map((node) => node.attrs.hreflang), ["hi"]);
    for (const kind of ["search", "saved", "notfound"]) {
      updateMetadata({ ...base, category: undefined, kind });
      assert.equal(nodes.filter((node) => node.attrs.rel === "alternate").length, 0);
      assert.equal(nodes.find((node) => node.attrs.name === "robots").attrs.content, "noindex,follow");
    }
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});
