const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const makeElement = () => ({
  children: [], style: {}, hidden: false, value: "", textContent: "",
  append(...items) { this.children.push(...items); },
  setAttribute() {}, scrollIntoView() {}, blur() {}
});
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], makeElement()]));
ids["teacher-mode"].value = "ask";
ids["translate-direction"].value = "zh-en";
const calls = [];
const context = vm.createContext({
  document: { body: { style: {} }, getElementById: id => {
    assert.ok(ids[id], `Missing page element: ${id}`);
    return ids[id];
  }, createElement: makeElement },
  localStorage: { getItem: () => JSON.stringify({ passcode: "test-only" }) },
  window: {}, navigator: {}, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    const result = url.endsWith("/teach")
      ? body.mode === "ask"
        ? { source: "为什么 go 变成 went？", answer: "go 的过去式是 went。", example: "I went home.", meaning: "我回家了。" }
        : { source: "I goed home.", corrected: "I went home.", reason: "过去式是 went。", reply: "Where did you go?", hint: "你去了哪里？" }
      : url.endsWith("/translate") ? { source: body.text, translation: "Hello." } : { answer: "Hello! How are you?\n中文提示：你好吗？" };
    return { ok: true, json: async () => result };
  }
});
vm.runInContext(fs.readFileSync("ai-chat.js", "utf8"), context);
const allText = node => [node.textContent, ...node.children.map(allText)].join(" ");

(async () => {
  ids["teacher-open"].onclick();
  assert.equal(ids["ai-title"].textContent, "AI 英语老师");
  ids["ai-input"].value = "为什么 go 变成 went？";
  await ids["ai-send"].onclick();
  assert.equal(calls[0].body.mode, "ask");
  assert.match(allText(ids["teacher-ask-history"]), /I went home/);

  ids["teacher-mode"].value = "correct";
  ids["teacher-mode"].onchange();
  ids["ai-input"].value = "I goed home.";
  await ids["ai-send"].onclick();
  assert.equal(calls[1].body.mode, "correct");
  assert.equal(calls[1].body.messages.length, 1);
  assert.match(allText(ids["teacher-correct-history"]), /I went home/);
  assert.match(allText(ids["teacher-correct-history"]), /过去式是 went/);

  ids["ai-close"].onclick();
  ids["ai-open"].onclick();
  ids["ai-input"].value = "Hello";
  await ids["ai-send"].onclick();
  assert.ok(calls[2].url.endsWith("/chat"));
  assert.equal(calls[2].body.messages.length, 1);

  ids["ai-close"].onclick();
  ids["translate-open"].onclick();
  ids["ai-input"].value = "你好";
  await ids["ai-send"].onclick();
  assert.ok(calls[3].url.endsWith("/translate"));
  assert.equal(ids["translation-source"].textContent, "你好");
  assert.equal(ids["translation-text"].textContent, "Hello.");
  console.log("WordSpring AI page checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
