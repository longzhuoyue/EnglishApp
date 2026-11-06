const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { validNotebook } = require("./notebook.js");
const { validListening } = require("./listening.js");
const { validRoleplayProgress } = require("./ai-chat.js");
const { validKnowledge, freshKnowledge } = require("./knowledge.js");
const { COURSE_KEY, validCourse, freshCourse } = require("./course.js");

const html = fs.readFileSync("index.html", "utf8");
const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], { value: "", textContent: "", select() {} }]));
const data = new Map([["wordspring-notebook-v1", "[]"], ["wordspring-listening-v1", '["a1"]'],
  ["wordspring-roleplay-v1", "[]"], ["wordspring-course-v1", '{"completed":[1]}'],
  ["wordspring-knowledge-v1", JSON.stringify({ ...freshKnowledge(), completed: { words: 2, grammar: 0, translate: 0, reading: 0 } })]]);
let reloaded = false;
const context = vm.createContext({ document: { getElementById: id => elements[id] },
  localStorage: { getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) },
  navigator: { clipboard: { async writeText() {} } }, location: { reload() { reloaded = true; } },
  confirm: () => true, NOTEBOOK_KEY: "wordspring-notebook-v1", LISTENING_KEY: "wordspring-listening-v1",
  ROLEPLAY_KEY: "wordspring-roleplay-v1", KNOWLEDGE_KEY: "wordspring-knowledge-v1",
  COURSE_KEY, validNotebook, validListening, validRoleplayProgress, validKnowledge, freshKnowledge,
  validCourse, freshCourse });
vm.runInContext(fs.readFileSync("backup.js", "utf8"), context);

(async () => {
  await elements["backup-export"].onclick();
  const exported = JSON.parse(elements["backup-text"].value);
  assert.equal(exported.format, "wordspring-backup-v4");
  assert.equal(exported.listening[0], "a1");
  assert.equal(exported.knowledge.completed.words, 2);
  assert.equal("course" in exported, false);
  assert.deepEqual(exported.a1Course, freshCourse());
  assert.equal("passcode" in exported, false);

  elements["backup-text"].value = JSON.stringify({ format: "wordspring-backup-v1", course: {}, wordReviews: {},
    notebook: [], listening: ["b1"], roleplay: [] });
  elements["backup-import"].onclick();
  assert.equal(reloaded, true);
  assert.equal(JSON.parse(data.get("wordspring-listening-v1"))[0], "b1");
  assert.equal(data.has("wordspring-course-v1"), true);
  assert.equal(JSON.parse(data.get("wordspring-knowledge-v1")).completed.words, 2);
  assert.deepEqual(JSON.parse(data.get(COURSE_KEY)), freshCourse());

  reloaded = false;
  const knowledge = { ...freshKnowledge(), completed: { words: 3, grammar: 1, translate: 1, reading: 1 } };
  elements["backup-text"].value = JSON.stringify({ format: "wordspring-backup-v3", notebook: [],
    listening: ["a1"], roleplay: [], knowledge });
  elements["backup-import"].onclick();
  assert.equal(reloaded, true);
  assert.equal(JSON.parse(data.get("wordspring-knowledge-v1")).completed.words, 3);

  const a1Course = { ...freshCourse(), completed: [0], review: { 0: { passes: 1, nextAt: 123456789 } },
    outputs: { 0: "Good morning!" }, corrections: { 0: { source: "Good mornin!", corrected: "Good morning!",
      meaning: "早上好！", reason: "morning 拼写要完整。" } } };
  elements["backup-text"].value = JSON.stringify({ format: "wordspring-backup-v4", notebook: [],
    listening: ["a1"], roleplay: [], knowledge, a1Course });
  elements["backup-import"].onclick();
  assert.equal(JSON.parse(data.get(COURSE_KEY)).completed[0], 0);
  await elements["backup-export"].onclick();
  assert.equal(JSON.parse(elements["backup-text"].value).a1Course.outputs[0], "Good morning!");
  assert.equal(JSON.parse(elements["backup-text"].value).a1Course.corrections[0].corrected, "Good morning!");

  reloaded = false;
  elements["backup-text"].value = JSON.stringify({ format: "wordspring-backup-v2", notebook: [], listening: ["bad"], roleplay: [] });
  elements["backup-import"].onclick();
  assert.equal(reloaded, false);
  assert.equal(JSON.parse(data.get("wordspring-listening-v1"))[0], "a1");
  assert.equal(JSON.parse(data.get(COURSE_KEY)).review[0].passes, 1);
  console.log("WordSpring backup checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
