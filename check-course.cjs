const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { A1_CHAPTERS, A1_UNITS, A1_MORE, A1_LISTENING_MORE } = require("./course-data.js");
const { A2_CHAPTERS, A2_UNITS, A2_MORE, A2_LISTENING_MORE } = require("./a2-data.js");
const { COURSE_KEY, A2_COURSE_KEY, freshCourse, validCourse } = require("./course.js");

const stages = [
  { prefix: "course", key: COURSE_KEY, chapters: A1_CHAPTERS, units: A1_UNITS, more: A1_MORE, clips: A1_LISTENING_MORE, examCount: 12 },
  { prefix: "a2-course", key: A2_COURSE_KEY, chapters: A2_CHAPTERS, units: A2_UNITS, more: A2_MORE, clips: A2_LISTENING_MORE, examCount: 14 }
];
for (const stage of stages) {
  const { units, chapters, more, clips } = stage;
  assert.equal(units.length, chapters.length * 4);
  assert.equal(new Set(units.map(unit => unit.title)).size, units.length);
  assert.deepEqual(chapters.map((_, i) => units.filter(unit => unit.chapter === i).length), chapters.map(() => 4));
  assert.equal(more.length, units.length);
  assert.equal(clips.length, units.length);
  for (const [i, unit] of units.entries()) {
    assert.ok(unit.goal && unit.rule && unit.output.prompt && unit.output.sample, unit.title);
    assert.equal(unit.words.length, 6, unit.title);
    assert.equal(new Set(unit.words.map(pair => pair[0])).size, 6, unit.title);
    assert.ok(unit.examples.length >= 2 && unit.reading.zh, unit.title);
    assert.ok(unit.reading.en.split(/\s+/).length >= 20, unit.title);
    assert.equal(more[i].length, 3, unit.title);
    for (const q of [unit.listen, unit.grammar, unit.reading, unit.review, ...more[i]]) {
      assert.ok(q.prompt && q.options.length === 3 && new Set(q.options).size === 3, unit.title);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3, unit.title);
    }
    const listening = [{ dialogue: unit.dialogue, ...unit.listen }, ...clips[i]];
    assert.equal(listening.length, 3, unit.title);
    assert.equal(new Set(listening.map(clip => clip.dialogue.map(line => line[1]).join(" "))).size, 3, unit.title);
    for (const clip of listening) assert.ok(clip.dialogue.length >= 2 && clip.dialogue.every(line => line.length === 3 && line[1] && line[2]), unit.title);
  }
  assert.equal(validCourse(freshCourse(), units.length, stage.examCount), true);
}
assert.equal(validCourse({ ...freshCourse(), completed: [24] }), false);
const legacy = { ...freshCourse(), completed: [0], cursor: { unit: 1, step: 3, word: 0 }, exam: { score: 11, at: 1700000000000 } };
delete legacy.answers; delete legacy.examDraft; delete legacy.corrections;
assert.equal(validCourse(legacy), true);

const html = fs.readFileSync("index.html", "utf8");
const makeElement = () => {
  const el = { children: [], hidden: false, value: "", className: "", id: "", attributes: {},
    appendChild(child) { this.children.push(child); child.parent = this; return child; },
    replaceChildren(...items) { this.children = items; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); },
    setAttribute(key, value) { this.attributes[key] = value; },
    click() { assert.equal(typeof this.onclick, "function"); assert.notEqual(this.disabled, true); return this.onclick(); } };
  let text = "", markup = "";
  Object.defineProperty(el, "textContent", { get: () => text, set: value => { text = value; el.children = []; } });
  Object.defineProperty(el, "innerHTML", { get: () => markup, set: value => { markup = value; el.children = []; } });
  return el;
};
const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], makeElement()]));
const lookup = id => ids[id] || ["course-content", "a2-course-content"].flatMap(key => ids[key].children).find(el => el.id === id) || null;
const values = new Map([["wordspring-ai-settings-v1", JSON.stringify({ passcode: "test-only" })]]);
let now = 1700000000000, lastGrade, gradeCalls = 0;
const spoken = [];
const context = vm.createContext({ document: { getElementById: lookup, createElement: makeElement, createTextNode: text => ({ textContent: text }) },
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
  window: { speechSynthesis: true, wordSpringNotebook: { save() { return true; } } }, Date: { now: () => now },
  speechSynthesis: { cancel() {}, speak(utterance) { spoken.push(utterance.text); } },
  SpeechSynthesisUtterance: function (text) { this.text = text; }, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => { assert.equal(url, "https://wordspring-ai-pages.pages.dev/teach");
    lastGrade = JSON.parse(options.body); gradeCalls++;
    return gradeCalls === 2 ? { ok: false, json: async () => ({ error: "测试失败" }) } :
      { ok: true, json: async () => ({ corrected: "Hello! See you later.", meaning: "你好！回头见。",
        reason: "问候时用 Hello。", reply: "How are you?", hint: "你好吗？" }) }; } });
vm.runInContext(fs.readFileSync("course-data.js", "utf8"), context);
vm.runInContext(fs.readFileSync("a2-data.js", "utf8"), context);
vm.runInContext(fs.readFileSync("course.js", "utf8"), context);

const getProgress = key => JSON.parse(values.get(key));
const choose = (panel, answer) => { const b = panel.children.find(el => el.className === "choice" && el.textContent === answer);
  assert.ok(b, answer); b.click(); };
const clickAction = (actions, label) => { const b = actions.children.find(el => el.textContent === label); assert.ok(b, label); return b.click(); };

(async () => {
  for (const stage of stages) {
    const { prefix, key, units, more, clips, examCount } = stage;
    const panel = ids[`${prefix}-content`], actions = ids[`${prefix}-actions`];
    ids[`${prefix}-open`].click();
    assert.equal(ids[`${prefix}-view`].hidden, false);
    actions.children[0].click();
    for (const [i, unit] of units.entries()) {
      assert.equal(getProgress(key).cursor.unit, i);
      clickAction(actions, "开始练习 →");
      for (const [w, [, zh]] of unit.words.entries()) {
        if (i === 0 && w === 0) { choose(panel, zh); clickAction(actions, "上一题"); clickAction(actions, "开始练习 →");
          assert.equal(getProgress(key).answers[0].words[0], true); }
        else choose(panel, zh);
        clickAction(actions, "下一题");
      }
      const listening = [{ dialogue: unit.dialogue, ...unit.listen }, ...clips[i]];
      for (const [n, clip] of listening.entries()) {
        const play = panel.children.find(el => el.textContent === "♪ 播放这段对话"); assert.ok(play);
        play.click(); assert.equal(spoken.at(-1), clip.dialogue.map(line => line[1]).join(" "));
        choose(panel, clip.options[clip.answer]);
        assert.ok(panel.children.some(el => el.children.length === clip.dialogue.length));
        if (i === 0 && n === 1) { clickAction(actions, "上一题");
          assert.ok(panel.children.some(el => el.children.length === listening[0].dialogue.length)); clickAction(actions, "下一题"); }
        clickAction(actions, "下一题");
      }
      for (const q of [unit.grammar, more[i][0], unit.review]) { choose(panel, q.options[q.answer]); clickAction(actions, "下一题"); }
      for (const q of [unit.reading, ...more[i].slice(1)]) { choose(panel, q.options[q.answer]); clickAction(actions, "下一题"); }
      const input = panel.children.find(el => el.maxLength === 600); assert.ok(input, unit.title);
      input.value = unit.output.sample; input.oninput();
      if (i === 0 && prefix === "course") {
        input.value = "I am hello"; input.oninput();
        await clickAction(actions, "AI 批改纠错");
        assert.equal(getProgress(key).corrections[0].corrected, "Hello! See you later.");
        assert.ok(lastGrade.messages[0].content.includes(unit.output.prompt));
        input.value = "Hello! See you later."; input.oninput();
        await clickAction(actions, "AI 批改纠错");
        assert.equal(getProgress(key).outputs[0], "Hello! See you later.");
      }
      clickAction(actions, "保存并完成");
      assert.equal(getProgress(key).completed.length, i + 1);
      if (i < units.length - 1) actions.children[0].click();
    }
    assert.equal(getProgress(key).cursor, null);
    assert.equal(validCourse(getProgress(key), units.length, examCount), true);
    clickAction(actions, "返回课程目录");
    clickAction(actions, "阶段综合测评");
    for (let n = 0; n < examCount; n++) {
      const item = units[n * 2], q = n % 2 ? item.grammar : item.review;
      choose(panel, q.options[n === 3 ? 1 : q.answer]);
      if (n === 4) { clickAction(actions, "上一题");
        assert.equal(getProgress(key).examDraft.answers[3], 1);
        clickAction(actions, "下一题 →"); }
      clickAction(actions, n === examCount - 1 ? "进入写作 →" : "下一题 →");
    }
    const writing = panel.children.find(el => el.maxLength === 600); assert.ok(writing);
    writing.value = "I visited my friend yesterday. We had lunch. I will visit her again tomorrow. She should rest."; writing.oninput();
    assert.equal(getProgress(key).examDraft.writing, writing.value);
    await clickAction(actions, "AI 批改写作");
    assert.ok(getProgress(key).examDraft.correction);
    clickAction(actions, "提交测评");
    assert.equal(getProgress(key).exam.score, examCount - 1);
    assert.equal(getProgress(key).exam.wrong[0].number, 4);
    assert.ok(panel.innerHTML.includes("错题题号：4"));
    assert.equal(getProgress(key).examDraft, null);
    clickAction(actions, "返回课程目录");
    clickAction(actions, "查看上次测评与错题");
    assert.ok(panel.innerHTML.includes("错题题号：4"));

    now += 86400000;
    clickAction(actions, "返回课程目录");
    clickAction(actions, `复习到期单元（${units.length}）`);
    choose(panel, units[0].grammar.options[units[0].grammar.answer]);
    choose(panel, units[0].review.options[units[0].review.answer]);
    assert.equal(getProgress(key).review[0].passes, 1);
    ids[`${prefix}-close`].click(); assert.equal(ids[`${prefix}-view`].hidden, true);
  }
  console.log("WordSpring A1 and A2 course checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
