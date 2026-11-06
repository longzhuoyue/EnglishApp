const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { A1_CHAPTERS, A1_UNITS, A1_MORE, A1_LISTENING_MORE } = require("./course-data.js");
const { COURSE_KEY, freshCourse, validCourse } = require("./course.js");

assert.equal(A1_CHAPTERS.length, 6);
assert.equal(A1_UNITS.length, 24);
assert.equal(A1_MORE.length, 24);
assert.equal(A1_LISTENING_MORE.length, 24);
assert.equal(new Set(A1_UNITS.map(unit => unit.title)).size, 24);
assert.deepEqual(A1_CHAPTERS.map((_, i) => A1_UNITS.filter(unit => unit.chapter === i).length), [4, 4, 4, 4, 4, 4]);
for (const [i, unit] of A1_UNITS.entries()) {
  assert.equal(unit.words.length, 6, unit.title);
  assert.equal(new Set(unit.words.map(pair => pair[0])).size, 6, unit.title);
  assert.ok(unit.goal && unit.rule && unit.output.prompt && unit.output.sample, unit.title);
  assert.ok(unit.examples.length >= 2 && unit.dialogue.length >= 3, unit.title);
  assert.ok(unit.reading.en.split(/\s+/).length >= 20 && unit.reading.zh, unit.title);
  for (const key of ["listen", "grammar", "reading", "review"]) {
    const q = unit[key];
    assert.ok(q.prompt && Array.isArray(q.options) && q.options.length === 3, `${unit.title}/${key}`);
    assert.equal(new Set(q.options).size, 3, `${unit.title}/${key}`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3, `${unit.title}/${key}`);
  }
  assert.equal(A1_MORE[i].length, 3, unit.title);
  for (const q of A1_MORE[i]) {
    assert.ok(q.prompt && q.options.length === 3 && new Set(q.options).size === 3, unit.title);
    assert.equal(q.answer, 0, unit.title);
  }
  assert.equal(new Set(unit.dialogue.slice(0, 3).map(line => line[1])).size, 3, unit.title);
  assert.equal(A1_LISTENING_MORE[i].length, 2, unit.title);
  const clips = [{ dialogue: unit.dialogue, ...unit.listen }, ...A1_LISTENING_MORE[i]];
  assert.equal(new Set(clips.map(clip => clip.dialogue.map(line => line[1]).join(" "))).size, 3, unit.title);
  for (const clip of clips) {
    assert.ok(clip.dialogue.length >= 2 && clip.prompt, unit.title);
    assert.ok(clip.dialogue.every(line => line.length === 3 && line[1] && line[2]), unit.title);
    assert.equal(new Set(clip.options).size, 3, unit.title);
    assert.ok(Number.isInteger(clip.answer) && clip.answer >= 0 && clip.answer < 3, unit.title);
  }
}
assert.equal(validCourse(freshCourse()), true);
assert.equal(validCourse({ ...freshCourse(), completed: [24] }), false);
const oldProgress = { ...freshCourse(), cursor: { unit: 2, step: 3, word: 0 } };
delete oldProgress.corrections;
assert.equal(validCourse(oldProgress), true);

const html = fs.readFileSync("index.html", "utf8");
const makeElement = () => {
  const el = { children: [], hidden: false, value: "", className: "", id: "",
    appendChild(child) { this.children.push(child); child.parent = this; return child; },
    replaceChildren(...items) { this.children = items; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); },
    setAttribute() {}, click() { assert.equal(typeof this.onclick, "function"); this.onclick(); } };
  let text = "", markup = "";
  Object.defineProperty(el, "textContent", { get: () => text, set: value => { text = value; el.children = []; } });
  Object.defineProperty(el, "innerHTML", { get: () => markup, set: value => { markup = value; el.children = []; } });
  return el;
};
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], makeElement()]));
const lookup = id => ids[id] || ids["course-content"].children.find(el => el.id === id) || null;
const values = new Map([["wordspring-ai-settings-v1", JSON.stringify({ passcode: "test-only" })]]);
let now = 1700000000000;
let gradeCalls = 0, lastGrade;
const spoken = [];
const context = vm.createContext({ document: { getElementById: lookup, createElement: makeElement, createTextNode: text => ({ textContent: text }) },
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
  window: { speechSynthesis: true, wordSpringNotebook: { save() { return true; } } }, Date: { now: () => now }, speechSynthesis: { cancel() {}, speak(utterance) { spoken.push(utterance.text); } },
  SpeechSynthesisUtterance: function (text) { this.text = text; }, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => { assert.equal(url, "https://wordspring-ai-pages.pages.dev/teach");
    lastGrade = JSON.parse(options.body); gradeCalls++;
    return gradeCalls === 2 ? { ok: false, json: async () => ({ error: "测试失败" }) } :
      { ok: true, json: async () => ({ corrected: "Hello! See you later.", meaning: "你好！回头见。",
        reason: "问候时用 Hello。", reply: "How are you?", hint: "你好吗？" }) }; } });
vm.runInContext(fs.readFileSync("course-data.js", "utf8"), context);
vm.runInContext(fs.readFileSync("course.js", "utf8"), context);
const panel = ids["course-content"], actions = ids["course-actions"];
const progress = () => JSON.parse(values.get(COURSE_KEY));
const choose = answer => { const b = panel.children.find(el => el.className === "choice" && el.textContent === answer); assert.ok(b, answer); b.click(); };

(async () => {

ids["course-open"].click();
assert.equal(ids["course-view"].hidden, false);
actions.children[0].click();
for (let i = 0; i < 24; i++) {
  const unit = A1_UNITS[i];
  assert.equal(progress().cursor.unit, i);
  actions.children[0].click();
  for (const [, zh] of unit.words) choose(zh);
  const listening = [{ dialogue: unit.dialogue, ...unit.listen }, ...A1_LISTENING_MORE[i]];
  for (const clip of listening) {
    const play = panel.children.find(el => el.textContent === "♪ 播放这段对话"); assert.ok(play);
    play.click(); assert.equal(spoken.at(-1), clip.dialogue.map(line => line[1]).join(" "));
    choose(clip.options[clip.answer]);
    assert.ok(panel.children.some(el => el.children.length === clip.dialogue.length));
    actions.children[0].click();
  }
  for (const q of [unit.grammar, A1_MORE[i][0], unit.review]) { choose(q.options[q.answer]); actions.children[0].click(); }
  for (const q of [unit.reading, ...A1_MORE[i].slice(1)]) { choose(q.options[q.answer]); actions.children[0].click(); }
  const input = panel.children.find(el => el.maxLength === 600);
  assert.ok(input, unit.title);
  input.value = unit.output.sample;
  if (i === 0) {
    input.value = "I am hello";
    await actions.children[0].onclick();
    assert.equal(progress().corrections[0].corrected, "Hello! See you later.");
    assert.ok(panel.children.some(el => el.id === "course-correction"));
    assert.equal(lastGrade.mode, "correct");
    assert.equal(lastGrade.messages[1].content, "I am hello");
    assert.ok(lastGrade.messages[0].content.includes(unit.output.prompt));
    input.value = "Hello! See you later."; input.oninput();
    await actions.children[0].onclick();
    assert.equal(progress().outputs[0], "Hello! See you later.");
    assert.equal(progress().corrections[0].source, "I am hello");
  }
  actions.children[1].click();
  assert.equal(progress().completed.length, i + 1);
  if (i < 23) actions.children[0].click();
}
assert.equal(progress().cursor, null);
assert.equal(validCourse(progress()), true);
actions.children[0].click();
assert.ok(actions.children.some(el => el.textContent === "阶段综合测评"));
actions.children.find(el => el.textContent === "阶段综合测评").click();
const examUnits = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
examUnits.forEach((unitIndex, questionIndex) => { const q = questionIndex % 2 ? A1_UNITS[unitIndex].grammar : A1_UNITS[unitIndex].review; choose(q.options[q.answer]); });
panel.children.find(el => el.maxLength === 600).value = "Hi, I'm Lin. Let's meet at three at the cafe. I need some water, please.";
actions.children[0].click();
assert.equal(progress().exam.score, 12);

now += 86400000;
actions.children[0].click();
assert.ok(actions.children.some(el => el.textContent.includes("复习到期单元")));
actions.children.find(el => el.textContent.includes("复习到期单元")).click();
choose(A1_UNITS[0].grammar.options[0]);
choose(A1_UNITS[0].review.options[0]);
assert.equal(progress().review[0].passes, 1);
now += 3 * 86400000;
actions.children[0].click();
actions.children.find(el => el.textContent.includes("复习到期单元")).click();
choose(A1_UNITS[0].grammar.options[0]);
choose(A1_UNITS[0].review.options[0]);
assert.equal(progress().review[0].passes, 2);
ids["course-close"].click();
assert.equal(ids["course-view"].hidden, true);
console.log("WordSpring A1 course checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
