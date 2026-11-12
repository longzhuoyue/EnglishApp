const COURSE_KEY = "wordspring-a1-course-v1";
const A2_COURSE_KEY = "wordspring-a2-course-v1";
const ADVANCED_COURSE_KEYS = ["b1", "b2", "c1", "c2"].map(code => `wordspring-${code}-course-v1`);

function validAdvancedPack(pack) {
  const question = q => q && typeof q.prompt === "string" && Array.isArray(q.options) && q.options.length === 3 &&
    q.options.every(value => typeof value === "string") && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3;
  const pair = item => item && typeof item.en === "string" && typeof item.zh === "string";
  return pack && typeof pack === "object" && JSON.stringify(pack).length <= 14000 &&
    Array.isArray(pack.words) && pack.words.length === 6 && pack.words.every(pair) &&
    new Set(pack.words.map(item => item.zh.trim())).size >= 3 &&
    Array.isArray(pack.examples) && pack.examples.length === 2 && pack.examples.every(pair) &&
    Array.isArray(pack.clips) && pack.clips.length === 3 && pack.clips.every(clip =>
      clip && ["a", "aZh", "b", "bZh"].every(key => typeof clip[key] === "string") && question(clip)) &&
    Array.isArray(pack.grammar) && pack.grammar.length === 3 && pack.grammar.every(question) &&
    pack.reading && typeof pack.reading.en === "string" && typeof pack.reading.zh === "string" &&
    Array.isArray(pack.reading.questions) && pack.reading.questions.length === 3 && pack.reading.questions.every(question) &&
    pack.output && typeof pack.output.prompt === "string" && typeof pack.output.sample === "string";
}

function freshCourse() { return { completed: [], review: {}, cursor: null, outputs: {}, corrections: {}, answers: {}, examDraft: null, exam: null }; }

function validCourse(value, unitCount = 24, examCount = 12) {
  const index = n => Number.isInteger(n) && n >= 0 && n < unitCount;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !Array.isArray(value.completed) || !value.completed.every(index) ||
      !value.review || typeof value.review !== "object" || Array.isArray(value.review) ||
      !value.outputs || typeof value.outputs !== "object" || Array.isArray(value.outputs)) return false;
  if (value.cursor !== null && (!value.cursor || !index(value.cursor.unit) ||
      !Number.isInteger(value.cursor.step) || value.cursor.step < 0 || value.cursor.step > 5 ||
      !Number.isInteger(value.cursor.word) || value.cursor.word < 0 || value.cursor.word > 5 ||
      (value.cursor.question !== undefined && (!Number.isInteger(value.cursor.question) || value.cursor.question < 0 || value.cursor.question > 2)))) return false;
  if (!Object.entries(value.review).every(([key, item]) => index(Number(key)) &&
      item && Number.isInteger(item.passes) && item.passes >= 0 && item.passes <= 2 &&
      Number.isFinite(item.nextAt) && item.nextAt >= 0)) return false;
  if (!Object.entries(value.outputs).every(([key, answer]) => index(Number(key)) && typeof answer === "string" && answer.length <= 600)) return false;
  if (value.corrections !== undefined && (!value.corrections || typeof value.corrections !== "object" || Array.isArray(value.corrections) ||
      !Object.entries(value.corrections).every(([key, result]) => index(Number(key)) && result &&
        ["source", "corrected", "meaning", "reason"].every(field => typeof result[field] === "string" && result[field].length <= 800)))) return false;
  if (value.answers !== undefined && (!value.answers || typeof value.answers !== "object" || Array.isArray(value.answers) ||
      !Object.entries(value.answers).every(([key, groups]) => index(Number(key)) && groups &&
        ["words", "listening", "grammar", "reading"].every(name => groups[name] === undefined ||
          (Array.isArray(groups[name]) && groups[name].length <= 6 && groups[name].every(answer => answer === true || answer === null)))))) return false;
  if (value.packs !== undefined && (unitCount <= 28 || !value.packs || typeof value.packs !== "object" ||
      Array.isArray(value.packs) || !Object.entries(value.packs).every(([key, pack]) => index(Number(key)) && validAdvancedPack(pack)))) return false;
  if (value.examDraft !== undefined && value.examDraft !== null && (!value.examDraft ||
      !Array.isArray(value.examDraft.answers) || value.examDraft.answers.length !== examCount ||
      !value.examDraft.answers.every(answer => answer === null || Number.isInteger(answer) && answer >= 0 && answer < 3) ||
      !Number.isInteger(value.examDraft.index) || value.examDraft.index < 0 || value.examDraft.index > examCount ||
      typeof value.examDraft.writing !== "string" || value.examDraft.writing.length > 600 ||
      !validCorrection(value.examDraft.correction))) return false;
  return value.exam === null || (value.exam && Number.isInteger(value.exam.score) && value.exam.score >= 0 &&
    value.exam.score <= examCount && Number.isFinite(value.exam.at) && value.exam.at >= 0 &&
    (value.exam.wrong === undefined || Array.isArray(value.exam.wrong) && value.exam.wrong.length <= examCount &&
      value.exam.wrong.every(item => item && Number.isInteger(item.number) && item.number >= 1 && item.number <= examCount &&
        ["prompt", "selected", "correct", "explanation"].every(field => typeof item[field] === "string" && item[field].length <= 800))) &&
    (value.exam.writing === undefined || typeof value.exam.writing === "string" && value.exam.writing.length <= 600) &&
    validCorrection(value.exam.correction));
}

function validCorrection(value) {
  return value === undefined || value === null || (value && typeof value === "object" &&
    ["source", "corrected", "meaning", "reason"].every(field => typeof value[field] === "string" && value[field].length <= 800));
}

function startCourse(config) {
  const $ = id => document.getElementById(id);
  const { key, prefix, stage, label, chapters, examUnits, passScore, examPrompt } = config;
  const units = config.units.slice(), more = (config.more || []).slice(), clips = (config.clips || []).slice();
  const view = $(`${prefix}-view`), panel = $(`${prefix}-content`), actions = $(`${prefix}-actions`), position = $(`${prefix}-position`);
  let progress;
  try { progress = JSON.parse(localStorage.getItem(key) || "null"); } catch { /* Corrupt local data falls back to an empty course. */ }
  if (!validCourse(progress, units.length, examUnits.length)) progress = freshCourse();
  if (!progress.corrections) progress.corrections = {};
  if (!progress.answers) progress.answers = {};
  if (progress.examDraft === undefined) progress.examDraft = null;
  if (config.dynamic && (!progress.packs || typeof progress.packs !== "object" || Array.isArray(progress.packs))) progress.packs = {};
  let screen = "overview", unit = 0, step = 0, word = 0, question = 0, checking = false, checkId = 0, checkController = null;
  let reviewUnit = 0, reviewQuestion = 0;
  const save = () => { try { localStorage.setItem(key, JSON.stringify(progress)); } catch { $(`${prefix}-summary`).textContent = "进度保存失败，请检查 Safari 存储空间。"; } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const button = (label, fn, style = "primary") => { const b = document.createElement("button"); b.className = style; b.textContent = label; b.onclick = fn; actions.appendChild(b); return b; };
  const clean = () => { panel.replaceChildren(); actions.replaceChildren(); position.textContent = ""; };
  const html = markup => { panel.innerHTML = markup; };
  const due = i => { const r = progress.review[i]; return r && r.passes < 2 && r.nextAt <= Date.now(); };
  const dueCount = () => units.filter((_, i) => due(i)).length;
  const firstUnfinished = () => units.findIndex((_, i) => !progress.completed.includes(i));
  const summary = () => { $(`${prefix}-summary`).textContent = `${progress.completed.length}/${units.length} 单元完成 · ${dueCount()} 个待复习${progress.exam && progress.exam.score >= passScore ? " · 阶段测评通过" : ""}`; };
  const speak = text => {
    if (!("speechSynthesis" in window)) { position.textContent = "这台设备暂不支持朗读。"; return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.82; speechSynthesis.speak(u);
  };
  const play = (text, label = "♪ 播放英文") => { const b = document.createElement("button"); b.className = "utility-button"; b.textContent = label; b.onclick = () => speak(text); panel.appendChild(b); };
  const choices = (question, seed, onAnswer, selected = null, locked = false) => {
    const rotation = seed % question.options.length;
    question.options.forEach((_, display) => {
      const original = (display + rotation) % question.options.length;
      const b = document.createElement("button"); b.className = "choice"; b.textContent = question.options[original];
      if (original === selected) b.setAttribute("aria-pressed", "true");
      b.disabled = locked;
      b.onclick = () => onAnswer(original === question.answer, question.options[question.answer], original); panel.appendChild(b);
    });
  };
  const feedback = text => { let el = $(`${prefix}-feedback`); if (!el) { el = document.createElement("p"); el.id = `${prefix}-feedback`; el.className = "feedback"; panel.appendChild(el); } el.textContent = text; };
  const installPack = (i, pack) => {
    const outline = units[i], first = pack.clips[0], reading = pack.reading;
    units[i] = { ...outline, words: pack.words.map(item => [item.en, item.zh]),
      examples: pack.examples.map(item => [item.en, item.zh]),
      dialogue: [["A", first.a, first.aZh], ["B", first.b, first.bZh]],
      listen: { prompt: first.prompt, options: first.options, answer: first.answer },
      grammar: pack.grammar[0], reading: { en: reading.en, zh: reading.zh, ...reading.questions[0] },
      output: pack.output, review: pack.grammar[2] };
    more[i] = [pack.grammar[1], ...reading.questions.slice(1)];
    clips[i] = pack.clips.slice(1).map(clip => ({ dialogue: [["A", clip.a, clip.aZh], ["B", clip.b, clip.bZh]],
      prompt: clip.prompt, options: clip.options, answer: clip.answer }));
  };
  if (config.dynamic) Object.entries(progress.packs).forEach(([key, pack]) => {
    const i = Number(key); if (Number.isInteger(i) && i >= 0 && i < units.length && validAdvancedPack(pack)) installPack(i, pack);
  });
  const prepareUnit = async (i, resume) => {
    if (!config.dynamic || more[i]) return resume();
    screen = "loading"; clean(); position.textContent = `第 ${i + 1}/${units.length} 单元 · 准备练习`;
    html(`<h2>${esc(units[i].title)}</h2><p>${esc(units[i].goal)}</p><p>${esc(units[i].rule)}</p><p class="tip">首次打开此单元需要联网生成练习。通过内容检查后会保存在本机，以后可以离线重练。</p>`);
    let code = "";
    try { code = JSON.parse(localStorage.getItem("wordspring-ai-settings-v1") || "{}").passcode || ""; } catch { /* Settings can be entered again. */ }
    if (!code) { feedback("请先在“AI 英语老师 → 服务设置”中填写访问口令。");
      button("返回课程目录", overview, "secondary"); return; }
    feedback("正在准备本单元的词汇、听力、语法、阅读和表达，请稍等……");
    const controller = new AbortController(), current = ++checkId; checkController = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch("https://wordspring-ai-pages.pages.dev/course", {
        method: "POST", headers: { "content-type": "application/json", "x-wordspring-passcode": code },
        body: JSON.stringify({ level: config.code, sequence: i, title: units[i].title, goal: units[i].goal, rule: units[i].rule }),
        signal: controller.signal
      });
      const pack = await response.json();
      if (!response.ok) throw new Error(pack.error || "课程准备失败。");
      if (!validAdvancedPack(pack)) throw new Error("课程内容不完整，请再试一次。");
      if (current !== checkId || screen !== "loading" || view.hidden) return;
      progress.packs[i] = pack; installPack(i, pack); save(); resume();
    } catch (error) {
      if (current !== checkId || screen !== "loading" || view.hidden) return;
      feedback(error.name === "AbortError" ? "等待超时，请再试一次。" : error.message || "网络暂时不可用，请再试一次。");
      button("再试一次", () => prepareUnit(i, resume));
      button("返回课程目录", overview, "secondary");
    } finally { clearTimeout(timeout); if (current === checkId) checkController = null; }
  };
  const openUnit = i => { if (config.dynamic && !more[i]) return prepareUnit(i, () => openUnit(i));
    unit = i; const cursor = progress.cursor; step = cursor && cursor.unit === i ? cursor.step : 0; word = cursor && cursor.unit === i ? cursor.word : 0; question = cursor && cursor.unit === i ? cursor.question || 0 : 0; progress.cursor = { unit, step, word, question }; save(); screen = "lesson"; lesson(); view.scrollTop = 0; };
  const answerGroups = () => progress.answers[unit] || (progress.answers[unit] = {});
  const solved = (group, index) => !!(answerGroups()[group] || [])[index];
  const markSolved = (group, index) => { const groups = answerGroups(); if (!groups[group]) groups[group] = []; groups[group][index] = true; save(); lesson(); };
  const navigate = delta => {
    if (step === 5) cancelCheck();
    if (delta < 0) {
      if (step === 5) { step = 4; question = 2; }
      else if (step >= 2 && question > 0) question--;
      else if (step === 2) { step = 1; word = 5; }
      else if (step > 2) { step--; question = 2; }
      else if (step === 1 && word > 0) word--;
      else if (step === 1) step = 0;
      else return overview();
    } else {
      if (step === 0) { step = 1; word = 0; }
      else if (step === 1 && word < 5) word++;
      else if (step === 1) { step = 2; question = 0; }
      else if (step >= 2 && step <= 4 && question < 2) question++;
      else if (step >= 2 && step <= 4) { step++; question = 0; }
    }
    progress.cursor = { unit, step, word, question }; save(); lesson(); view.scrollTop = 0;
  };
  const questionNav = (group, index) => { button("上一题", () => navigate(-1), "secondary");
    button("下一题", () => navigate(1)).disabled = !solved(group, index); };
  const listeningClips = (item, index) => [{ dialogue: item.dialogue, ...item.listen }, ...clips[index]];
  const cancelCheck = () => { checkId++; if (checkController) checkController.abort(); checkController = null; checking = false; };
  const showCorrection = result => {
    const old = $(`${prefix}-correction`); if (old) old.remove();
    const box = document.createElement("div"); box.id = `${prefix}-correction`; box.className = "dialogue-line";
    [["上次批改的表达", result.source], ["建议表达", result.corrected], ["中文意思", result.meaning], ["修改原因", result.reason]].forEach(([label, value]) => {
      const p = document.createElement("p"); const strong = document.createElement("strong"); strong.textContent = `${label}：`;
      p.appendChild(strong); p.appendChild(document.createTextNode(value)); box.appendChild(p);
    });
    panel.appendChild(box);
    play(result.corrected, "♪ 朗读建议表达");
    if (result.source.trim().toLowerCase() !== result.corrected.trim().toLowerCase()) {
      const saveWrong = document.createElement("button"); saveWrong.className = "utility-button"; saveWrong.textContent = "加入错句本";
      saveWrong.onclick = () => { try { feedback(window.wordSpringNotebook.save(result) ? "已加入错句本，可以稍后复习。" : "这句无需加入错句本。"); }
        catch (error) { feedback(error.message || "错句保存失败。"); } };
      panel.appendChild(saveWrong);
    }
  };
  const gradeExpression = async input => {
    if (checking) return;
    const answer = input.value.trim();
    if (answer.length < 5) return feedback("请先写一句英文，再请 AI 老师批改。");
    let code = "";
    try { code = JSON.parse(localStorage.getItem("wordspring-ai-settings-v1") || "{}").passcode || ""; } catch { /* Settings can be entered again. */ }
    if (!code) return feedback("请先在“AI 英语老师 → 服务设置”中填写访问口令，也可以先保存答案。");
    progress.outputs[unit] = answer; save();
    const checkedUnit = unit, current = ++checkId;
    if (answer.length > 400) return feedback("AI 批改每次最多 400 字，请缩短后再试。");
    checking = true; const controller = new AbortController(); checkController = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    feedback("AI 老师正在批改文字，请稍等……");
    try {
      const response = await fetch("https://wordspring-ai-pages.pages.dev/teach", {
        method: "POST", headers: { "content-type": "application/json", "x-wordspring-passcode": code },
        body: JSON.stringify({ mode: "correct", messages: [
          { role: "assistant", content: `本单元表达任务：${units[checkedUnit].output.prompt} 请结合任务理解下一句英文。` },
          { role: "user", content: answer }
        ] }), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "批改服务暂时不可用。");
      if (current !== checkId || view.hidden || screen !== "lesson" || step !== 5 || unit !== checkedUnit) return;
      if (!["corrected", "meaning", "reason"].every(key => typeof result[key] === "string" && result[key].trim())) throw new Error("AI 批改内容不完整，请再试一次。");
      const correction = { source: answer, corrected: result.corrected, meaning: result.meaning, reason: result.reason };
      progress.corrections[unit] = correction; save(); showCorrection(correction);
      feedback("批改完成。你可以修改表达后再次批改，或完成本单元。");
    } catch (error) { if (current === checkId && !view.hidden) feedback(error.name === "AbortError" ? "批改等待超时，答案已保存，可再试一次。" : `${error.message || "网络暂时不可用"}；答案已保存，可再试一次。`); }
    finally { clearTimeout(timeout); if (current === checkId) { checkController = null; checking = false; } }
  };
  const gradeExamWriting = async input => {
    if (checking) return;
    const draft = progress.examDraft, answer = input.value.trim();
    draft.writing = answer; save();
    if (answer.length < 20) return feedback("请先写一段英文，再请 AI 老师批改。");
    if (answer.length > 400) return feedback("AI 批改每次最多 400 字，请缩短后再试。");
    let code = "";
    try { code = JSON.parse(localStorage.getItem("wordspring-ai-settings-v1") || "{}").passcode || ""; } catch { /* Settings can be entered again. */ }
    if (!code) return feedback("请先在“AI 英语老师 → 服务设置”中填写访问口令，也可以先保存写作。");
    checking = true; const current = ++checkId, controller = new AbortController(); checkController = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    feedback("AI 老师正在批改写作，请稍等……");
    try {
      const response = await fetch("https://wordspring-ai-pages.pages.dev/teach", {
        method: "POST", headers: { "content-type": "application/json", "x-wordspring-passcode": code },
        body: JSON.stringify({ mode: "correct", messages: [
          { role: "assistant", content: `阶段写作任务：${examPrompt} 请结合任务理解下一段英文。` },
          { role: "user", content: answer }
        ] }), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "批改服务暂时不可用。");
      if (current !== checkId || view.hidden || screen !== "exam-writing" || progress.examDraft !== draft) return;
      if (!["corrected", "meaning", "reason"].every(field => typeof result[field] === "string" && result[field].trim())) throw new Error("AI 批改内容不完整，请再试一次。");
      draft.correction = { source: answer, corrected: result.corrected, meaning: result.meaning, reason: result.reason };
      save(); showCorrection(draft.correction); feedback("批改完成。可以修改后再次批改，再提交测评。");
    } catch (error) { if (current === checkId && !view.hidden) feedback(error.name === "AbortError" ? "批改等待超时，写作已保存，可再试一次。" : `${error.message || "网络暂时不可用"}；写作已保存，可再试一次。`); }
    finally { clearTimeout(timeout); if (current === checkId) { checkController = null; checking = false; } }
  };
  const overview = () => {
    cancelCheck(); screen = "overview"; clean(); summary(); position.textContent = `阶段 ${stage} · ${label} · 建议每天 1 单元，约 30 分钟`;
    html(`<h2>${esc(label)} 系统课程</h2><p>${units.length} 单元 · ${chapters.length} 个主题。先学知识点，再练词汇、三段听力、语法、阅读和表达；完成后隔天复习。${config.dynamic ? "新单元首次打开需联网生成并检查内容，保存后可离线重练。" : "题目与复习可离线使用。"}AI 批改需要联网。</p><p class="tip">进度只保存在这台设备，请定期导出备份。课程测评是站内学习记录，不等同于正式 CEFR 证书。</p>`);
    const next = firstUnfinished();
    if (next >= 0) button(progress.cursor ? "继续上次学习" : `开始第 ${next + 1} 单元`, () => openUnit(progress.cursor ? progress.cursor.unit : next));
    if (dueCount()) button(`复习到期单元（${dueCount()}）`, () => openReview(units.findIndex((_, i) => due(i))), "secondary");
    if (next < 0) button(progress.examDraft ? "继续阶段测评" : "阶段综合测评", startExam, "primary");
    if (progress.exam) button("查看上次测评与错题", renderExamResult, "secondary");
    chapters.forEach((name, chapter) => {
      const h = document.createElement("h3"); h.textContent = `第 ${chapter + 1} 主题 · ${name}`; panel.appendChild(h);
      units.forEach((item, i) => { if (item.chapter !== chapter) return;
        const b = document.createElement("button"); b.className = "choice";
        b.textContent = `${String(i + 1).padStart(2, "0")} ${item.title} · ${progress.completed.includes(i) ? due(i) ? "待复习" : "已学" : "未学"}`;
        b.onclick = () => openUnit(i); panel.appendChild(b);
      });
    });
    if (progress.exam) { const p = document.createElement("p"); p.className = "tip"; p.textContent = `最近测评：${progress.exam.score}/${examUnits.length}${progress.exam.score >= passScore ? "，达到站内测评要求" : "，可继续复习再试"}。`; panel.appendChild(p); }
  };
  const lesson = () => {
    screen = "lesson"; clean(); const item = units[unit];
    position.textContent = `第 ${unit + 1}/${units.length} 单元 · ${chapters[item.chapter]} · ${["学词句", "词汇回想", "听力", "语法", "阅读", "表达"][step]}${step >= 2 && step <= 4 ? ` ${question + 1}/3` : ""}`;
    if (step === 0) {
      html(`<h2>${esc(item.title)}</h2><p>${esc(item.goal)}</p><h3>6 个常用词</h3>`);
      item.words.forEach(([en, zh]) => { const p = document.createElement("p"); p.className = "course-word"; p.textContent = `${en} · ${zh}`; panel.appendChild(p);
        const b = document.createElement("button"); b.className = "course-sound"; b.textContent = "♪"; b.setAttribute("aria-label", `朗读 ${en}`); b.onclick = () => speak(en); p.appendChild(b);
      });
      const h = document.createElement("h3"); h.textContent = "句型与例句"; panel.appendChild(h);
      const rule = document.createElement("p"); rule.textContent = item.rule; panel.appendChild(rule);
      item.examples.forEach(([en, zh]) => { const p = document.createElement("p"); p.className = "dialogue-line"; p.textContent = en; const small = document.createElement("small"); small.textContent = zh; p.appendChild(small); panel.appendChild(p); });
      button("开始练习 →", () => navigate(1));
    } else if (step === 1) {
      const [en, zh] = item.words[word]; html(`<h2>这个词是什么意思？</h2><p class="course-large">${esc(en)}</p><p class="tip">第 ${word + 1}/6 词 · 先回想，再选择</p>`); play(en);
      const distractors = [...new Set(item.words.filter((pair, i) => i !== word && pair[1] !== zh).map(pair => pair[1]))];
      const offset = (word + 1) % distractors.length;
      const q = { options: [zh, distractors[offset], distractors[(offset + 1) % distractors.length]], answer: 0 };
      choices(q, unit + word, correct => { if (correct) markSolved("words", word); else feedback(`再想一想：${en} 是“${zh}”。`); }, solved("words", word) ? 0 : null, solved("words", word));
      if (solved("words", word)) feedback(`答对了：${en} 是“${zh}”。`);
      questionNav("words", word);
    } else if (step === 2) {
      const clip = listeningClips(item, unit)[question];
      html(`<h2>第 ${question + 1} 段对话</h2><p>先听英文，再回答这段对话的问题。可以重复播放。</p><p>${esc(clip.prompt)}</p>`);
      play(clip.dialogue.map(line => line[1]).join(" "), "♪ 播放这段对话");
      choices(clip, unit + question + 2, correct => { if (!correct) return feedback("再听一遍，注意对话中的关键信息。"); markSolved("listening", question);
      }, solved("listening", question) ? clip.answer : null, solved("listening", question));
      if (solved("listening", question)) {
        const box = document.createElement("div");
        clip.dialogue.forEach(([who, en, zh]) => { const p = document.createElement("p"); p.className = "dialogue-line"; p.textContent = `${who}: ${en}`; const sm = document.createElement("small"); sm.textContent = zh; p.appendChild(sm); box.appendChild(p); }); panel.appendChild(box);
        feedback("答对了！下面是这段对话的原文和译文。");
      }
      questionNav("listening", question);
    } else if (step === 3) {
      const q = [item.grammar, more[unit][0], item.review][question];
      html(`<h2>语法小练习</h2><p>${esc(item.rule)}</p><p>${esc(q.prompt)}</p>`);
      choices(q, unit + question + 3, correct => { if (correct) markSolved("grammar", question); else feedback(`再试一次。${q.why || "回想这一单元的句型。"}`); }, solved("grammar", question) ? q.answer : null, solved("grammar", question));
      if (solved("grammar", question)) feedback(`答对了。${q.why || "这个句型用得对。"}`);
      questionNav("grammar", question);
    } else if (step === 4) {
      const q = [item.reading, ...more[unit].slice(1)][question];
      html(`<h2>阅读理解</h2><p class="dialogue-line">${esc(item.reading.en)}</p><p>${esc(q.prompt)}</p>`);
      play(item.reading.en, "♪ 朗读短文");
      choices(q, unit + question + 4, correct => { if (correct) markSolved("reading", question); else feedback("再读一遍短文，找出与问题相关的信息。"); }, solved("reading", question) ? q.answer : null, solved("reading", question));
      if (solved("reading", question)) feedback(`答对了。${question === 2 ? `参考译文：${item.reading.zh}` : "继续下一题。"}`);
      questionNav("reading", question);
    } else {
      html(`<h2>表达与 AI 纠错</h2><p>${esc(item.output.prompt)}</p><p class="tip">先写或用键盘语音输入，再点“AI 批改纠错”。AI 每次重点纠正一处文字问题，需要联网和现有免费额度；不评发音。断网时可以先保存。</p>`);
      const input = document.createElement("textarea"); input.className = "write-box"; input.maxLength = 600; input.placeholder = "写出你的英文表达"; input.value = progress.outputs[unit] || ""; panel.appendChild(input);
      input.oninput = () => { progress.outputs[unit] = input.value; save(); };
      const sample = document.createElement("p"); sample.className = "dialogue-line"; sample.hidden = true; sample.textContent = `参考：${item.output.sample}`; panel.appendChild(sample);
      const show = document.createElement("button"); show.className = "utility-button"; show.textContent = "查看参考表达"; show.onclick = () => { sample.hidden = false; speak(item.output.sample); }; panel.appendChild(show);
      const prior = progress.corrections[unit]; if (prior) showCorrection(prior);
      button("上一题", () => navigate(-1), "secondary");
      button("AI 批改纠错", () => gradeExpression(input));
      button("保存并完成", () => { const answer = input.value.trim(); if (answer.length < 5) { feedback("请先写一句英文，再朗读自己的句子。"); return; }
        cancelCheck();
        progress.outputs[unit] = answer;
        if (!progress.completed.includes(unit)) progress.completed.push(unit);
        if (!progress.review[unit]) progress.review[unit] = { passes: 0, nextAt: Date.now() + 86400000 };
        progress.cursor = null; save(); summary(); finishUnit(); });
    }
    if (step !== 5) button("返回课程目录", overview, "secondary");
  };
  const finishUnit = () => { clean(); const item = units[unit]; position.textContent = `第 ${unit + 1} 单元已完成`;
    html(`<h2>完成了：${esc(item.title)}</h2><p>明天回来做第一次复习，再过 3 天做第二次复习。也可以随时重学这个单元。</p><p class="tip">你的表达：${esc(progress.outputs[unit])}</p>`);
    const next = firstUnfinished(); if (next >= 0) button(`学习第 ${next + 1} 单元 →`, () => openUnit(next));
    button("返回课程目录", overview, "secondary"); };
  const openReview = i => { if (config.dynamic && !more[i]) return prepareUnit(i, () => openReview(i));
    reviewUnit = i; reviewQuestion = 0; screen = "review"; renderReview(); };
  const renderReview = () => { clean(); const item = units[reviewUnit]; const question = reviewQuestion === 0 ? item.grammar : item.review;
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
  const examQuestionAt = n => { const item = units[examUnits[n]]; return n % 2 ? item.grammar : item.review; };
  const startExam = () => { if (config.dynamic) { const missing = examUnits.find(i => !more[i]);
      if (missing !== undefined) return prepareUnit(missing, startExam); }
    if (!progress.examDraft) progress.examDraft = { answers: Array(examUnits.length).fill(null), index: 0, writing: "" }; save();
    if (progress.examDraft.index === examUnits.length) renderExamWriting(); else renderExam(); };
  const renderExam = () => { if (screen === "exam-writing") cancelCheck(); screen = "exam"; clean(); const draft = progress.examDraft, n = draft.index;
    position.textContent = `阶段 ${stage} 综合测评 · 第 ${n + 1}/${examUnits.length} 题`;
    const item = units[examUnits[n]], q = examQuestionAt(n);
    html(`<h2>${esc(chapters[item.chapter])}</h2><p>${esc(q.prompt)}</p><p class="tip">可返回修改答案；交卷后统一计分。</p>`);
    choices(q, n + 3, (_correct, _answer, selected) => { draft.answers[n] = selected; save(); renderExam(); }, draft.answers[n]);
    button("上一题", () => { draft.index--; save(); renderExam(); }, "secondary").disabled = n === 0;
    button(n === examUnits.length - 1 ? "进入写作 →" : "下一题 →", () => { draft.index++; save();
      if (draft.index === examUnits.length) renderExamWriting(); else renderExam(); });
    button("退出", overview, "secondary");
  };
  const renderExamWriting = () => { screen = "exam-writing"; clean(); const draft = progress.examDraft;
    position.textContent = `阶段 ${stage} 综合测评 · 写作`;
    html(`<h2>写作任务</h2><p>${esc(examPrompt)}</p><p class="tip">AI 可以批改文字并给出修改建议，不评发音。交卷时只用选择题判定站内测评是否达标。</p>`);
    const input = document.createElement("textarea"); input.className = "write-box"; input.maxLength = 600; input.placeholder = "在这里写英文"; input.value = draft.writing; panel.appendChild(input);
    input.oninput = () => { draft.writing = input.value; save(); };
    if (draft.correction) showCorrection(draft.correction);
    const missing = draft.answers.map((answer, i) => answer === null ? i + 1 : null).filter(Boolean);
    if (missing.length) feedback(`未答题号：${missing.join("、")}。可以返回补答。`);
    button("上一题", () => { draft.index = examUnits.length - 1; save(); renderExam(); }, "secondary");
    button("AI 批改写作", () => gradeExamWriting(input));
    button("提交测评", () => { draft.writing = input.value.trim(); save();
      const unanswered = draft.answers.findIndex(answer => answer === null);
      if (unanswered >= 0) return feedback(`第 ${unanswered + 1} 题还未作答，请返回完成。`);
      const sentences = (draft.writing.match(/[.!?。！？]/g) || []).length;
      if (draft.writing.length < 40 || sentences < 3) return feedback("请写出至少 3 句英文，并用句号或问号分隔。");
      const wrong = []; let score = 0;
      draft.answers.forEach((answer, i) => { const q = examQuestionAt(i); if (answer === q.answer) score++; else wrong.push({ number: i + 1,
        prompt: q.prompt, selected: q.options[answer], correct: q.options[q.answer], explanation: q.why || units[examUnits[i]].rule }); });
      cancelCheck(); progress.exam = { score, at: Date.now(), wrong, writing: draft.writing, correction: draft.correction || null };
      progress.examDraft = null; save(); summary(); renderExamResult();
    });
  };
  const renderExamResult = () => { screen = "exam-result"; clean(); const result = progress.exam;
    position.textContent = `阶段 ${stage} 综合测评结果`;
    html(`<h2>${result.score >= passScore ? "选择题达标" : "继续巩固"}</h2><p>选择题 ${result.score}/${examUnits.length}。</p><p>${result.wrong ? result.wrong.length ? `错题题号：${result.wrong.map(item => item.number).join("、")}` : "选择题全部答对！" : "旧版记录只有总分；重新测评可查看错题。"}</p><p class="tip">写作批改为学习建议，站内达标仅按选择题判定，不代表正式 ${esc(label)} 认证。</p>`);
    (result.wrong || []).forEach(item => { const p = document.createElement("p"); p.className = "dialogue-line";
      p.textContent = `第 ${item.number} 题：${item.prompt}\n你的选择：${item.selected}\n正确答案：${item.correct}\n说明：${item.explanation}`; panel.appendChild(p); });
    if (result.writing) { const p = document.createElement("p"); p.className = "dialogue-line"; p.textContent = `你的写作：${result.writing}`; panel.appendChild(p); }
    if (result.correction) showCorrection(result.correction);
    button("返回课程目录", overview);
    button("重新测评", () => { progress.examDraft = null; startExam(); }, "secondary");
  };
  $(`${prefix}-open`).onclick = () => { view.hidden = false; overview(); };
  $(`${prefix}-close`).onclick = () => { cancelCheck(); view.hidden = true; if ("speechSynthesis" in window) speechSynthesis.cancel(); summary(); };
  summary();
}

if (typeof document !== "undefined") {
  startCourse({ key: COURSE_KEY, prefix: "course", stage: 1, label: "A1 入门", chapters: A1_CHAPTERS, units: A1_UNITS,
    more: A1_MORE, clips: A1_LISTENING_MORE, examUnits: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22], passScore: 10,
    examPrompt: "用英文写至少 3 句话：介绍自己，提出见面时间和地点，再表达一个需求。请大声朗读。" });
  startCourse({ key: A2_COURSE_KEY, prefix: "a2-course", stage: 2, label: "A2 基础", chapters: A2_CHAPTERS, units: A2_UNITS,
    more: A2_MORE, clips: A2_LISTENING_MORE, examUnits: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26], passScore: 12,
    examPrompt: "写 4—5 句英文：讲述一次过去的经历，说明一个未来计划，再给朋友一条建议。请大声朗读。" });
  ADVANCED_STAGES.forEach((plan, index) => startCourse({ key: ADVANCED_COURSE_KEYS[index], prefix: `${plan.code}-course`,
    stage: plan.stage, code: plan.code, label: plan.label, chapters: plan.chapterNames, units: plan.units,
    examUnits: plan.units.map((_, i) => i).filter(i => i % 2 === 0), passScore: Math.ceil(plan.units.length * 0.4),
    examPrompt: `围绕“${plan.chapters.at(-1).goal}”写一段 5—7 句的英文，说明事实、观点、理由和一个限制条件。请大声朗读。`,
    dynamic: true }));
}
if (typeof module !== "undefined") module.exports = { COURSE_KEY, A2_COURSE_KEY, ADVANCED_COURSE_KEYS, freshCourse, validCourse, validAdvancedPack };
