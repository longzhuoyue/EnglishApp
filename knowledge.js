const KNOWLEDGE_KEY = "wordspring-knowledge-v1";
const KNOWLEDGE_ENDPOINT = "https://wordspring-ai-pages.pages.dev/knowledge";
const KNOWLEDGE_MODES = ["words", "grammar", "translate", "reading"];
const KNOWLEDGE_NAMES = { words: "在线单词", grammar: "语法练习", translate: "句子翻译", reading: "阅读理解" };

function freshKnowledge() {
  return { completed: { words: 0, grammar: 0, translate: 0, reading: 0 }, grammarIndex: 0,
    recent: { words: [], grammar: [], translate: [], reading: [] }, session: null };
}

function validKnowledgePack(mode, pack) {
  if (!pack || typeof pack !== "object" || JSON.stringify(pack).length > 24000) return false;
  const text = value => typeof value === "string" && value.length > 0 && value.length <= 1600;
  const question = item => item && text(item.prompt) && Array.isArray(item.options) && item.options.length === 3 &&
    item.options.every(text) && Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 3 && text(item.explanation);
  if (mode === "words") return text(pack.title) && Array.isArray(pack.items) && pack.items.length === 5 &&
    pack.items.every(item => item && text(item.en) && text(item.zh) && text(item.example) && text(item.exampleZh));
  if (mode === "grammar") return text(pack.title) && text(pack.rule) && Array.isArray(pack.examples) && pack.examples.length === 2 &&
    pack.examples.every(item => item && text(item.en) && text(item.zh)) && Array.isArray(pack.questions) &&
    pack.questions.length === 3 && pack.questions.every(question);
  if (mode === "translate") return text(pack.title) && Array.isArray(pack.items) && pack.items.length === 3 &&
    pack.items.every(item => item && text(item.zh) && text(item.reference) && text(item.hint));
  return mode === "reading" && text(pack.title) && text(pack.passage) && text(pack.translation) &&
    Array.isArray(pack.questions) && pack.questions.length === 3 && pack.questions.every(question);
}

function validKnowledge(value) {
  if (!value || typeof value !== "object" || JSON.stringify(value).length > 30000 ||
      !value.completed || !value.recent || !Number.isInteger(value.grammarIndex) || value.grammarIndex < 0 || value.grammarIndex > 11) return false;
  if (!KNOWLEDGE_MODES.every(mode => Number.isInteger(value.completed[mode]) && value.completed[mode] >= 0 && value.completed[mode] <= 100000 &&
      Array.isArray(value.recent[mode]) && value.recent[mode].length <= 5 && value.recent[mode].every(title => typeof title === "string" && title.length <= 80))) return false;
  const session = value.session;
  if (session === null) return true;
  if (!session || !KNOWLEDGE_MODES.includes(session.mode) || !validKnowledgePack(session.mode, session.pack) ||
      !Number.isInteger(session.index) || session.index < 0 || session.index > (session.mode === "words" ? 4 : 3)) return false;
  if (session.result === null) return true;
  if (!session.result || typeof session.result !== "object") return false;
  if (session.mode === "words") return session.result.revealed === true;
  if (session.mode === "grammar" || session.mode === "reading") return Number.isInteger(session.result.chosen) && session.result.chosen >= 0 && session.result.chosen <= 2;
  return (session.result.hint === true && (session.result.draft === undefined || typeof session.result.draft === "string" && session.result.draft.length <= 300)) ||
    (typeof session.result.answer === "string" && session.result.answer.length <= 300 &&
    typeof session.result.feedback === "string" && session.result.feedback.length <= 400 &&
    typeof session.result.improved === "string" && session.result.improved.length <= 400 && typeof session.result.acceptable === "boolean");
}

function startKnowledge() {
  const $ = id => document.getElementById(id);
  let progress = freshKnowledge();
  let busy = false;
  let controller = null;
  let requestId = 0;
  try { const saved = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || "null"); if (validKnowledge(saved)) progress = saved; } catch { /* Start fresh. */ }
  function node(tag, value, className) { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; }
  function button(label, action, className = "utility-button") { const el = node("button", label, className); el.onclick = action; return el; }
  function panel(...children) { $("knowledge-content").replaceChildren(...children); }
  function actions(...children) { $("knowledge-actions").replaceChildren(...children); }
  function position(text) { $("knowledge-position").textContent = text; }
  function summary() {
    const counts = progress.completed;
    $("knowledge-summary").textContent = `已完成：单词 ${counts.words} 组 · 语法 ${counts.grammar} 组 · 翻译 ${counts.translate} 组 · 阅读 ${counts.reading} 篇。`;
  }
  function save() {
    try { localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(progress)); summary(); return true; }
    catch { position("本次进度未保存，请检查浏览器存储。仍可继续练习。"); return false; }
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return position("当前设备无法朗读。");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    speechSynthesis.speak(utterance);
  }
  function overview() {
    position("按自己的节奏练习 · 建议每天约 30 分钟");
    panel(node("h2", "知识学习"), node("p", "选择一个专项开始。练习内容联网获取，进度保存在这台设备。"),
      button("在线单词 · 每组 5 个 →", () => generate("words"), "choice"),
      button("语法练习 · 每组 3 题 →", () => generate("grammar"), "choice"),
      button("句子翻译 · 每组 3 句 →", () => generate("translate"), "choice"),
      button("阅读理解 · 每篇 3 题 →", () => generate("reading"), "choice"));
    actions();
    if (progress.session) {
      const resume = button(`继续上次的${KNOWLEDGE_NAMES[progress.session.mode]} →`, renderSession, "primary");
      $("knowledge-content").append(resume);
    }
  }
  function passcode() {
    try { return JSON.parse(localStorage.getItem("wordspring-ai-settings-v1") || "{}").passcode || ""; }
    catch { return ""; }
  }
  async function request(body) {
    const code = passcode();
    if (!code) throw new Error("请先在 AI 英语老师的“服务设置”中填写访问口令。");
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(KNOWLEDGE_ENDPOINT, { method: "POST",
        headers: { "content-type": "application/json", "x-wordspring-passcode": code },
        body: JSON.stringify(body), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "服务暂时不可用，请稍后重试。");
      return result;
    } finally { clearTimeout(timeout); controller = null; }
  }
  function error(cause, retry) {
    position("请求未完成");
    panel(node("h2", "这次没完成"), node("p", cause.name === "AbortError" ? "等待超时，请再试一次。" : cause.message || "网络暂时不可用。"));
    actions(button("返回专项", overview, "secondary"), button("再试一次", retry, "primary"));
  }
  async function generate(mode) {
    if (busy) return;
    if (progress.session && !confirm("生成新练习会替换尚未做完的一组。确定继续吗？")) return;
    if (!passcode()) {
      position("需要访问口令");
      panel(node("h2", "先设置 AI 服务"), node("p", "知识学习使用现有免费 AI 服务，请填写同一访问口令。"));
      actions(button("去服务设置", () => { $("knowledge-close").click(); $("teacher-open").click(); $("ai-edit-settings").click(); }, "primary"));
      return;
    }
    busy = true;
    const current = ++requestId;
    position(`${KNOWLEDGE_NAMES[mode]} · 正在生成`);
    panel(node("h2", "正在准备新练习……"), node("p", "请保持网络连接，生成可能需要几十秒。"));
    actions();
    try {
      const pack = await request({ action: "generate", mode, topic: progress.grammarIndex, avoid: progress.recent[mode] });
      if (current !== requestId || $("knowledge-view").hidden) return;
      if (!validKnowledgePack(mode, pack)) throw new Error("练习内容不完整，请重试。");
      progress.session = { mode, pack, index: 0, result: null };
      save(); renderSession();
    } catch (cause) { if (current === requestId && !$("knowledge-view").hidden) error(cause, () => generate(mode)); }
    finally { busy = false; }
  }
  function next() {
    const session = progress.session;
    const total = session.mode === "words" ? 5 : 3;
    session.index++;
    session.result = null;
    if (session.index >= total && session.mode !== "reading") return complete();
    save(); renderSession();
  }
  function complete() {
    const session = progress.session;
    if (!session) return overview();
    const mode = session.mode;
    progress.completed[mode]++;
    progress.recent[mode] = [...progress.recent[mode].filter(title => title !== session.pack.title), session.pack.title].slice(-5);
    if (mode === "grammar") progress.grammarIndex = (progress.grammarIndex + 1) % 12;
    progress.session = null;
    save();
    position("本组练习完成");
    panel(node("h2", "完成啦！"), node("p", `${KNOWLEDGE_NAMES[mode]}进度已记录。可以继续同一专项，也可以换一项练习。`));
    actions(button("选择其他专项", overview, "secondary"), button("再来一组 →", () => generate(mode), "primary"));
  }
  function renderWords(session) {
    const item = session.pack.items[session.index];
    position(`在线单词 · ${session.index + 1} / 5`);
    panel(node("p", session.pack.title, "kicker"), node("h2", item.en),
      button("♪ 朗读单词", () => speak(item.en)), node("p", "先想想意思，再查看答案。"));
    if (session.result) $("knowledge-content").append(node("h3", item.zh), node("p", item.example),
      node("p", item.exampleZh), button("♪ 朗读例句", () => speak(item.example)));
    actions(session.result ? button(session.index === 4 ? "完成本组 →" : "下一个词 →", next, "primary") :
      button("查看意思和例句", () => { session.result = { revealed: true }; save(); renderSession(); }, "primary"));
  }
  function renderGrammar(session) {
    const pack = session.pack;
    const item = pack.questions[session.index];
    position(`语法练习 · ${session.index + 1} / 3`);
    panel(node("p", "本组知识点", "kicker"), node("h2", pack.title), node("p", pack.rule));
    pack.examples.forEach(example => $("knowledge-content").append(node("div", `${example.en}\n${example.zh}`, "dialogue-line")));
    $("knowledge-content").append(node("h3", item.prompt));
    item.options.forEach((option, index) => $("knowledge-content").append(button(option, () => choose(index), "choice")));
    if (session.result) $("knowledge-content").append(node("p", session.result.chosen === item.answer ? "答对了！" : `正确答案：${item.options[item.answer]}`, "feedback"), node("p", item.explanation));
    actions(session.result ? button(session.index === 2 ? "完成本组 →" : "下一题 →", next, "primary") : button("返回专项", overview, "secondary"));
  }
  function renderReading(session) {
    const pack = session.pack;
    position(`阅读理解 · ${Math.min(session.index + 1, 3)} / 3`);
    panel(node("h2", pack.title), node("p", pack.passage), button("♪ 朗读短文", () => speak(pack.passage)));
    if (session.index === 3) {
      $("knowledge-content").append(node("h3", "中文译文"), node("p", pack.translation));
      return actions(button("完成本篇 →", complete, "primary"));
    }
    const item = pack.questions[session.index];
    $("knowledge-content").append(node("h3", item.prompt));
    item.options.forEach((option, index) => $("knowledge-content").append(button(option, () => choose(index), "choice")));
    if (session.result) $("knowledge-content").append(node("p", session.result.chosen === item.answer ? "答对了！" : `正确答案：${item.options[item.answer]}`, "feedback"), node("p", item.explanation));
    actions(session.result ? button(session.index === 2 ? "查看译文 →" : "下一题 →", next, "primary") : button("返回专项", overview, "secondary"));
  }
  function choose(index) {
    const session = progress.session;
    if (session.result) return;
    session.result = { chosen: index };
    save(); renderSession();
  }
  function renderTranslation(session) {
    const item = session.pack.items[session.index];
    const result = session.result;
    position(`句子翻译 · ${session.index + 1} / 3`);
    panel(node("p", session.pack.title, "kicker"), node("h2", item.zh), node("p", "把这句话写成自然的英文。"));
    if (!result || result.hint === true) {
      const input = node("textarea", "", "write-box");
      input.id = "knowledge-answer"; input.maxLength = 300; input.placeholder = "在这里写英文句子";
      input.value = result && result.draft || "";
      $("knowledge-content").append(input);
      if (result && result.hint === true) $("knowledge-content").append(node("p", `提示：${item.hint}`));
      actions(button("给我一点提示", () => { session.result = { hint: true, draft: $("knowledge-answer").value }; save(); renderSession(); }, "secondary"),
        button("检查表达 →", checkTranslation, "primary"));
      return;
    }
    $("knowledge-content").append(node("h3", result.answer), node("p", result.acceptable ? "表达可以！" : "再改进一下"),
      node("p", result.feedback), node("p", `建议表达：${result.improved}`), node("p", `参考表达：${item.reference}`),
      button("♪ 朗读建议表达", () => speak(result.improved)));
    actions(button(session.index === 2 ? "完成本组 →" : "下一句 →", next, "primary"));
  }
  async function checkTranslation() {
    if (busy) return;
    const session = progress.session;
    const answer = $("knowledge-answer").value.trim();
    if (!answer) return position("请先写一句英文，再检查表达。");
    if (answer.length > 300) return position("每句最多输入 300 个字符。");
    const item = session.pack.items[session.index];
    busy = true;
    const current = ++requestId;
    position("英语老师正在评改……");
    actions();
    try {
      const feedback = await request({ action: "check", mode: "translate", source: item.zh, reference: item.reference, answer });
      if (current !== requestId || $("knowledge-view").hidden) return;
      session.result = { answer, acceptable: feedback.acceptable, feedback: feedback.feedback, improved: feedback.improved };
      save(); renderSession();
    } catch (cause) { if (current === requestId && !$("knowledge-view").hidden) error(cause, () => { renderSession(); $("knowledge-answer").value = answer; }); }
    finally { busy = false; }
  }
  function renderSession() {
    const session = progress.session;
    if (!session) return overview();
    if (session.mode === "words") renderWords(session);
    else if (session.mode === "grammar") renderGrammar(session);
    else if (session.mode === "translate") renderTranslation(session);
    else renderReading(session);
  }
  $("knowledge-open").onclick = () => { $("knowledge-view").hidden = false; document.body.style.overflow = "hidden"; overview(); };
  $("knowledge-close").onclick = () => {
    requestId++;
    if (controller) controller.abort();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    $("knowledge-view").hidden = true; document.body.style.overflow = "";
  };
  summary();
}

if (typeof module !== "undefined") module.exports = { validKnowledge, validKnowledgePack, freshKnowledge };
if (typeof document !== "undefined") startKnowledge();
