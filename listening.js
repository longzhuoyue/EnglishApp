const LISTENING_KEY = "wordspring-listening-v1";
const LISTENING = [
  { id: "a1", level: "入门", title: "打招呼", lines: [["A", "Good morning, Mia.", "早上好，米娅。"], ["B", "Good morning! How are you?", "早上好！你好吗？"], ["A", "I'm fine, thanks.", "我很好，谢谢。"]], question: "他们什么时候见面？", options: ["早上", "晚上", "周末"], answer: 0 },
  { id: "a2", level: "入门", title: "介绍名字", lines: [["A", "Hi, I'm Ben. What's your name?", "嗨，我是本。你叫什么名字？"], ["B", "I'm Lily. Nice to meet you.", "我是莉莉。很高兴认识你。"], ["A", "Nice to meet you too.", "我也很高兴认识你。"]], question: "女生叫什么名字？", options: ["Mia", "Lily", "Anna"], answer: 1 },
  { id: "a3", level: "入门", title: "喝点什么", lines: [["A", "Would you like tea or water?", "你想喝茶还是水？"], ["B", "Water, please.", "请给我水。"], ["A", "Here you are.", "给你。"]], question: "B 要喝什么？", options: ["茶", "果汁", "水"], answer: 2 },
  { id: "b1", level: "基础", title: "咖啡店", lines: [["A", "I'd like a small coffee, please.", "我想要一杯小杯咖啡。"], ["B", "Hot or iced?", "热的还是冰的？"], ["A", "Hot, please. How much is it?", "热的。多少钱？"], ["B", "It's three dollars.", "三美元。"]], question: "咖啡多少钱？", options: ["两美元", "三美元", "四美元"], answer: 1 },
  { id: "b2", level: "基础", title: "问时间", lines: [["A", "What time does the bus leave?", "公交车几点出发？"], ["B", "It leaves at nine thirty.", "九点半出发。"], ["A", "Great, we have ten minutes.", "太好了，我们还有十分钟。"]], question: "公交车几点出发？", options: ["九点", "九点半", "十点半"], answer: 1 },
  { id: "b3", level: "基础", title: "找图书馆", lines: [["A", "Excuse me, where is the library?", "打扰一下，图书馆在哪儿？"], ["B", "Go straight and turn left at the bank.", "直走，在银行左转。"], ["A", "Thank you!", "谢谢！"]], question: "在哪里转弯？", options: ["银行", "学校", "公园"], answer: 0 },
  { id: "c1", level: "进阶", title: "周末计划", lines: [["A", "Are you free on Saturday afternoon?", "周六下午你有空吗？"], ["B", "I have a class until two, but I'm free after that.", "我上课到两点，之后有空。"], ["A", "Let's meet at the park at three.", "那我们三点在公园见。"]], question: "他们约在几点见面？", options: ["两点", "三点", "四点"], answer: 1 },
  { id: "c2", level: "进阶", title: "餐厅点餐", lines: [["A", "Do you have anything without meat?", "你们有不含肉的菜吗？"], ["B", "Yes, the vegetable noodles are popular.", "有，蔬菜面很受欢迎。"], ["A", "That sounds good. I'll have one bowl.", "听起来不错。我要一碗。"]], question: "客人点了什么？", options: ["鸡肉饭", "蔬菜面", "汤"], answer: 1 },
  { id: "c3", level: "进阶", title: "改约时间", lines: [["A", "Can we meet at four instead of three?", "我们能改成四点见吗？"], ["B", "Sorry, I work until four thirty.", "抱歉，我工作到四点半。"], ["A", "Then let's meet at five.", "那我们五点见。"], ["B", "Five works for me.", "五点可以。"]], question: "最后约定几点？", options: ["三点", "四点半", "五点"], answer: 2 }
];

function validListening(value) {
  return Array.isArray(value) && value.length <= LISTENING.length && value.every(id =>
    typeof id === "string" && LISTENING.some(item => item.id === id));
}

function startListening() {
  const $ = id => document.getElementById(id);
  let done = [];
  let active = null;
  let answered = false;
  try { const saved = JSON.parse(localStorage.getItem(LISTENING_KEY) || "[]"); if (validListening(saved)) done = saved; } catch { /* Start fresh. */ }
  function node(tag, text, className) { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; }
  function button(text, action, className = "utility-button") { const el = node("button", text, className); el.onclick = action; return el; }
  function summary() { $("listening-summary").textContent = `已完成 ${done.length} / ${LISTENING.length} 段。选入门、基础或进阶，先听后答。`; }
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
    $("listening-position").textContent = `已完成 ${done.length} / ${LISTENING.length} 段`;
    $("listening-actions").replaceChildren();
    const panel = $("listening-content");
    panel.replaceChildren(node("h2", "选一段来听"), node("p", "每段约 15–30 秒。先听英文，再回答问题；答完可以看字幕和中文。"));
    ["入门", "基础", "进阶"].forEach(level => {
      panel.append(node("h3", level));
      LISTENING.filter(item => item.level === level).forEach(item =>
        panel.append(button(`${done.includes(item.id) ? "✓ " : ""}${item.title} →`, () => openItem(item), "choice")));
    });
  }
  function openItem(item) {
    active = item;
    answered = false;
    $("listening-position").textContent = `${item.level} · ${item.title}`;
    renderItem();
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
    actions.replaceChildren(button("返回列表", list, "secondary"));
    if (answered) {
      const next = LISTENING[LISTENING.findIndex(entry => entry.id === item.id) + 1];
      if (next) actions.append(button("下一段 →", () => openItem(next), "primary"));
    }
  }
  function answer(number) {
    if (answered) return;
    answered = true;
    if (!done.includes(active.id)) {
      done.push(active.id);
      try { localStorage.setItem(LISTENING_KEY, JSON.stringify(done)); summary(); }
      catch { done.pop(); $("listening-position").textContent = "听力进度未保存，请检查浏览器存储。"; }
    }
    renderItem(number);
  }
  $("listening-open").onclick = () => { $("listening-view").hidden = false; document.body.style.overflow = "hidden"; list(); };
  $("listening-close").onclick = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); $("listening-view").hidden = true; document.body.style.overflow = ""; };
  summary();
}

if (typeof module !== "undefined") module.exports = { LISTENING, validListening };
if (typeof document !== "undefined") startListening();
