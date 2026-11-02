const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { nextInterval, nextReview, isDue } = require("./app.js");
const { cleanAnswer, nextCourseDay, validProgress } = require("./course.js");
const { speechMatches, validSpeakingProgress } = require("./speaking.js");

const words = JSON.parse(fs.readFileSync(path.join(__dirname, "words.json"), "utf8"));
const lessons = JSON.parse(fs.readFileSync(path.join(__dirname, "lessons.json"), "utf8"));
const speaking = JSON.parse(fs.readFileSync(path.join(__dirname, "speaking.json"), "utf8"));
assert.equal(words.length, 20);
assert.equal(new Set(words.map(word => word.english)).size, words.length);
assert.deepEqual([0, 1, 3, 7, 15].map(days => nextInterval(days, true)), [1, 3, 7, 15, 30]);
assert.equal(nextInterval(7, false), 0);
assert.equal(nextReview(1000, 7, false), 601000);
assert.equal(isDue({ nextReview: 2000 }, 1999), false);
assert.equal(isDue({ nextReview: 2000 }, 2000), true);
assert.equal(isDue({ nextReview: "invalid" }, 2000), true);
assert.equal(lessons.length, 7);
assert.deepEqual(lessons.map(lesson => lesson.kind), ["lesson", "lesson", "lesson", "lesson", "lesson", "review", "review"]);
for (const [index, lesson] of lessons.entries()) {
  assert.equal(lesson.id, index + 1);
  assert.equal(lesson.phrases.length, 3);
  assert.ok(lesson.dialogue.length >= 4);
  for (const question of [lesson.listen, lesson.reading]) {
    assert.ok(question.options[question.answer]);
  }
  assert.ok(lesson.writing.examples.length);
}
assert.equal(cleanAnswer("I'm Lin!"), cleanAnswer("Im Lin."));
assert.equal(nextCourseDay(lessons, [1, 2]).id, 3);
assert.equal(speaking.length, 7);
for (const [day, scene] of speaking.entries()) {
  assert.equal(scene.id, day + 1);
  assert.equal(scene.items.length, 8);
  assert.ok(scene.items.some(item => item.mode === "echo"));
  assert.ok(scene.items.some(item => item.mode === "reply"));
  for (const item of scene.items) {
    assert.ok(item.en && item.zh);
    if (item.mode === "reply") assert.ok(item.prompt);
  }
}
assert.equal(speechMatches({ en: "I'm fine, thank you." }, "I am fine thank you"), true);
assert.equal(speechMatches({ en: "Good morning." }, "good evening"), false);
assert.equal(validSpeakingProgress({ cursor: { 1: 3 }, practiced: { 1: [0, 1, 2] }, sessions: 0 }), true);
assert.equal(validSpeakingProgress({ cursor: { 1: 9 }, practiced: {}, sessions: 0 }), false);
assert.equal(validProgress({ completed: [1], steps: { 1: 5 }, answers: {}, reviews: { "1:0": { intervalDays: 1, nextReview: 1000 } } }), true);
assert.equal(validProgress({ completed: [1, 1], steps: {}, answers: {}, reviews: {} }), false);
assert.equal(validProgress({ completed: [], steps: [], answers: {}, reviews: {} }), false);
for (const file of ["index.html", "app.js", "course.js", "speaking.js", "lessons.json", "speaking.json", "words.json", "manifest.webmanifest", "icon-180.png", "icon-512.png", "sw.js"]) {
  assert.ok(fs.existsSync(path.join(__dirname, file)), `${file} is missing`);
}
console.log("WordSpring web checks passed");

// Exercise the real startup code on a browser surface missing Object.values.
// The previous failure showed all 20 words but left stats blank and the start button disabled.
const ids = Object.fromEntries(
  ["start", "start-title", "start-detail", "due-count", "today-count", "total-count", "library-count", "library", "close", "reveal", "again", "remember", "speak-current"].map(id => [id, element()])
);
function element() {
  return { textContent: "", disabled: true, style: {}, children: [], addEventListener() {}, setAttribute() {}, append(...nodes) { this.children.push(...nodes); } };
}
const context = vm.createContext({
  document: { getElementById: id => ids[id], createElement: element, addEventListener() {} },
  navigator: {},
  localStorage: { getItem: () => null },
  setInterval() {},
  fetch: async () => ({ ok: true, json: async () => words }),
  console
});
vm.runInContext("Object.values = undefined", context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), context);
setImmediate(() => {
  assert.equal(ids.library.children.length, 20);
  assert.equal(ids["due-count"].textContent, 20);
  assert.equal(ids["start-title"].textContent, "开始今日学习");
  assert.equal(ids.start.disabled, false);
  console.log("WordSpring startup check passed");
});
