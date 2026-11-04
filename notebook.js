const NOTEBOOK_KEY = "wordspring-notebook-v1";

function nextInterval(previous, remembered) {
  return remembered ? (previous === 0 ? 1 : Math.min(previous * 2 + 1, 30)) : 0;
}

function nextReview(now, previous, remembered) {
  if (!remembered) return now + 10 * 60 * 1000;
  const date = new Date(now);
  date.setDate(date.getDate() + nextInterval(previous, true));
  return date.getTime();
}

function validNotebook(items) {
  return Array.isArray(items) && items.length <= 200 && items.every(item =>
    item && typeof item.id === "string" && typeof item.source === "string" &&
    typeof item.corrected === "string" && typeof item.meaning === "string" &&
    typeof item.reason === "string" && Number.isFinite(item.intervalDays) &&
    item.intervalDays >= 0 && item.intervalDays <= 30 && Number.isFinite(item.nextReview));
}

function startNotebook() {
  const $ = id => document.getElementById(id);
  let items = [];
  let queue = [];
  let index = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || "[]");
    if (validNotebook(saved)) items = saved;
  } catch { /* A damaged notebook starts empty. */ }
  const due = () => items.filter(item => item.nextReview <= Date.now());
  function persist() {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(items));
    renderSummary();
  }
  function renderSummary() {
    $("notebook-summary").textContent = `${items.length} 句已收藏 · ${due().length} 句待复习。纠错后可一键保存。`;
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, onClick, className = "utility-button") {
    const node = element("button", text, className);
    node.onclick = onClick;
    return node;
  }
  function speak(sentence) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    speechSynthesis.speak(utterance);
  }
  function showList() {
    queue = [];
    $("notebook-position").textContent = `${items.length} 句收藏 · ${due().length} 句待复习`;
    const panel = $("notebook-content");
    panel.replaceChildren(element("h2", "我的错句"));
    const actions = $("notebook-actions");
    actions.replaceChildren();
    if (due().length) actions.append(button(`复习待学的 ${due().length} 句 →`, startReview, "primary"));
    if (!items.length) return panel.append(element("p", "在“AI 英语老师 → 纠错对话”中保存建议表达，它会出现在这里。"));
    items.slice().reverse().forEach(item => {
      const card = element("div", "", "dialogue-line");
      card.append(element("b", item.corrected), element("small", item.meaning),
        element("small", `原句：${item.source}`),
        button("♪ 朗读", () => speak(item.corrected)),
        button("删除", () => {
          if (!confirm("删除这句收藏？")) return;
          items = items.filter(entry => entry.id !== item.id);
          try { persist(); showList(); } catch { alert("删除失败，请检查浏览器存储。"); }
        }));
      panel.append(card);
    });
  }
  function showReview(revealed = false) {
    if (index >= queue.length) return showList();
    const item = queue[index];
    $("notebook-position").textContent = `第 ${index + 1} / ${queue.length} 句`;
    const panel = $("notebook-content");
    panel.replaceChildren(element("p", "先根据中文和原句，自己说出改正后的英文。", "kicker"),
      element("h2", item.meaning), element("p", `原句：${item.source}`));
    const actions = $("notebook-actions");
    actions.replaceChildren();
    if (!revealed) return actions.append(button("查看建议表达", () => showReview(true), "primary"));
    panel.append(element("h3", item.corrected), element("p", item.reason), button("♪ 朗读建议表达", () => speak(item.corrected)));
    actions.append(button("还不熟", () => rate(false), "secondary"), button("记住了", () => rate(true), "primary"));
  }
  function startReview() { queue = due().slice(); index = 0; showReview(); }
  function rate(remembered) {
    const item = queue[index];
    if (!item) return;
    const old = { ...item };
    item.intervalDays = nextInterval(item.intervalDays, remembered);
    item.nextReview = nextReview(Date.now(), old.intervalDays, remembered);
    try { persist(); index++; showReview(); }
    catch { Object.assign(item, old); alert("复习进度未保存，请检查浏览器存储。"); }
  }
  function save(entry) {
    if (!entry || !entry.corrected || !/[A-Za-z]/.test(entry.corrected) || !entry.source ||
        entry.source.trim().toLowerCase() === entry.corrected.trim().toLowerCase()) return false;
    const existing = items.find(item => item.corrected.toLowerCase() === entry.corrected.trim().toLowerCase());
    if (existing) return true;
    if (items.length >= 200) throw new Error("错句本已满，请先删除不需要的句子。");
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: entry.source.trim().slice(0, 400), corrected: entry.corrected.trim().slice(0, 400),
      meaning: (entry.meaning || "回想这句英文").trim().slice(0, 400),
      reason: (entry.reason || "").trim().slice(0, 400), intervalDays: 0, nextReview: Date.now() };
    items.push(item);
    try { persist(); return true; }
    catch { items.pop(); throw new Error("保存失败，请检查浏览器存储。"); }
  }
  $("notebook-open").onclick = () => { $("notebook-view").hidden = false; document.body.style.overflow = "hidden"; showList(); };
  $("notebook-close").onclick = () => { $("notebook-view").hidden = true; document.body.style.overflow = ""; };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderSummary(); });
  renderSummary();
  window.wordSpringNotebook = { save };
}

if (typeof module !== "undefined") module.exports = { validNotebook, nextInterval, nextReview };
if (typeof document !== "undefined") startNotebook();
