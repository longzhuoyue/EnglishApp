const STORAGE_KEY = "wordspring-review-v1";
const TEN_MINUTES = 10 * 60 * 1000;

function nextInterval(previous, remembered) {
  return remembered ? (previous === 0 ? 1 : Math.min(previous * 2 + 1, 30)) : 0;
}

function nextReview(now, previous, remembered) {
  if (!remembered) return now + TEN_MINUTES;
  const date = new Date(now);
  date.setDate(date.getDate() + nextInterval(previous, true));
  return date.getTime();
}

function isDue(record, now) {
  return !record || typeof record.nextReview !== "number" || record.nextReview <= now;
}

if (typeof module !== "undefined") module.exports = { nextInterval, nextReview, isDue };

function startApp() {
  const byId = id => document.getElementById(id);
  const state = { words: [], records: {}, session: [], index: 0 };

  function loadRecords() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function dueWords() {
    const now = Date.now();
    return state.words.filter(word => isDue(state.records[word.english], now));
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      byId("notice").textContent = "当前浏览器不支持语音朗读。";
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }

  function renderHome() {
    const due = dueWords();
    const today = Object.keys(state.records).filter(key => {
      const record = state.records[key];
      return record && new Date(record.lastReviewed).toDateString() === new Date().toDateString();
    }).length;
    byId("due-count").textContent = due.length;
    byId("today-count").textContent = today;
    byId("total-count").textContent = Object.keys(state.records).length;
    byId("start-title").textContent = due.length ? "开始今日学习" : "今天学完啦";
    byId("start-detail").textContent = due.length ? `${due.length} 个单词 · 按自己的节奏来` : "等下一批单词到期后再来";
    byId("start").disabled = !due.length;
  }

  function renderCard() {
    const word = state.session[state.index];
    byId("position").textContent = `${state.index + 1} / ${state.session.length}`;
    byId("progress-bar").style.width = `${state.index / state.session.length * 100}%`;
    byId("english").textContent = word.english;
    byId("chinese").textContent = word.chinese;
    byId("example").textContent = word.example;
    byId("translation").textContent = word.translation;
    byId("hint").hidden = false;
    byId("answer").hidden = true;
    byId("reveal-actions").hidden = false;
    byId("rate-actions").hidden = true;
    byId("notice").textContent = "";
  }

  function closeStudy() {
    byId("study").hidden = true;
    document.body.style.overflow = "";
    renderHome();
  }

  function rate(remembered) {
    const word = state.session[state.index];
    const previous = state.records[word.english]?.intervalDays || 0;
    const now = Date.now();
    const updated = {
      ...state.records,
      [word.english]: {
        intervalDays: nextInterval(previous, remembered),
        nextReview: nextReview(now, previous, remembered),
        lastReviewed: now
      }
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      byId("notice").textContent = "进度未能保存，请检查 Safari 存储设置。";
      return;
    }
    state.records = updated;
    if (++state.index === state.session.length) closeStudy();
    else renderCard();
  }

  byId("start").addEventListener("click", () => {
    state.session = dueWords();
    if (!state.session.length) return;
    state.index = 0;
    renderCard();
    byId("study").hidden = false;
    document.body.style.overflow = "hidden";
  });
  byId("close").addEventListener("click", closeStudy);
  byId("reveal").addEventListener("click", () => {
    byId("hint").hidden = true;
    byId("answer").hidden = false;
    byId("reveal-actions").hidden = true;
    byId("rate-actions").hidden = false;
  });
  byId("again").addEventListener("click", () => rate(false));
  byId("remember").addEventListener("click", () => rate(true));
  byId("speak-current").addEventListener("click", () => speak(state.session[state.index].english));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderHome(); });
  setInterval(renderHome, 30 * 1000);

  fetch("./words.json")
    .then(response => { if (!response.ok) throw new Error("词库加载失败"); return response.json(); })
    .then(words => {
      state.words = words;
      state.records = loadRecords();
      byId("library-count").textContent = `${words.length} 词`;
      for (const word of words) {
        const row = document.createElement("div");
        row.className = "word";
        const content = document.createElement("div");
        const name = document.createElement("div");
        const meaning = document.createElement("div");
        name.className = "word-name";
        meaning.className = "word-meaning";
        name.textContent = word.english;
        meaning.textContent = word.chinese;
        content.append(name, meaning);
        const button = document.createElement("button");
        button.className = "sound";
        button.textContent = "♪";
        button.setAttribute("aria-label", `朗读 ${word.english}`);
        button.addEventListener("click", () => speak(word.english));
        row.append(content, button);
        byId("library").append(row);
      }
      renderHome();
    })
    .catch(error => {
      byId("start-title").textContent = state.words.length ? "页面初始化失败" : "词库加载失败";
      byId("start-detail").textContent = state.words.length ? String(error) : "请连接网络后刷新";
    });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js?v=8").catch(() => {});
}

if (typeof document !== "undefined") startApp();
