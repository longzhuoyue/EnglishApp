const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { nextInterval, nextReview } = require("./notebook.js");

const html = fs.readFileSync("index.html", "utf8");
assert.ok(html.indexOf('aria-label="我的错句本"') > html.indexOf('aria-label="中英翻译"'));
const makeElement = () => ({ children: [], style: {}, hidden: false, textContent: "",
  append(...items) { this.children.push(...items); },
  replaceChildren(...items) { this.children = items; } });
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], makeElement()]));
const values = new Map([["wordspring-listening-v1", '["a1"]'], ["wordspring-ai-settings-v1", '{"passcode":"test-only"}']]);
let listeningRequest = null;
const context = vm.createContext({ document: { body: { style: {} },
  getElementById: id => { assert.ok(ids[id], `Missing element ${id}`); return ids[id]; },
  createElement: makeElement, addEventListener() {} },
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
  window: {}, nextInterval, nextReview, Date, Math, confirm: () => true, alert() {},
  AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => {
    listeningRequest = { url, options };
    return { ok: true, json: async () => ({ level: "入门", title: "新对话", lines: [["A", "Good morning.", "早上好。"], ["B", "Hello, Mia.", "你好，米娅。"], ["A", "How are you?", "你好吗？"]],
      question: "他们什么时候见面？", options: ["早上", "晚上", "周末"], answer: 0 }) };
  } });
vm.runInContext(fs.readFileSync("notebook.js", "utf8"), context);
vm.runInContext(fs.readFileSync("listening.js", "utf8"), context);

assert.equal(context.wordSpringNotebook, undefined);
assert.equal(context.window.wordSpringNotebook.save({ source: "I goed home.", corrected: "I went home.", meaning: "我回家了。", reason: "过去式是 went。" }), true);
assert.equal(JSON.parse(values.get("wordspring-notebook-v1")).length, 1);
ids["notebook-open"].onclick();
ids["notebook-actions"].children[0].onclick();
assert.match(ids["notebook-content"].children[1].textContent, /我回家了/);
ids["notebook-actions"].children[0].onclick();
assert.match(ids["notebook-content"].children[3].textContent, /I went home/);
ids["notebook-actions"].children[1].onclick();
assert.equal(JSON.parse(values.get("wordspring-notebook-v1"))[0].intervalDays, 1);
assert.equal(ids["notebook-summary"].textContent.includes("0 句待复习"), true);

(async () => {
  ids["listening-open"].onclick();
  const first = ids["listening-content"].children.find(item => item.textContent.includes("入门"));
  await first.onclick();
  assert.ok(listeningRequest.url.endsWith("/listening"));
  assert.equal(JSON.parse(listeningRequest.options.body).level, "入门");
  assert.equal(listeningRequest.options.headers["x-wordspring-passcode"], "test-only");
  assert.equal(ids["listening-content"].children.some(item => item.textContent.includes("早上好。")), false);
  const answer = ids["listening-content"].children.find(item => item.textContent === "早上");
  answer.onclick();
  assert.equal(ids["listening-content"].children.some(item => item.textContent.includes("早上好。")), true);
  assert.equal(JSON.parse(values.get("wordspring-listening-v1")).completed, 2);
  assert.equal(ids["listening-actions"].children[1].textContent, "再生成一段 →");
  await ids["listening-actions"].children[1].onclick();
  assert.deepEqual(JSON.parse(listeningRequest.options.body).avoid, ["新对话"]);
  console.log("WordSpring practice checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
