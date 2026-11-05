const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { A1_CHAPTERS, A1_UNITS } = require("./course-data.js");
const { COURSE_KEY, freshCourse, validCourse } = require("./course.js");

assert.equal(A1_CHAPTERS.length, 6);
assert.equal(A1_UNITS.length, 24);
assert.equal(new Set(A1_UNITS.map(unit => unit.title)).size, 24);
assert.deepEqual(A1_CHAPTERS.map((_, i) => A1_UNITS.filter(unit => unit.chapter === i).length), [4, 4, 4, 4, 4, 4]);
for (const unit of A1_UNITS) {
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
}
assert.equal(validCourse(freshCourse()), true);
assert.equal(validCourse({ ...freshCourse(), completed: [24] }), false);

const html = fs.readFileSync("index.html", "utf8");
const makeElement = () => {
  const el = { children: [], hidden: false, value: "", className: "", id: "",
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...items) { this.children = items; },
    setAttribute() {}, click() { assert.equal(typeof this.onclick, "function"); this.onclick(); } };
  let text = "", markup = "";
  Object.defineProperty(el, "textContent", { get: () => text, set: value => { text = value; el.children = []; } });
  Object.defineProperty(el, "innerHTML", { get: () => markup, set: value => { markup = value; el.children = []; } });
  return el;
};
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], makeElement()]));
const lookup = id => ids[id] || ids["course-content"].children.find(el => el.id === id) || null;
const values = new Map();
let now = 1700000000000;
const context = vm.createContext({ document: { getElementById: lookup, createElement: makeElement },
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
  window: {}, Date: { now: () => now }, speechSynthesis: { cancel() {}, speak() {} },
  SpeechSynthesisUtterance: function (text) { this.text = text; } });
vm.runInContext(fs.readFileSync("course-data.js", "utf8"), context);
vm.runInContext(fs.readFileSync("course.js", "utf8"), context);
const panel = ids["course-content"], actions = ids["course-actions"];
const progress = () => JSON.parse(values.get(COURSE_KEY));
const choose = answer => { const b = panel.children.find(el => el.className === "choice" && el.textContent === answer); assert.ok(b, answer); b.click(); };

ids["course-open"].click();
assert.equal(ids["course-view"].hidden, false);
actions.children[0].click();
for (let i = 0; i < 24; i++) {
  const unit = A1_UNITS[i];
  assert.equal(progress().cursor.unit, i);
  actions.children[0].click();
  for (const [, zh] of unit.words) choose(zh);
  choose(unit.listen.options[unit.listen.answer]); actions.children[0].click();
  choose(unit.grammar.options[unit.grammar.answer]); actions.children[0].click();
  choose(unit.reading.options[unit.reading.answer]); actions.children[0].click();
  const input = panel.children.find(el => el.maxLength === 600);
  assert.ok(input, unit.title);
  input.value = unit.output.sample;
  actions.children[0].click();
  assert.equal(progress().completed.length, i + 1);
  if (i < 23) actions.children[0].click();
}
assert.equal(progress().cursor, null);
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
