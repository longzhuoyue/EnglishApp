const COURSE_KEY = "wordspring-a1-course-v1";

function freshCourse() { return { completed: [], review: {}, cursor: null, outputs: {}, exam: null }; }

function validCourse(value) {
  const index = n => Number.isInteger(n) && n >= 0 && n < 24;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Array.isArray(value.completed) || !value.completed.every(index) ||
      !value.review || typeof value.review !== "object" || Array.isArray(value.review) ||
      !value.outputs || typeof value.outputs !== "object" || Array.isArray(value.outputs)) return false;
  if (value.cursor !== null && (!value.cursor || !index(value.cursor.unit) ||
      !Number.isInteger(value.cursor.step) || value.cursor.step < 0 || value.cursor.step > 5 ||
      !Number.isInteger(value.cursor.word) || value.cursor.word < 0 || value.cursor.word > 5)) return false;
  if (!Object.entries(value.review).every(([key, item]) => index(Number(key)) &&
      item && Number.isInteger(item.passes) && item.passes >= 0 && item.passes <= 2 &&
      Number.isFinite(item.nextAt) && item.nextAt >= 0)) return false;
  if (!Object.entries(value.outputs).every(([key, answer]) => index(Number(key)) && typeof answer === "string" && answer.length <= 600)) return false;
  return value.exam === null || (value.exam && Number.isInteger(value.exam.score) && value.exam.score >= 0 &&
    value.exam.score <= 12 && Number.isFinite(value.exam.at) && value.exam.at >= 0);
}

function startCourse() {
  const $ = id => document.getElementById(id);
  const view = $("course-view"), panel = $("course-content"), actions = $("course-actions"), position = $("course-position");
  let progress;
  try { progress = JSON.parse(localStorage.getItem(COURSE_KEY) || "null"); } catch { /* Corrupt local data falls back to an empty course. */ }
  if (!validCourse(progress)) progress = freshCourse();
  let screen = "overview", unit = 0, step = 0, word = 0;
  let reviewUnit = 0, reviewQuestion = 0, examQuestion = 0, examScore = 0, examWriting = "";
  const save = () => { try { localStorage.setItem(COURSE_KEY, JSON.stringify(progress)); } catch { $("course-summary").textContent = "进度保存失败，请检查 Safari 存储空间。"; } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const button = (label, fn, style = "primary") => { const b = document.createElement("button"); b.className = style; b.textContent = label; b.onclick = fn; actions.appendChild(b); return b; };
  const clean = () => { panel.replaceChildren(); actions.replaceChildren(); position.textContent = ""; };
  const html = markup => { panel.innerHTML = markup; };
  const due = i => { const r = progress.review[i]; return r && r.passes < 2 && r.nextAt <= Date.now(); };
  const dueCount = () => A1_UNITS.filter((_, i) => due(i)).length;
  const firstUnfinished = () => A1_UNITS.findIndex((_, i) => !progress.completed.includes(i));
  const summary = () => { $("course-summary").textContent = `${progress.completed.length}/24 单元完成 · ${dueCount()} 个待复习${progress.exam && progress.exam.score >= 10 ? " · 阶段测评通过" : ""}`; };
  const speak = text => {
    if (!("speechSynthesis" in window)) { position.textContent = "这台设备暂不支持朗读。"; return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.82; speechSynthesis.speak(u);
  };
  const play = (text, label = "♪ 播放英文") => { const b = document.createElement("button"); b.className = "utility-button"; b.textContent = label; b.onclick = () => speak(text); panel.appendChild(b); };
  const choices = (question, seed, onAnswer) => {
    const rotation = seed % question.options.length;
    question.options.forEach((_, display) => {
      const original = (display + rotation) % question.options.length;
      const b = document.createElement("button"); b.className = "choice"; b.textContent = question.options[original];
      b.onclick = () => onAnswer(original === question.answer, question.options[question.answer]); panel.appendChild(b);
    });
  };
  const feedback = text => { let el = $("course-feedback"); if (!el) { el = document.createElement("p"); el.id = "course-feedback"; el.className = "feedback"; panel.appendChild(el); } el.textContent = text; };
  const moveStep = next => { step = next; word = 0; progress.cursor = { unit, step, word }; save(); lesson(); view.scrollTop = 0; };
  const openUnit = i => { unit = i; const cursor = progress.cursor; step = cursor && cursor.unit === i ? cursor.step : 0; word = cursor && cursor.unit === i ? cursor.word : 0; progress.cursor = { unit, step, word }; save(); screen = "lesson"; lesson(); view.scrollTop = 0; };
  const overview = () => {
    screen = "overview"; clean(); summary(); position.textContent = "阶段 1 · A1 入门 · 建议每天 1 单元，约 30 分钟";
    html(`<h2>系统课程</h2><p>24 单元 · 6 个主题。每天可用约 8 分钟学词句、5 分钟听、5 分钟练语法、5 分钟读、7 分钟开口表达；完成后隔天复习。课程可离线使用。</p><p class="tip">进度只保存在这台设备，请定期导出备份。完成课程测评是站内学习记录，不等同于正式 CEFR 证书。</p>`);
    const next = firstUnfinished();
    if (next >= 0) button(progress.cursor ? "继续上次学习" : `开始第 ${next + 1} 单元`, () => openUnit(progress.cursor ? progress.cursor.unit : next));
    if (dueCount()) button(`复习到期单元（${dueCount()}）`, () => openReview(A1_UNITS.findIndex((_, i) => due(i))), "secondary");
    if (next < 0) button("阶段综合测评", startExam, "primary");
    A1_CHAPTERS.forEach((name, chapter) => {
      const h = document.createElement("h3"); h.textContent = `第 ${chapter + 1} 主题 · ${name}`; panel.appendChild(h);
      A1_UNITS.forEach((item, i) => { if (item.chapter !== chapter) return;
        const b = document.createElement("button"); b.className = "choice";
        b.textContent = `${String(i + 1).padStart(2, "0")} ${item.title} · ${progress.completed.includes(i) ? due(i) ? "待复习" : "已学" : "未学"}`;
        b.onclick = () => openUnit(i); panel.appendChild(b);
      });
    });
    if (progress.exam) { const p = document.createElement("p"); p.className = "tip"; p.textContent = `最近测评：${progress.exam.score}/12${progress.exam.score >= 10 ? "，达到站内测评要求" : "，可继续复习再试"}。`; panel.appendChild(p); }
  };
  const lesson = () => {
    screen = "lesson"; clean(); const item = A1_UNITS[unit];
    position.textContent = `第 ${unit + 1}/24 单元 · ${A1_CHAPTERS[item.chapter]} · ${["学词句", "词汇回想", "听力", "语法", "阅读", "表达"][step]}`;
    if (step === 0) {
      html(`<h2>${esc(item.title)}</h2><p>${esc(item.goal)}</p><h3>6 个常用词</h3>`);
      item.words.forEach(([en, zh]) => { const p = document.createElement("p"); p.className = "course-word"; p.textContent = `${en} · ${zh}`; panel.appendChild(p);
        const b = document.createElement("button"); b.className = "course-sound"; b.textContent = "♪"; b.setAttribute("aria-label", `朗读 ${en}`); b.onclick = () => speak(en); p.appendChild(b);
      });
      const h = document.createElement("h3"); h.textContent = "句型与例句"; panel.appendChild(h);
      const rule = document.createElement("p"); rule.textContent = item.rule; panel.appendChild(rule);
      item.examples.forEach(([en, zh]) => { const p = document.createElement("p"); p.className = "dialogue-line"; p.textContent = en; const small = document.createElement("small"); small.textContent = zh; p.appendChild(small); panel.appendChild(p); });
      button("开始练习 →", () => moveStep(1));
    } else if (step === 1) {
      const [en, zh] = item.words[word]; html(`<h2>这个词是什么意思？</h2><p class="course-large">${esc(en)}</p><p class="tip">第 ${word + 1}/6 词 · 先回想，再选择</p>`); play(en);
      const distractors = item.words.filter((_, i) => i !== word).slice((word + 1) % 3, (word + 1) % 3 + 2).map(pair => pair[1]);
      const question = { options: [zh, ...distractors], answer: 0 };
      choices(question, unit + word, correct => { if (correct) { if (word === 5) moveStep(2); else { word++; progress.cursor.word = word; save(); lesson(); } } else feedback(`再想一想：${en} 是“${zh}”。`); });
    } else if (step === 2) {
      html(`<h2>听一段对话</h2><p>先听英文，再回答问题。可以重复播放。</p><p>${esc(item.listen.prompt)}</p>`);
      play(item.dialogue.map(line => line[1]).join(" "), "♪ 播放对话");
      choices(item.listen, unit + 2, correct => { if (correct) { feedback("答对了！现在可以查看原文，或继续学习。"); const box = document.createElement("div");
        item.dialogue.forEach(([who, en, zh]) => { const p = document.createElement("p"); p.className = "dialogue-line"; p.textContent = `${who}: ${en}`; const sm = document.createElement("small"); sm.textContent = zh; p.appendChild(sm); box.appendChild(p); }); panel.appendChild(box);
        actions.replaceChildren(); button("继续学语法 →", () => moveStep(3));
      } else feedback("再听一遍，注意对话中的关键信息。") });
    } else if (step === 3) {
      html(`<h2>语法小练习</h2><p>${esc(item.rule)}</p><p>${esc(item.grammar.prompt)}</p>`);
      choices(item.grammar, unit + 3, correct => { if (correct) { feedback(`答对了。${item.grammar.why}`); actions.replaceChildren(); button("继续阅读 →", () => moveStep(4)); }
        else feedback(`再试一次。提示：${item.grammar.why}`); });
    } else if (step === 4) {
      html(`<h2>阅读理解</h2><p class="dialogue-line">${esc(item.reading.en)}</p><p>${esc(item.reading.prompt)}</p>`);
      play(item.reading.en, "♪ 朗读短文");
      choices(item.reading, unit + 4, correct => { if (correct) { feedback(`答对了。参考译文：${item.reading.zh}`); actions.replaceChildren(); button("继续表达 →", () => moveStep(5)); }
        else feedback("再读一遍短文，找出与问题相关的信息。"); });
    } else {
      html(`<h2>开口表达</h2><p>${esc(item.output.prompt)}</p><p class="tip">先自己写，再看参考答案。请大声朗读；这里不进行发音评分。</p>`);
      const input = document.createElement("textarea"); input.className = "write-box"; input.maxLength = 600; input.placeholder = "写出你的英文表达"; input.value = progress.outputs[unit] || ""; panel.appendChild(input);
      const sample = document.createElement("p"); sample.className = "dialogue-line"; sample.hidden = true; sample.textContent = `参考：${item.output.sample}`; panel.appendChild(sample);
      const show = document.createElement("button"); show.className = "utility-button"; show.textContent = "查看参考表达"; show.onclick = () => { sample.hidden = false; speak(item.output.sample); }; panel.appendChild(show);
      button("保存表达并完成单元", () => { const answer = input.value.trim(); if (answer.length < 5) { feedback("请先写一句英文，再朗读自己的句子。"); return; }
        progress.outputs[unit] = answer;
        if (!progress.completed.includes(unit)) progress.completed.push(unit);
        if (!progress.review[unit]) progress.review[unit] = { passes: 0, nextAt: Date.now() + 86400000 };
        progress.cursor = null; save(); summary(); finishUnit(); });
    }
    button("返回课程目录", overview, "secondary");
  };
  const finishUnit = () => { clean(); const item = A1_UNITS[unit]; position.textContent = `第 ${unit + 1} 单元已完成`;
    html(`<h2>完成了：${esc(item.title)}</h2><p>明天回来做第一次复习，再过 3 天做第二次复习。也可以随时重学这个单元。</p><p class="tip">你的表达：${esc(progress.outputs[unit])}</p>`);
    const next = firstUnfinished(); if (next >= 0) button(`学习第 ${next + 1} 单元 →`, () => openUnit(next));
    button("返回课程目录", overview, "secondary"); };
  const openReview = i => { reviewUnit = i; reviewQuestion = 0; screen = "review"; renderReview(); };
  const renderReview = () => { clean(); const item = A1_UNITS[reviewUnit]; const question = reviewQuestion === 0 ? item.grammar : item.review;
    position.textContent = `${item.title} · 间隔复习 ${reviewQuestion + 1}/2`;
    html(`<h2>回想后作答</h2><p>${esc(question.prompt)}</p>`);
    choices(question, reviewUnit + reviewQuestion + (progress.review[reviewUnit] || { passes: 0 }).passes + 1, correct => {
      if (!correct) { feedback("这题还没记牢。先回顾本单元，再回来复习。" ); actions.replaceChildren(); button("重学本单元", () => { progress.cursor = null; save(); openUnit(reviewUnit); }); button("返回目录", overview, "secondary"); return; }
      if (reviewQuestion === 0) { reviewQuestion = 1; renderReview(); return; }
      const r = progress.review[reviewUnit]; r.passes = Math.min(2, r.passes + 1); r.nextAt = r.passes === 1 ? Date.now() + 3 * 86400000 : 0; save(); summary();
      clean(); position.textContent = `${item.title} · 复习完成`; html(`<h2>记住了！</h2><p>${r.passes === 2 ? "这个单元已完成两次间隔复习。" : "3 天后再回顾一次，记忆会更牢。"}</p>`);
      button("返回课程目录", overview);
    });
    button("返回目录", overview, "secondary");
  };
  const examUnits = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const startExam = () => { examQuestion = 0; examScore = 0; examWriting = ""; screen = "exam"; renderExam(); };
  const renderExam = () => { clean(); position.textContent = `阶段 1 综合测评 · ${examQuestion + 1}/12`;
    const i = examUnits[examQuestion], item = A1_UNITS[i], q = examQuestion % 2 ? item.grammar : item.review;
    html(`<h2>${esc(A1_CHAPTERS[item.chapter])}</h2><p>${esc(q.prompt)}</p>`);
    choices(q, examQuestion + Date.now() % 3, correct => { if (correct) examScore++; examQuestion++;
      if (examQuestion < 12) renderExam(); else renderExamWriting(); });
    button("退出测评", overview, "secondary");
  };
  const renderExamWriting = () => { clean(); position.textContent = "阶段 1 综合测评 · 表达任务";
    html(`<h2>完成一段日常交流</h2><p>用英文写至少 3 句话：介绍自己，提出见面时间和地点，再表达一个需求。请大声朗读。</p><p class="tip">选择题由系统判分；这段表达需由你对照课程示例自查，系统不会自动评判口语或写作能力。</p>`);
    const input = document.createElement("textarea"); input.className = "write-box"; input.maxLength = 600; input.placeholder = "Hi, I'm ..."; input.value = examWriting; panel.appendChild(input);
    button("提交测评", () => { examWriting = input.value.trim(); const sentences = (examWriting.match(/[.!?。！？]/g) || []).length;
      if (examWriting.length < 40 || sentences < 3) { feedback("请写出至少 3 句英文，并用句号或问号分隔。"); return; }
      progress.exam = { score: examScore, at: Date.now() }; save(); summary(); clean(); position.textContent = "阶段 1 综合测评结果";
      html(`<h2>${examScore >= 10 ? "选择题达标" : "继续巩固"}</h2><p>选择题 ${examScore}/12。${examScore >= 10 ? "已达到站内测评的选择题要求。" : "建议复习相关单元后重试。"}</p><p class="dialogue-line">${esc(examWriting)}</p><p class="tip">写作与口语需要对照示例或请老师反馈；此分数不代表完整 A1 能力认证。</p>`);
      button("返回课程目录", overview); });
    button("退出测评", overview, "secondary");
  };
  $("course-open").onclick = () => { view.hidden = false; overview(); };
  $("course-close").onclick = () => { view.hidden = true; if ("speechSynthesis" in window) speechSynthesis.cancel(); summary(); };
  summary();
}

if (typeof document !== "undefined") startCourse();
if (typeof module !== "undefined") module.exports = { COURSE_KEY, freshCourse, validCourse };
