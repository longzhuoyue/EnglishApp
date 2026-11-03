const SPEAKING_KEY = "wordspring-speaking-v1";

function normalizeSpeech(text) {
  return String(text).toLowerCase().replace(/[’‘]/g, "'").replace(/\bi'm\b/g, "i am").replace(/\bwhat's\b/g, "what is")
    .replace(/\bit's\b/g, "it is").replace(/\bcan't\b/g, "cannot").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function speechMatches(item, heard) {
  return [item.en].concat(item.answers || []).some(answer => normalizeSpeech(answer) === normalizeSpeech(heard));
}

function validSpeakingProgress(value) {
  const record = item => item && typeof item === "object" && !Array.isArray(item);
  return record(value) && record(value.cursor) && record(value.practiced) && Number.isInteger(value.sessions) && value.sessions >= 0
    && Object.keys(value.cursor).every(id => /^[1-7]$/.test(id) && Number.isInteger(value.cursor[id]) && value.cursor[id] >= 0 && value.cursor[id] < 12)
    && [value.practiced, value.difficult || {}].every(group => record(group) && Object.keys(group).every(id => /^[1-7]$/.test(id) && Array.isArray(group[id]) && group[id].every(index => Number.isInteger(index) && index >= 0 && index < 12)));
}

if (typeof module !== "undefined") module.exports = { normalizeSpeech, speechMatches, validSpeakingProgress };

function startSpeaking() {
  const byId = id => document.getElementById(id);
  const html = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const fresh = () => ({ cursor: {}, practiced: {}, difficult: {}, sessions: 0 });
  let scenes = [];
  let progress = loadProgress();
  let scene = null;
  let index = 0;
  let phase = "main";
  let reviewQueue = [];
  let reviewIndex = 0;
  let sessionPracticed = 0;
  let recognized = false;
  let recorder = null;
  let stream = null;
  let recordingUrl = null;
  let recognition = null;
  let cardToken = 0;

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(SPEAKING_KEY) || "null");
      return validSpeakingProgress(saved) ? { ...fresh(), ...saved } : fresh();
    } catch { return fresh(); }
  }

  function saveProgress(next) {
    try {
      localStorage.setItem(SPEAKING_KEY, JSON.stringify(next));
      progress = next;
      renderHome();
      return true;
    } catch {
      alert("口语进度保存失败，请检查 Safari 的网站数据设置。");
      return false;
    }
  }

  function say(text, slow = false) {
    if (!("speechSynthesis" in window)) return setFeedback("设备暂时无法朗读，请看文字继续练习。");
    speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = "en-US";
    voice.rate = slow ? 0.7 : 0.9;
    speechSynthesis.speak(voice);
  }

  function setFeedback(message, token = cardToken) {
    const feedback = byId("speaking-feedback");
    if (feedback && token === cardToken) feedback.textContent = message;
  }

  function renderHome() {
    if (!scenes.length) return;
    const course = (() => { try { return JSON.parse(localStorage.getItem("wordspring-course-v1") || "{}"); } catch { return {}; } })();
    const lastDay = Array.isArray(course.completed) && course.completed.length ? Math.max(...course.completed) : 1;
    const recommended = scenes[Math.min(lastDay, scenes.length) - 1];
    byId("speaking-summary").textContent = `推荐：第 ${recommended.id} 天 · ${recommended.title}。每个场景 ${recommended.items.length} 句，含跟读、看中文说英文和情景回答；累计完成 ${progress.sessions} 轮。`;
    const start = byId("speaking-start");
    start.disabled = false;
    start.onclick = () => openScene(recommended.id);
    const hardScene = (progress.difficult[recommended.id] || []).length ? recommended : scenes.find(item => (progress.difficult[item.id] || []).length);
    byId("speaking-difficult-start").hidden = !hardScene;
    if (hardScene) {
      byId("speaking-difficult-start").textContent = `先练第 ${hardScene.id} 天难句 · ${progress.difficult[hardScene.id].length} 句`;
      byId("speaking-difficult-start").onclick = () => openScene(hardScene.id, true);
    }
    const list = byId("speaking-scenes");
    list.innerHTML = "";
    scenes.forEach(item => {
      const practiced = new Set(progress.practiced[item.id] || []).size;
      const hard = (progress.difficult[item.id] || []).length;
      const button = document.createElement("button");
      button.className = "day-row";
      button.innerHTML = `<span class="day-number">${item.id}</span><span><strong>${html(item.title)}</strong><small>${practiced} / ${item.items.length} 句练过${hard ? ` · ${hard} 句待加强` : ""}</small></span><span class="day-check">→</span>`;
      button.addEventListener("click", () => openScene(item.id));
      list.append(button);
    });
  }

  function stopMedia() {
    cardToken++;
    if (recorder && recorder.state === "recording") recorder.stop();
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (recognition) recognition.abort();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recorder = null;
    stream = null;
    recognition = null;
    recordingUrl = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  function close() {
    stopMedia();
    byId("speaking-view").hidden = true;
    document.body.style.overflow = "";
    renderHome();
  }

  function openScene(id, reviewOnly = false) {
    scene = scenes.find(item => item.id === id);
    if (!scene) return;
    index = Math.min(progress.cursor[id] || 0, scene.items.length - 1);
    reviewQueue = [...(progress.difficult[id] || [])];
    reviewIndex = 0;
    phase = reviewOnly && reviewQueue.length ? "review" : "main";
    sessionPracticed = 0;
    byId("speaking-view").hidden = false;
    document.body.style.overflow = "hidden";
    renderCard();
  }

  function renderCard() {
    stopMedia();
    recognized = false;
    const itemIndex = phase === "review" ? reviewQueue[reviewIndex] : index;
    const item = scene.items[itemIndex];
    byId("speaking-title").textContent = `口语 · ${scene.title}`;
    byId("speaking-position").textContent = `${phase === "review" ? `难句复练 ${reviewIndex + 1} / ${reviewQueue.length}` : `${index + 1} / ${scene.items.length}`} · ${item.mode === "echo" ? "短句跟读" : item.mode === "recall" ? "看中文说英文" : "情景对话"}`;
    byId("speaking-again").hidden = false;
    byId("speaking-next").textContent = "说出来了 →";
    byId("speaking-content").innerHTML = item.mode === "echo"
      ? `<p class="kicker">听一遍，再开口跟读</p><div class="speaking-target"><strong>${html(item.en)}</strong><small>${html(item.zh)}</small></div><div class="speaking-tools"><button class="utility-button" id="speaking-play">♪ 听示范</button><button class="utility-button" id="speaking-slow">慢速</button></div>`
      : item.mode === "recall"
      ? `<p class="kicker">先看中文，自己说英文</p><div class="speaking-target"><strong>${html(item.zh)}</strong></div><button class="utility-button" id="speaking-hint">查看英文提示</button><div id="speaking-answer" class="speaking-target" hidden><strong>${html(item.en)}</strong><button class="utility-button" id="speaking-slow">♪ 听参考表达</button></div>`
      : `<p class="kicker">情景对话 · 轮到你回答</p><div class="speaking-prompt"><small>对方说</small><strong>${html(item.prompt)}</strong></div><div class="speaking-tools"><button class="utility-button" id="speaking-play">♪ 听对方说</button></div><p>请用英文回答：<strong>${html(item.zh)}</strong></p><button class="utility-button" id="speaking-hint">查看英文提示</button><div id="speaking-answer" class="speaking-target" hidden><strong>${html(item.en)}</strong><button class="utility-button" id="speaking-slow">♪ 听参考回答</button></div>`;
    byId("speaking-content").insertAdjacentHTML("beforeend", `<div class="speaking-tools"><button class="utility-button" id="speaking-record">● 开始录音</button><button class="utility-button" id="speaking-recognize">尝试语音识别</button></div><audio id="speaking-audio" controls hidden></audio><p class="tip">录音只在当前页面回放。语音识别由系统提供，可能需要联网；识别文字不能代表发音评分。</p><p class="speaking-feedback" id="speaking-feedback" role="status">先听、再说。说完可听自己的录音，然后进入下一句。</p>`);
    if ((!window.SpeechRecognition && !window.webkitSpeechRecognition) || navigator.standalone) {
      byId("speaking-recognize").hidden = true;
      if (navigator.standalone) setFeedback("主屏幕模式请用录音回放练习；在 Safari 浏览器中可尝试语音识别。");
    }
  }

  function renderFinish() {
    stopMedia();
    phase = "done";
    const difficult = (progress.difficult[scene.id] || []).length;
    byId("speaking-position").textContent = "本轮完成";
    byId("speaking-content").innerHTML = `<div class="done-mark">✓</div><h2>本轮练了 ${sessionPracticed} 句</h2><p>${difficult ? `还有 ${difficult} 句待加强，可单独复练。` : "这轮没有待加强的句子。"}</p><button class="utility-button" id="speaking-repeat">再练一轮</button>`;
    byId("speaking-again").hidden = true;
    byId("speaking-next").textContent = "返回首页";
  }

  function advance(needsPractice) {
    if (phase === "done") return close();
    const itemIndex = phase === "review" ? reviewQueue[reviewIndex] : index;
    const practiced = new Set(progress.practiced[scene.id] || []);
    const difficult = new Set(progress.difficult[scene.id] || []);
    practiced.add(itemIndex);
    if (needsPractice) difficult.add(itemIndex); else difficult.delete(itemIndex);
    const finished = phase === "main" && index + 1 === scene.items.length;
    const next = {
      ...progress,
      cursor: { ...progress.cursor, [scene.id]: phase === "main" ? (finished ? 0 : index + 1) : (progress.cursor[scene.id] || 0) },
      practiced: { ...progress.practiced, [scene.id]: [...practiced] },
      difficult: { ...progress.difficult, [scene.id]: [...difficult].sort((a, b) => a - b) },
      sessions: progress.sessions + (finished ? 1 : 0)
    };
    if (!saveProgress(next)) return;
    sessionPracticed++;
    if (phase === "main") {
      index++;
      if (finished) {
        reviewQueue = [...difficult];
        reviewIndex = 0;
        if (reviewQueue.length) phase = "review";
        else return renderFinish();
      }
    } else if (++reviewIndex === reviewQueue.length) return renderFinish();
    renderCard();
  }

  async function toggleRecording() {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      byId("speaking-record").textContent = "● 重新录音";
      setFeedback("录音已结束。播放自己的声音，和示范句比较。");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return setFeedback("这台设备不支持网页录音，可以自己开口练习后继续。");
    const token = cardToken;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== cardToken || byId("speaking-view").hidden) { newStream.getTracks().forEach(track => track.stop()); return; }
      stream = newStream;
      recorder = new MediaRecorder(stream);
      const currentRecorder = recorder;
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        newStream.getTracks().forEach(track => track.stop());
        if (token !== cardToken || currentRecorder !== recorder) return;
        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        recordingUrl = URL.createObjectURL(new Blob(chunks, { type: currentRecorder.mimeType || "audio/mp4" }));
        const player = byId("speaking-audio");
        player.src = recordingUrl;
        player.hidden = false;
      };
      recorder.start();
      byId("speaking-record").textContent = "■ 停止录音";
      setFeedback("正在录音。说完后点击停止。");
    } catch { setFeedback("录音未启动。请检查麦克风权限，仍可直接开口练习。", token); }
  }

  function recognize() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return setFeedback("当前浏览器不支持语音识别。");
    if (recorder && recorder.state === "recording") recorder.stop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (recognition) recognition.abort();
    const token = cardToken;
    const item = scene.items[phase === "review" ? reviewQueue[reviewIndex] : index];
    try {
      const currentRecognition = new Speech();
      recognition = currentRecognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = event => {
        if (currentRecognition !== recognition || token !== cardToken) return;
        const heard = event.results[0][0].transcript;
        recognized = speechMatches(item, heard);
        setFeedback(recognized ? `识别到“${heard}”，和参考表达一致。点击下一句。` : `识别到“${heard}”。参考：${item.en}。可以再试一次，或听录音自行比较。`, token);
      };
      recognition.onerror = () => { if (currentRecognition === recognition) setFeedback("语音识别未成功。请用录音回放练习，再继续下一句。", token); };
      recognition.start();
      setFeedback("请对着麦克风说话……", token);
    } catch { setFeedback("语音识别暂时不可用。请用录音回放练习。", token); }
  }

  byId("speaking-close").addEventListener("click", close);
  byId("speaking-again").addEventListener("click", () => advance(true));
  byId("speaking-next").addEventListener("click", () => advance(false));
  byId("speaking-content").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.id === "speaking-repeat") { phase = "main"; index = 0; reviewQueue = []; reviewIndex = 0; sessionPracticed = 0; renderCard(); return; }
    const item = scene.items[phase === "review" ? reviewQueue[reviewIndex] : index];
    if (button.id === "speaking-play") say(item.mode === "echo" ? item.en : item.prompt);
    else if (button.id === "speaking-slow") say(item.en, true);
    else if (button.id === "speaking-hint") byId("speaking-answer").hidden = false;
    else if (button.id === "speaking-record") toggleRecording();
    else if (button.id === "speaking-recognize") recognize();
  });

  fetch("./speaking.json?v=6")
    .then(response => { if (!response.ok) throw new Error("口语内容不可用"); return response.json(); })
    .then(data => {
      if (!Array.isArray(data) || data.length !== 7 || data.some((item, day) => item.id !== day + 1 || !Array.isArray(item.items) || item.items.length !== 12 || item.items.some(practice => !["echo", "recall", "reply"].includes(practice.mode) || !practice.en || !practice.zh || practice.mode === "reply" && !practice.prompt))) throw new Error("口语内容不完整");
      scenes = data;
      renderHome();
    })
    .catch(error => { byId("speaking-summary").textContent = `口语加载失败：${error.message}`; });
}

if (typeof document !== "undefined") startSpeaking();
