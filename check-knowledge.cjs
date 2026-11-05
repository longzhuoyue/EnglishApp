const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { validKnowledge, freshKnowledge } = require("./knowledge.js");

const html = fs.readFileSync("index.html", "utf8");
const makeElement = () => ({ children: [], style: {}, hidden: false, textContent: "", value: "",
  append(...items) { this.children.push(...items); },
  replaceChildren(...items) { this.children = items; }, click() { this.onclick(); } });
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], makeElement()]));
const legacy = freshKnowledge();
delete legacy.wordsCycleVersion;
delete legacy.seenWords;
legacy.completed.words = 30;
legacy.recent.words = ["旧组一", "旧组二", "旧组三", "旧组四", "旧组五"];
const values = new Map([["wordspring-ai-settings-v1", '{"passcode":"test-only"}'],
  ["wordspring-knowledge-v1", JSON.stringify(legacy)]]);
const packs = {
  words: { title: "问候", items: ["hello", "bye", "name", "meet", "friend"].map(en => ({ en, zh: "意思", example: `I say ${en}.`, exampleZh: "我说了这个词。" })) },
  grammar: { title: "am / is / are", rule: "I 后用 am。", examples: [{ en: "I am ready.", zh: "我准备好了。" }, { en: "She is happy.", zh: "她很开心。" }],
    questions: [0, 1, 2].map(() => ({ prompt: "I ___ ready.", options: ["am", "is", "are"], answer: 0, explanation: "I 后用 am。" })) },
  translate: { title: "问候", items: ["早上好。", "你好吗？", "再见。"].map(zh => ({ zh, reference: "Good morning.", hint: "使用 morning。" })) },
  reading: { title: "公园", passage: "Mia goes to the park with Ben. They bring lunch and walk around the lake.", translation: "米娅和本去了公园。",
    questions: [0, 1, 2].map(() => ({ prompt: "他们去哪儿？", options: ["公园", "银行", "学校"], answer: 0, explanation: "他们去了公园。" })) }
};
let lastRequest;
let wordVariants = null;
const context = vm.createContext({ document: { body: { style: {} },
  getElementById: id => { assert.ok(ids[id], `Missing element ${id}`); return ids[id]; }, createElement: makeElement },
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
  window: {}, confirm: () => true, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => {
    lastRequest = { url, ...JSON.parse(options.body) };
    const body = lastRequest.action === "check" ? { acceptable: true, feedback: "表达正确。", improved: "Good morning." } :
      lastRequest.mode === "words" && wordVariants ? wordVariants[lastRequest.sequence - 31] : packs[lastRequest.mode];
    return { ok: true, json: async () => body };
  } });
vm.runInContext(fs.readFileSync("knowledge.js", "utf8"), context);
const content = ids["knowledge-content"];
const actions = ids["knowledge-actions"];
const progress = () => JSON.parse(values.get("wordspring-knowledge-v1"));
const overview = () => { ids["knowledge-open"].onclick(); return content; };
const start = async mode => { const index = ["words", "grammar", "translate", "reading"].indexOf(mode); await overview().children[index + 2].onclick(); };

(async () => {
  assert.equal(validKnowledge(freshKnowledge()), true);
  assert.equal(progress().completed.words, 30);
  assert.deepEqual(progress().recent.words, []);
  assert.equal(progress().wordsCycleVersion, 1);
  assert.deepEqual(progress().seenWords, []);
  await start("words");
  assert.equal(lastRequest.mode, "words");
  assert.equal(progress().session.index, 0);
  for (let i = 0; i < 5; i++) { actions.children[0].onclick(); assert.equal(progress().session.result.revealed, true); actions.children[0].onclick(); }
  assert.equal(progress().completed.words, 31);
  assert.deepEqual(progress().seenWords, ["hello", "bye", "name", "meet", "friend"]);

  await start("grammar");
  assert.equal(lastRequest.topic, 0);
  for (let i = 0; i < 3; i++) { content.children.find(el => el.textContent === "am").onclick(); actions.children[0].onclick(); }
  assert.equal(progress().completed.grammar, 1);
  assert.equal(progress().grammarIndex, 1);

  await start("translate");
  ids["knowledge-answer"] = content.children.find(el => el.id === "knowledge-answer");
  ids["knowledge-answer"].value = "Good morning";
  actions.children[0].onclick();
  assert.equal(progress().session.result.draft, "Good morning");
  ids["knowledge-answer"] = content.children.find(el => el.id === "knowledge-answer");
  assert.equal(ids["knowledge-answer"].value, "Good morning");
  await actions.children[1].onclick();
  assert.equal(lastRequest.action, "check");
  assert.equal(progress().session.result.acceptable, true);
  ids["knowledge-close"].onclick();
  assert.equal(ids["knowledge-view"].hidden, true);
  overview();
  assert.ok(content.children.some(el => el.textContent.includes("继续上次")));
  content.children.at(-1).onclick();
  assert.ok(content.children.some(el => el.textContent.includes("参考表达")));
  actions.children[0].onclick();
  assert.equal(progress().session.index, 1);

  await start("reading");
  for (let i = 0; i < 3; i++) { content.children.find(el => el.textContent === "公园" && el.onclick).onclick(); actions.children[0].onclick(); }
  assert.ok(content.children.some(el => el.textContent === packs.reading.translation));
  actions.children[0].onclick();
  assert.equal(progress().completed.reading, 1);

  wordVariants = Array.from({ length: 30 }, (_, i) => ({ title: `实时第 ${i + 1} 组`, items: Array.from({ length: 5 }, (_, j) => {
    const number = i * 5 + j;
    const en = `word${String.fromCharCode(97 + Math.floor(number / 26))}${String.fromCharCode(97 + number % 26)}`;
    return { en, zh: "意思", example: `I say ${en}.`, exampleZh: "我说了这个词。" };
  }) }));
  for (let i = 0; i < 30; i++) {
    await start("words");
    assert.equal(lastRequest.sequence, 31 + i);
    assert.ok(lastRequest.avoidWords.includes("hello"));
    if (i) assert.ok(lastRequest.avoidWords.includes(wordVariants[i - 1].items[0].en));
    for (let word = 0; word < 5; word++) { actions.children[0].onclick(); actions.children[0].onclick(); }
  }
  assert.equal(progress().seenWords.length, 155);
  console.log("WordSpring knowledge checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
