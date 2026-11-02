const COURSE_KEY = "wordspring-course-v1";
const WORD_REVIEW_KEY = "wordspring-review-v1";
const SPEAKING_REVIEW_KEY = "wordspring-speaking-v1";

function cleanAnswer(text) {
  return text.toLowerCase().replace(/[.,!?']/g, "").replace(/\s+/g, " ").trim();
}

function nextCourseDay(lessons, completed) {
  return lessons.find(lesson => !completed.includes(lesson.id)) || lessons[lessons.length - 1];
}

function validProgress(value) {
  const record = item => item && typeof item === "object" && !Array.isArray(item);
  return record(value) && Array.isArray(value.completed) && value.completed.every(id => Number.isInteger(id) && id >= 1 && id <= 7)
    && new Set(value.completed).size === value.completed.length
    && record(value.steps) && Object.values(value.steps).every(step => Number.isInteger(step) && step >= 0 && step <= 5)
    && record(value.answers) && record(value.reviews)
    && Object.values(value.reviews).every(review => record(review) && Number.isFinite(review.intervalDays) && review.intervalDays >= 0 && review.intervalDays <= 30 && Number.isFinite(review.nextReview));
}

if (typeof module !== "undefined") module.exports = { cleanAnswer, nextCourseDay, validProgress };

function startCourse() {
  const byId = id => document.getElementById(id);
  const html = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const freshProgress = () => ({ completed: [], steps: {}, answers: {}, reviews: {} });
  let lessons = [];
  let progress = loadProgress();
  let active = null;
  let activeStep = 0;
  let reviewSession = [];
  let reviewIndex = 0;
  let recorder = null;
  let stream = null;
  let recordingURL = null;
  let recognition = null;

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(COURSE_KEY) || "null");
      if (!validProgress(saved)) return freshProgress();
      return { ...freshProgress(), ...saved };
    } catch {
      return freshProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(COURSE_KEY, JSON.stringify(progress));
      renderHome();
      return true;
    } catch {
      alert("进度保存失败。请检查 Safari 的网站数据设置。");
      return false;
    }
  }

  function speak(text, slow = false) {
    if (!("speechSynthesis" in window)) return alert("这台设备暂时无法朗读，请看文字继续学习。");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = slow ? 0.68 : 0.9;
    speechSynthesis.speak(utterance);
  }

  function duePhrases() {
    const now = Date.now();
    const items = [];
    for (const lesson of lessons) {
      if (lesson.kind !== "lesson") continue;
      lesson.phrases.forEach((phrase, index) => {
        const key = `${lesson.id}:${index}`;
        const record = progress.reviews[key];
        if (record && (typeof record.nextReview !== "number" || record.nextReview <= now)) items.push({ key, phrase });
      });
    }
    return items;
  }

  function renderHome() {
    if (!lessons.length) return;
    const next = nextCourseDay(lessons, progress.completed);
    const finished = progress.completed.length === lessons.length;
    byId("course-title").textContent = finished ? "七天试学完成！" : `第 ${next.id} 天 · ${next.title}`;
    byId("course-detail").textContent = finished ? "可以重做任意一天，或复习到期句子。" : next.goal;
    byId("course-start").textContent = finished ? "重做第 7 天 →" : ((progress.steps[next.id] || 0) > 0 ? "继续学习 →" : "开始今天的课程 →");
    byId("course-start").disabled = false;
    const list = byId("course-days");
    list.innerHTML = "";
    for (const lesson of lessons) {
      const button = document.createElement("button");
      button.className = "day-row";
      button.innerHTML = `<span class="day-number">${lesson.id}</span><span><strong>${html(lesson.title)}</strong><small>${html(lesson.goal)}</small></span><span class="day-check">${progress.completed.includes(lesson.id) ? "✓" : ""}</span>`;
      button.addEventListener("click", () => openLesson(lesson.id));
      list.append(button);
    }
    const count = duePhrases().length;
    byId("course-review").hidden = count === 0;
    byId("course-review-count").textContent = `${count} 句待复习`;
  }

  function closeOverlay(id) {
    stopMedia();
    byId(id).hidden = true;
    document.body.style.overflow = "";
    renderHome();
  }

  function openLesson(id) {
    active = lessons.find(lesson => lesson.id === id);
    if (!active) return;
    activeStep = Math.min(Number(progress.steps[id]) || 0, 5);
    byId("lesson-view").hidden = false;
    document.body.style.overflow = "hidden";
    renderStep();
  }

  function row(en, zh) {
    return `<div class="learning-row"><div><strong>${html(en)}</strong><small>${html(zh)}</small></div><button class="sound" data-say="${html(en)}" aria-label="朗读 ${html(en)}">♪</button></div>`;
  }

  function choices(question, type) {
    return `<h3>${html(question.question)}</h3>${question.options.map((option, index) => `<button class="choice" data-choice="${type}" data-index="${index}">${html(option)}</button>`).join("")}<p class="feedback" id="answer-feedback" role="status"></p>`;
  }

  function renderStep() {
    stopMedia();
    const lesson = active;
    const panel = byId("lesson-content");
    byId("lesson-title").textContent = `第 ${lesson.id} 天 · ${lesson.title}`;
    byId("lesson-progress").textContent = activeStep < 5 ? `${["学习表达", "听对话", "跟读", "阅读", "写一句"][activeStep]} · ${activeStep + 1} / 5` : "本课完成";
    byId("lesson-next").disabled = activeStep === 1 || activeStep === 3 || activeStep === 4;
    byId("lesson-next").textContent = activeStep === 5 ? "返回首页" : activeStep === 4 ? "完成本课" : "继续 →";

    if (activeStep === 0) {
      panel.innerHTML = `<p class="kicker">${lesson.kind === "review" ? "复习日" : "新课"} · 约 8 分钟</p><h2>${html(lesson.title)}</h2><p>${html(lesson.goal)}</p><p class="tip">${html(lesson.tip)}</p>${lesson.words.length ? `<h3>今天的词</h3>${lesson.words.map(word => row(word.en, word.zh)).join("")}` : "<p>今天没有新词，试着把学过的句子说出来。</p>"}<h3>核心表达</h3>${lesson.phrases.map(phrase => row(phrase.en, phrase.zh)).join("")}`;
    } else if (activeStep === 1) {
      panel.innerHTML = `<p class="kicker">听 · 约 7 分钟</p><h2>先听，再理解</h2><p class="tip">先不看文字，听两遍后回答问题。</p><button class="utility-button" id="play-dialogue">♪ 播放对话</button><button class="utility-button" id="play-dialogue-slow">慢速播放</button><p><button class="utility-button" id="show-transcript">查看对话文字</button></p><div id="dialogue-transcript" hidden>${lesson.dialogue.map(line => `<div class="dialogue-line"><b>${html(line.speaker)}：</b>${html(line.en)}<small>${html(line.zh)}</small></div>`).join("")}</div>${choices(lesson.listen, "listen")}`;
    } else if (activeStep === 2) {
      panel.innerHTML = `<p class="kicker">说 · 约 7 分钟</p><h2>跟着说一句</h2><p class="tip">先听原音，再自己录一遍。录音只在当前页面回放，不会上传。</p><div class="dialogue-line"><strong>${html(lesson.speak.en)}</strong><small>${html(lesson.speak.zh)}</small></div><button class="utility-button" data-say="${html(lesson.speak.en)}">♪ 听原音</button><button class="utility-button" id="record-toggle">● 开始录音</button><audio id="recorded-audio" controls hidden></audio><p><button class="utility-button" id="speech-check">尝试语音转文字</button></p><p class="feedback" id="speech-result" role="status">语音识别不可用时，听自己的录音继续即可。</p>`;
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Speech) byId("speech-check").hidden = true;
    } else if (activeStep === 3) {
      panel.innerHTML = `<p class="kicker">读 · 约 3 分钟</p><h2>读一小段</h2><p class="dialogue-line">${html(lesson.reading.text)}</p><button class="utility-button" data-say="${html(lesson.reading.text)}">♪ 朗读</button><button class="utility-button" id="show-reading-translation">查看中文</button><p class="tip" id="reading-translation" hidden>${html(lesson.reading.translation)}</p>${choices(lesson.reading, "reading")}`;
    } else if (activeStep === 4) {
      panel.innerHTML = `<p class="kicker">写 · 约 3 分钟</p><h2>写一句英文</h2><p>把这句话写成英文：<strong>${html(lesson.writing.prompt)}</strong></p><p class="tip">提示：${html(lesson.writing.hint)}</p><textarea class="write-box" id="write-input" aria-label="写下你的英文句子" autocomplete="off"></textarea><p><button class="utility-button" id="check-writing">核对参考表达</button></p><div class="feedback" id="writing-feedback" role="status"></div>`;
    } else {
      const listen = progress.answers[`${lesson.id}:listen`];
      const reading = progress.answers[`${lesson.id}:reading`];
      panel.innerHTML = `<div class="done-mark">✓</div><h2>第 ${lesson.id} 天完成！</h2><p>你练习了听、说、读、写。听力题：${listen ? "答对" : "已练习"}；阅读题：${reading ? "答对" : "已练习"}。</p><p class="tip">答错的表达可以在课程里重练。新课句子会在后续复习中再次出现。</p>`;
    }
  }

  function selectChoice(type, index) {
    const question = type === "listen" ? active.listen : active.reading;
    const buttons = byId("lesson-content").querySelectorAll(`[data-choice="${type}"]`);
    buttons.forEach(button => {
      button.disabled = true;
      if (Number(button.dataset.index) === index) button.classList.add("selected");
    });
    const correct = index === question.answer;
    byId("answer-feedback").textContent = `${correct ? "答对了。" : `正确答案：${question.options[question.answer]}。`} ${question.explanation}`;
    progress.answers[`${active.id}:${type}`] = correct;
    if (!saveProgress()) return;
    byId("lesson-next").disabled = false;
  }

  function advance() {
    if (activeStep === 5) return closeOverlay("lesson-view");
    if (activeStep === 4) {
      if (!progress.completed.includes(active.id)) progress.completed.push(active.id);
      progress.steps[active.id] = 5;
      if (active.kind === "lesson") {
        active.phrases.forEach((phrase, index) => {
          const key = `${active.id}:${index}`;
          if (!progress.reviews[key]) progress.reviews[key] = { intervalDays: 1, nextReview: progress.answers[`${active.id}:listen`] === false || progress.answers[`${active.id}:reading`] === false ? Date.now() : Date.now() + 24 * 60 * 60 * 1000, lastReviewed: Date.now() };
        });
      }
    } else {
      progress.steps[active.id] = activeStep + 1;
    }
    if (!saveProgress()) return;
    activeStep = progress.steps[active.id];
    renderStep();
  }

  async function toggleRecording() {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      byId("record-toggle").textContent = "● 重新录音";
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      byId("speech-result").textContent = "这台设备不能录音，可以继续学习。";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (byId("lesson-view").hidden || activeStep !== 2) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        return;
      }
      recorder = new MediaRecorder(stream);
      const recordingStream = stream;
      const currentRecorder = recorder;
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        recordingStream.getTracks().forEach(track => track.stop());
        if (currentRecorder !== recorder || byId("lesson-view").hidden || activeStep !== 2) return;
        if (recordingURL) URL.revokeObjectURL(recordingURL);
        recordingURL = URL.createObjectURL(new Blob(chunks, { type: currentRecorder.mimeType || "audio/mp4" }));
        const player = byId("recorded-audio");
        if (player) { player.src = recordingURL; player.hidden = false; }
      };
      recorder.start();
      byId("record-toggle").textContent = "■ 停止录音";
      byId("speech-result").textContent = "正在录音。说完后点击停止。";
    } catch {
      byId("speech-result").textContent = "录音未启动。请检查麦克风权限；仍可继续学习。";
    }
  }

  function stopMedia() {
    if (recorder && recorder.state === "recording") recorder.stop();
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (recognition) recognition.abort();
    if (recordingURL) URL.revokeObjectURL(recordingURL);
    recorder = null;
    stream = null;
    recognition = null;
    recordingURL = null;
  }

  function recognizeSpeech() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return;
    if (recorder && recorder.state === "recording") recorder.stop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    try {
      recognition = new Speech();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.onresult = event => {
        const heard = event.results[0][0].transcript;
        const result = byId("speech-result");
        if (result) result.textContent = `识别到：${heard}。目标句：${active.speak.en}。请听录音自行比较。`;
      };
      recognition.onerror = () => { const result = byId("speech-result"); if (result) result.textContent = "语音识别没有结果，可以用录音回放继续。"; };
      recognition.start();
      byId("speech-result").textContent = "请对着麦克风说目标句……";
    } catch {
      byId("speech-result").textContent = "语音识别不可用，可以用录音回放继续。";
    }
  }

  function openReview() {
    reviewSession = duePhrases();
    if (!reviewSession.length) return;
    reviewIndex = 0;
    byId("phrase-view").hidden = false;
    document.body.style.overflow = "hidden";
    renderReview();
  }

  function renderReview() {
    const item = reviewSession[reviewIndex];
    byId("phrase-position").textContent = `${reviewIndex + 1} / ${reviewSession.length}`;
    byId("phrase-english").textContent = item.phrase.en;
    byId("phrase-chinese").textContent = item.phrase.zh;
    byId("phrase-chinese").hidden = true;
    byId("phrase-reveal-actions").hidden = false;
    byId("phrase-rate-actions").hidden = true;
  }

  function rateReview(remembered) {
    const item = reviewSession[reviewIndex];
    const previous = progress.reviews[item.key].intervalDays || 0;
    const now = Date.now();
    progress.reviews[item.key] = {
      intervalDays: remembered ? (previous === 0 ? 1 : Math.min(previous * 2 + 1, 30)) : 0,
      nextReview: remembered ? nextReview(now, previous, true) : now + 10 * 60 * 1000,
      lastReviewed: now
    };
    if (!saveProgress()) return;
    if (++reviewIndex === reviewSession.length) closeOverlay("phrase-view");
    else renderReview();
  }

  byId("course-start").addEventListener("click", () => openLesson(nextCourseDay(lessons, progress.completed).id));
  byId("course-review-start").addEventListener("click", openReview);
  byId("lesson-close").addEventListener("click", () => closeOverlay("lesson-view"));
  byId("lesson-next").addEventListener("click", advance);
  byId("lesson-content").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.say) speak(button.dataset.say);
    else if (button.id === "play-dialogue" || button.id === "play-dialogue-slow") speak(active.dialogue.map(line => line.en).join(" "), button.id === "play-dialogue-slow");
    else if (button.id === "show-transcript") byId("dialogue-transcript").hidden = false;
    else if (button.id === "show-reading-translation") byId("reading-translation").hidden = false;
    else if (button.dataset.choice) selectChoice(button.dataset.choice, Number(button.dataset.index));
    else if (button.id === "record-toggle") toggleRecording();
    else if (button.id === "speech-check") recognizeSpeech();
    else if (button.id === "check-writing") {
      const answer = byId("write-input").value;
      const matches = active.writing.examples.some(example => cleanAnswer(example) === cleanAnswer(answer));
      byId("writing-feedback").textContent = `${answer.trim() ? (matches ? "和参考表达一致。" : "你的表达已记录；还可以对照参考表达。") : "写不出来也没关系，先读读参考表达。"} 参考：${active.writing.examples.join(" / ")}`;
      progress.answers[`${active.id}:writing`] = answer.trim();
      if (!saveProgress()) return;
      byId("lesson-next").disabled = false;
    }
  });
  byId("phrase-close").addEventListener("click", () => closeOverlay("phrase-view"));
  byId("phrase-speak").addEventListener("click", () => speak(reviewSession[reviewIndex].phrase.en));
  byId("phrase-reveal").addEventListener("click", () => {
    byId("phrase-chinese").hidden = false;
    byId("phrase-reveal-actions").hidden = true;
    byId("phrase-rate-actions").hidden = false;
  });
  byId("phrase-again").addEventListener("click", () => rateReview(false));
  byId("phrase-remember").addEventListener("click", () => rateReview(true));

  byId("backup-export").addEventListener("click", async () => {
    try {
      const payload = { format: "wordspring-backup-v1", course: progress, wordReviews: JSON.parse(localStorage.getItem(WORD_REVIEW_KEY) || "{}"), speaking: JSON.parse(localStorage.getItem(SPEAKING_REVIEW_KEY) || "null") };
      const text = JSON.stringify(payload);
      byId("backup-text").value = text;
      byId("backup-text").select();
      try { await navigator.clipboard.writeText(text); byId("backup-message").textContent = "已复制备份文本，请保存到安全的地方。"; }
      catch { byId("backup-message").textContent = "备份已显示在文本框，可手动全选复制。"; }
    } catch { byId("backup-message").textContent = "导出失败，请检查浏览器存储。"; }
  });
  byId("backup-import").addEventListener("click", () => {
    try {
      const payload = JSON.parse(byId("backup-text").value);
      if (payload.format !== "wordspring-backup-v1" || !validProgress(payload.course) || !payload.wordReviews || typeof payload.wordReviews !== "object" || Array.isArray(payload.wordReviews) || payload.speaking != null && !validSpeakingProgress(payload.speaking)) throw new Error("格式不正确");
      if (!confirm("导入会替换这台设备上现有的学习进度。确定继续吗？")) return;
      const oldCourse = localStorage.getItem(COURSE_KEY);
      const oldWords = localStorage.getItem(WORD_REVIEW_KEY);
      const oldSpeaking = localStorage.getItem(SPEAKING_REVIEW_KEY);
      try {
        localStorage.setItem(COURSE_KEY, JSON.stringify(payload.course));
        localStorage.setItem(WORD_REVIEW_KEY, JSON.stringify(payload.wordReviews));
        if (payload.speaking != null) localStorage.setItem(SPEAKING_REVIEW_KEY, JSON.stringify(payload.speaking));
      } catch (error) {
        if (oldCourse === null) localStorage.removeItem(COURSE_KEY); else localStorage.setItem(COURSE_KEY, oldCourse);
        if (oldWords === null) localStorage.removeItem(WORD_REVIEW_KEY); else localStorage.setItem(WORD_REVIEW_KEY, oldWords);
        if (oldSpeaking === null) localStorage.removeItem(SPEAKING_REVIEW_KEY); else localStorage.setItem(SPEAKING_REVIEW_KEY, oldSpeaking);
        throw error;
      }
      location.reload();
    } catch { byId("backup-message").textContent = "备份格式不正确，或存储空间不足。"; }
  });

  fetch("./lessons.json")
    .then(response => { if (!response.ok) throw new Error("课程文件不可用"); return response.json(); })
    .then(data => {
      if (!Array.isArray(data) || data.length !== 7 || data.some((lesson, index) => lesson.id !== index + 1 || !lesson.phrases || !lesson.dialogue || !lesson.listen || !lesson.reading || !lesson.writing)) throw new Error("课程内容不完整");
      lessons = data;
      renderHome();
    })
    .catch(error => {
      byId("course-title").textContent = "课程加载失败";
      byId("course-detail").textContent = String(error);
    });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderHome(); });
  setInterval(renderHome, 60 * 1000);
}

if (typeof document !== "undefined") startCourse();
