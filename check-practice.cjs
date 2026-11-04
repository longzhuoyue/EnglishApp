const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { nextInterval, nextReview } = require("./notebook.js");

const html = fs.readFileSync("index.html", "utf8");
const makeElement = () => ({ children: [], style: {}, hidden: false, textContent: "",
  append(...items) { this.children.push(...items); },
  replaceChildren(...items) { this.children = items; } });
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], makeElement()]));
const values = new Map();
const context = vm.createContext({ document: { body: { style: {} },
  getElementById: id => { assert.ok(ids[id], `Missing element ${id}`); return ids[id]; },
  createElement: makeElement, addEventListener() {} },
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
  window: {}, nextInterval, nextReview, Date, Math, confirm: () => true, alert() {} });
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

ids["listening-open"].onclick();
const first = ids["listening-content"].children.find(item => item.textContent.includes("打招呼"));
first.onclick();
assert.equal(ids["listening-content"].children.some(item => item.textContent.includes("早上好，米娅")), false);
const answer = ids["listening-content"].children.find(item => item.textContent === "早上");
answer.onclick();
assert.equal(ids["listening-content"].children.some(item => item.textContent.includes("早上好，米娅")), true);
assert.equal(JSON.parse(values.get("wordspring-listening-v1"))[0], "a1");
console.log("WordSpring practice checks passed");
