const LISTENING_KEY = "wordspring-listening-v1";
const LISTENING_ENDPOINT = "https://wordspring-ai-pages.pages.dev/listening";
const OLD_LISTENING_IDS = ["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3"];

function validListening(value) {
  if (Array.isArray(value)) return value.length <= 9 && value.every(id => OLD_LISTENING_IDS.includes(id));
  return value && Number.isInteger(value.completed) && value.completed >= 0 && value.completed <= 100000 &&
    Array.isArray(value.recentTitles) && value.recentTitles.length <= 5 &&
    value.recentTitles.every(title => typeof title === "string" && title.length <= 60);
}

function startListening() {
  const $ = id => document.getElementById(id);
  let progress = { completed: 0, recentTitles: [] };
  let active = null;
  let answered = false;
  let busy = false;
  let controller = null;
  let requestId = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(LISTENING_KEY) || "null");
    if (validListening(saved)) progress = Array.isArray(saved) ? { completed: saved.length, recentTitles: [] } : saved;
  } catch { /* Start fresh. */ }
  function node(tag, text, className) { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; }
  function button(text, action, className = "utility-button") { const el = node("button", text, className); el.onclick = action; return el; }
  function summary() { $("listening-summary").textContent = `已完成 ${progress.completed} 段。选择入门、基础或进阶，每次联网生成新练习。`; }
  function play(slow = false) {
    if (!("speechSynthesis" in window)) return $("listening-position").textContent = "当前设备无法朗读。";
    speechSynthesis.cancel();
    active.lines.forEach(line => {
      const utterance = new SpeechSynthesisUtterance(line[1]);
      utterance.lang = "en-US";
      utterance.rate = slow ? 0.65 : 0.9;
      speechSynthesis.speak(utterance);
    });
  }
  function list() {
    active = null;
    $("listening-position").textContent = `累计完成 ${progress.completed} 段`;
    $("listening-actions").replaceChildren();
    const panel = $("listening-content");
    panel.replaceChildren(node("h2", "选择听力阶段"), node("p", "每次生成一段新对话。先听英文并回答问题，再看字幕和中文；生成需要联网和免费 AI 额度。"));
    ["入门", "基础", "进阶"].forEach(level => panel.append(button(`${level} · 生成新对话 →`, () => generate(level), "choice")));
  }
  function error(message, level) {
    $("listening-position").textContent = "生成未完成";
    const panel = $("listening-content");
    panel.replaceChildren(node("h2", "这次没生成成功"), node("p", message));
    $("listening-actions").replaceChildren(button("选择阶段", list, "secondary"), button("再试一次", () => generate(level), "primary"));
  }
  async function generate(level) {
    if (busy) return;
    let passcode = "";
    try { passcode = JSON.parse(localStorage.getItem("wordspring-ai-settings-v1") || "{}").passcode || ""; } catch { /* Ask for settings. */ }
    if (!passcode) {
      $("listening-position").textContent = "需要访问口令";
      $("listening-content").replaceChildren(node("h2", "先设置 AI 服务"), node("p", "分级听力使用现有免费 AI 服务。请先填写同一访问口令。"));
      $("listening-actions").replaceChildren(button("去服务设置", () => {
        $("listening-close").click(); $("teacher-open").click(); $("ai-edit-settings").click();
      }, "primary"));
      return;
    }
    busy = true;
    const current = ++requestId;
    active = null;
    $("listening-position").textContent = `${level} · 正在生成`;
    $("listening-content").replaceChildren(node("h2", "正在生成新对话……"), node("p", "通常需要几秒钟，请保持网络连接。"));
    $("listening-actions").replaceChildren();
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(LISTENING_ENDPOINT, { method: "POST",
        headers: { "content-type": "application/json", "x-wordspring-passcode": passcode },
        body: JSON.stringify({ level, avoid: progress.recentTitles }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "服务暂时不可用，请稍后重试。");
      if (current !== requestId || $("listening-view").hidden) return;
      active = result;
      answered = false;
      $("listening-position").textContent = `${level} · ${result.title}`;
      renderItem();
    } catch (cause) {
      if (current === requestId && !$("listening-view").hidden) error(cause.name === "AbortError" ? "等待超时，请再试一次。" : cause.message || "网络暂时不可用。", level);
    } finally { clearTimeout(timeout); busy = false; controller = null; }
  }
  function renderItem(choice) {
    const item = active;
    const panel = $("listening-content");
    panel.replaceChildren(node("h2", item.title), node("p", "先听英文，试着抓住关键信息。"),
      button("♪ 播放对话", () => play()), button("♪ 慢速重听", () => play(true)));
    panel.append(node("h3", item.question));
    item.options.forEach((option, number) => panel.append(button(option, () => answer(number), "choice")));
    if (answered) {
      panel.append(node("p", choice === item.answer ? "答对了！" : `正确答案：${item.options[item.answer]}`, "feedback"), node("h3", "英文字幕与中文意思"));
      item.lines.forEach(line => panel.append(node("div", `${line[0]}：${line[1]}\n${line[2]}`, "dialogue-line")));
    }
    const actions = $("listening-actions");
    actions.replaceChildren(button("选择阶段", list, "secondary"));
    if (answered) actions.append(button("再生成一段 →", () => generate(item.level), "primary"));
  }
  function answer(number) {
    if (answered) return;
    answered = true;
    const previous = progress;
    progress = { completed: progress.completed + 1, recentTitles: [...progress.recentTitles.filter(title => title !== active.title), active.title].slice(-5) };
    try { localStorage.setItem(LISTENING_KEY, JSON.stringify(progress)); summary(); }
    catch { progress = previous; $("listening-position").textContent = "听力进度未保存，请检查浏览器存储。"; }
    renderItem(number);
  }
  $("listening-open").onclick = () => { $("listening-view").hidden = false; document.body.style.overflow = "hidden"; list(); };
  $("listening-close").onclick = () => {
    requestId++;
    if (controller) controller.abort();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    $("listening-view").hidden = true; document.body.style.overflow = "";
  };
  summary();
}

if (typeof module !== "undefined") module.exports = { validListening };
if (typeof document !== "undefined") startListening();
