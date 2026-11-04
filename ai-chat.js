const ROLEPLAY_KEY = "wordspring-roleplay-v1";
function validRoleplayProgress(value) {
  return Array.isArray(value) && value.length <= 100 && value.every(item => item &&
    ["cafe", "directions", "shop", "hotel"].includes(item.scene) && Number.isFinite(item.when));
}

function startAiChat() {
  const $ = id => document.getElementById(id);
  const STORAGE = "wordspring-ai-settings-v1";
  const ENDPOINT = "https://wordspring-ai-pages.pages.dev";
  let settings = { passcode: "" };
  let messages = [];
  const teacherMessages = { ask: [], correct: [] };
  let recorder = null;
  let stream = null;
  let timer = null;
  let busy = false;
  let mode = "chat";
  let translatedDirection = "zh-en";
  let roleplayMessages = [];
  let roleplayTurn = 0;
  let roleplayDone = false;
  let roleplaySession = 0;
  let roleplayProgress = [];
  const goals = { cafe: "目标：点一杯饮料，说出杯型并确认价格。可以从 “I'd like a coffee, please.” 开始。",
    directions: "目标：问到图书馆怎么走，并确认一个方向。可以从 “Where is the library?” 开始。",
    shop: "目标：询问商品和尺码，最后表示要买。可以从 “Do you have this in medium?” 开始。",
    hotel: "目标：办理入住并询问早餐时间。可以从 “I'd like to check in.” 开始。" };

  try { settings = { ...settings, ...JSON.parse(localStorage.getItem(STORAGE) || "{}") }; } catch { /* Settings can be entered again. */ }
  try { const saved = JSON.parse(localStorage.getItem(ROLEPLAY_KEY) || "[]"); if (validRoleplayProgress(saved)) roleplayProgress = saved; } catch { /* Start fresh. */ }
  function roleplaySummary() { $("roleplay-summary").textContent = `已完成 ${roleplayProgress.length} 次任务。`; }
  function roleplayGoal() { $("roleplay-goal").textContent = goals[$("roleplay-scene").value]; }
  function roleplayTurns() { $("roleplay-turns").textContent = roleplayDone ? "任务已结束，可重新开始或选择其他任务。" : `已对话 ${roleplayTurn} / 最多 5 轮；至少 3 轮后可完成。`; }
  function resetRoleplay() {
    roleplaySession++;
    roleplayMessages = [];
    roleplayTurn = 0;
    roleplayDone = false;
    $("roleplay-history").replaceChildren();
    $("ai-input").value = "";
    $("ai-send").disabled = false;
    roleplayGoal(); roleplayTurns();
    status("说出第一句英文，向对话伙伴完成任务。录音只转文字，不评发音。");
  }

  function status(text) { $("ai-status").textContent = text; }
  function showSettings() {
    $("ai-settings").hidden = !!settings.passcode;
    $("ai-passcode").value = settings.passcode;
  }
  function stopRecording() {
    clearTimeout(timer);
    if (recorder && recorder.state === "recording") recorder.stop();
    if (stream) stream.getTracks().forEach(track => track.stop());
    recorder = null;
    stream = null;
    $("ai-record").textContent = "● 录音转文字";
  }
  function addLine(role, text) {
    const line = document.createElement("div");
    line.className = `ai-line ${role}`;
    const label = document.createElement("strong");
    label.textContent = role === "user" ? "我" : "对话伙伴";
    const content = document.createElement("p");
    content.textContent = text;
    line.append(label, content);
    if (role === "assistant") {
      const play = document.createElement("button");
      play.className = "utility-button";
      play.textContent = "♪ 朗读英文";
      play.onclick = () => {
        if (!("speechSynthesis" in window)) return status("这台设备暂时无法朗读。");
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.split(/[\u3400-\u9fff]/)[0].trim() || text);
        utterance.lang = "en-US";
        utterance.rate = 0.82;
        speechSynthesis.speak(utterance);
      };
      line.append(play);
    }
    $("ai-history").append(line);
    line.scrollIntoView({ block: "nearest" });
  }
  function addRoleplayTurn(source, result) {
    const history = $("roleplay-history");
    const user = document.createElement("div");
    user.className = "ai-line user";
    const userTitle = document.createElement("strong"); userTitle.textContent = "我";
    const userText = document.createElement("p"); userText.textContent = source;
    user.append(userTitle, userText);
    const partner = document.createElement("div");
    partner.className = "ai-line";
    const title = document.createElement("strong"); title.textContent = "任务伙伴";
    const reply = document.createElement("p"); reply.textContent = result.reply;
    const hint = document.createElement("p"); hint.textContent = `中文提示：${result.hint}`;
    const play = document.createElement("button"); play.className = "utility-button"; play.textContent = "♪ 朗读英文";
    play.onclick = () => {
      if (!("speechSynthesis" in window)) return status("这台设备暂时无法朗读。");
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(result.reply);
      utterance.lang = "en-US"; utterance.rate = 0.82; speechSynthesis.speak(utterance);
    };
    partner.append(title, reply, hint, play);
    if (result.finished) {
      const outcome = document.createElement("p"); outcome.textContent = result.completed ? "✓ 任务完成" : "本轮练习结束，还有目标没完成。可以重新挑战。";
      const feedback = document.createElement("p"); feedback.textContent = `改进建议：${result.feedback}`;
      const better = document.createElement("p"); better.textContent = `可以这样说：${result.better}`;
      partner.append(outcome, feedback, better);
    }
    history.append(user, partner);
    partner.scrollIntoView({ block: "nearest" });
  }
  function addTeacherTurn(kind, source, result) {
    const history = $(`teacher-${kind}-history`);
    const user = document.createElement("div");
    user.className = "ai-line user";
    const userLabel = document.createElement("strong");
    userLabel.textContent = "我";
    const original = document.createElement("p");
    original.textContent = source;
    user.append(userLabel, original);

    const teacher = document.createElement("div");
    teacher.className = "ai-line";
    const title = document.createElement("strong");
    title.textContent = "英语老师 · AI 建议";
    teacher.append(title);
    const fields = kind === "ask"
      ? [["解答", result.answer], ["英文例句", result.example], ["中文意思", result.meaning]]
      : [["建议表达", result.corrected], ["中文意思", result.meaning], ["原因", result.reason], ["英文回应", result.reply], ["中文提示", result.hint]];
    fields.forEach(([label, value]) => {
      const heading = document.createElement("strong");
      heading.textContent = label;
      const content = document.createElement("p");
      content.textContent = value;
      teacher.append(heading, content);
    });
    const play = document.createElement("button");
    play.className = "utility-button";
    play.textContent = "♪ 朗读英文";
    play.onclick = () => {
      if (!("speechSynthesis" in window)) return status("这台设备暂时无法朗读。");
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(kind === "ask" ? result.example : `${result.corrected} ${result.reply}`);
      utterance.lang = "en-US";
      utterance.rate = 0.82;
      speechSynthesis.speak(utterance);
    };
    teacher.append(play);
    if (kind === "correct" && source.trim().toLowerCase() !== result.corrected.trim().toLowerCase()) {
      const save = document.createElement("button");
      save.className = "utility-button";
      save.textContent = "＋ 保存到错句本";
      save.onclick = () => {
        try {
          if (window.wordSpringNotebook.save({ source, corrected: result.corrected, meaning: result.meaning, reason: result.reason })) {
            save.textContent = "✓ 已保存到错句本"; save.disabled = true; status("已保存，可在首页错句本复习。");
          }
        } catch (error) { status(error.message || "保存失败。"); }
      };
      teacher.append(save);
    }
    history.append(user, teacher);
    teacher.scrollIntoView({ block: "nearest" });
  }
  function showTeacherMode() {
    const correcting = $("teacher-mode").value === "correct";
    $("teacher-ask-history").hidden = mode !== "teach" || correcting;
    $("teacher-correct-history").hidden = mode !== "teach" || !correcting;
    $("teacher-help").textContent = correcting
      ? "说一句英文，查看建议改法并继续对话。录音只转文字，不评发音。"
      : "可以用中文或英文提问，继续追问也可以。";
    $("ai-input-label").textContent = correcting ? "用英语说一句，也可以先用中文" : "你想问老师什么？";
    $("ai-input").placeholder = correcting ? "例如：I goed to the store yesterday." : "例如：为什么 go 变成 went？";
    $("ai-send").textContent = correcting ? "发送并纠错 →" : "提问 →";
  }
  async function request(path, body, contentType) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), path === "/teach" || path === "/roleplay" ? 45000 : 30000);
    try {
      const response = await fetch(`${ENDPOINT}${path}`, {
        method: "POST",
        headers: { "content-type": contentType, "x-wordspring-passcode": settings.passcode },
        body,
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "请求失败");
      return result;
    } finally { clearTimeout(timeout); }
  }

  function open(modeName) {
    if (mode !== modeName) $("ai-input").value = "";
    mode = modeName;
    const translating = mode === "translate";
    const teaching = mode === "teach";
    const roleplaying = mode === "roleplay";
    $("ai-view").hidden = false;
    $("ai-view").setAttribute("aria-label", roleplaying ? "任务对话" : teaching ? "AI 英语老师" : translating ? "中英翻译" : "AI 自由对话");
    $("ai-title").textContent = roleplaying ? "任务对话" : teaching ? "AI 英语老师" : translating ? "中英翻译" : "AI 自由对话";
    $("ai-topic-section").hidden = translating || teaching || roleplaying;
    $("translation-controls").hidden = !translating;
    $("teacher-controls").hidden = !teaching;
    $("roleplay-controls").hidden = !roleplaying;
    $("roleplay-history").hidden = !roleplaying;
    $("ai-history").hidden = translating || teaching || roleplaying;
    $("teacher-ask-history").hidden = true;
    $("teacher-correct-history").hidden = true;
    $("translation-result").hidden = true;
    $("ai-input-label").textContent = translating ? "输入要翻译的话" : roleplaying ? "用英语完成任务" : "你想说什么？英文或中文都可以";
    $("ai-input").placeholder = translating && $("translate-direction").value === "en-zh" ? "例如：Where is the station?" : translating ? "例如：我想点一杯咖啡。" : "例如：Hello! How are you?";
    $("ai-send").textContent = translating ? "翻译 →" : roleplaying ? "完成这一轮 →" : "发送 →";
    $("ai-send").disabled = false;
    if (teaching) showTeacherMode();
    if (roleplaying) { roleplayGoal(); roleplayTurns(); }
    $("ai-status").textContent = settings.passcode ? (roleplaying ? "选好任务，用英文说第一句。" : teaching ? "选好学习方式，就可以开始。" : translating ? "选择方向，输入或录音后点击翻译。" : "可以继续对话。") : "先设置免费 AI 服务。";
    document.body.style.overflow = "hidden";
    showSettings();
  }
  $("ai-open").onclick = () => open("chat");
  $("teacher-open").onclick = () => open("teach");
  $("translate-open").onclick = () => open("translate");
  $("roleplay-open").onclick = () => { open("roleplay"); resetRoleplay(); };
  $("roleplay-scene").onchange = resetRoleplay;
  $("roleplay-restart").onclick = resetRoleplay;
  $("ai-close").onclick = () => {
    stopRecording();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    $("ai-view").hidden = true;
    document.body.style.overflow = "";
  };
  $("ai-edit-settings").onclick = () => { $("ai-settings").hidden = false; };
  $("ai-save-settings").onclick = () => {
    const passcode = $("ai-passcode").value.trim();
    if (!passcode) return status("请填写访问口令。");
    settings = { passcode };
    try { localStorage.setItem(STORAGE, JSON.stringify(settings)); } catch { return status("设置无法保存，请检查 Safari 网站数据设置。"); }
    $("ai-settings").hidden = true;
    status(mode === "teach" ? "设置已保存，可以开始学习。" : mode === "translate" ? "设置已保存，可以开始翻译。" : "设置已保存，可以开始对话。");
  };
  $("teacher-mode").onchange = () => {
    showTeacherMode();
    $("ai-input").value = "";
    status("已切换学习方式，可以继续。");
  };
  $("translate-direction").onchange = () => {
    $("translation-result").hidden = true;
    $("ai-input").placeholder = $("translate-direction").value === "en-zh" ? "例如：Where is the station?" : "例如：我想点一杯咖啡。";
  };
  $("translation-play").onclick = () => {
    if (!("speechSynthesis" in window)) return status("这台设备暂时无法朗读。");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance($("translation-text").textContent);
    utterance.lang = translatedDirection === "zh-en" ? "en-US" : "zh-CN";
    utterance.rate = 0.82;
    speechSynthesis.speak(utterance);
  };
  $("ai-send").onclick = async () => {
    const text = $("ai-input").value.trim();
    if (busy || !text) return;
    if (recorder && recorder.state === "recording") return status("请先停止录音，再发送文字。");
    if (!settings.passcode) { showSettings(); return status("请先填写访问口令。"); }
    if (text.length > 400) return status("每次最多输入 400 个字。");
    busy = true;
    const translating = mode === "translate";
    const teaching = mode === "teach";
    const roleplaying = mode === "roleplay";
    if (roleplaying && roleplayDone) return status("此任务已结束，请重新开始或切换任务。");
    $("ai-send").disabled = true;
    status(roleplaying ? "任务伙伴正在回复……" : teaching ? "英语老师正在回答……" : translating ? "正在翻译……" : "对话伙伴正在回复……");
    try {
      if (roleplaying) {
        const scene = $("roleplay-scene").value;
        const turn = roleplayTurn + 1;
        const session = roleplaySession;
        const next = [...roleplayMessages, { role: "user", content: text }].slice(-9);
        const result = await request("/roleplay", JSON.stringify({ scene, turn, messages: next }), "application/json");
        if (mode !== "roleplay" || $("ai-view").hidden || $("roleplay-scene").value !== scene || roleplaySession !== session) return;
        addRoleplayTurn(text, result);
        roleplayMessages = [...next, { role: "assistant", content: result.reply.slice(0, 400) }].slice(-8);
        roleplayTurn = turn;
        roleplayDone = result.finished;
        roleplayTurns();
        if (result.completed) {
          roleplayProgress.push({ scene, when: Date.now() });
          if (roleplayProgress.length > 100) roleplayProgress.shift();
          try { localStorage.setItem(ROLEPLAY_KEY, JSON.stringify(roleplayProgress)); roleplaySummary(); }
          catch { status("任务完成，但进度未保存。请检查浏览器存储。"); }
        }
      } else if (teaching) {
        const lessonMode = $("teacher-mode").value;
        const next = [...teacherMessages[lessonMode], { role: "user", content: text }].slice(-7);
        const result = await request("/teach", JSON.stringify({ mode: lessonMode, messages: next }), "application/json");
        if (mode !== "teach" || $("ai-view").hidden || $("teacher-mode").value !== lessonMode) return;
        addTeacherTurn(lessonMode, result.source || text, result);
        const summary = lessonMode === "ask"
          ? `${result.answer} 例句：${result.example} ${result.meaning}`
          : `${result.corrected} ${result.meaning} ${result.reason} ${result.reply} ${result.hint}`;
        teacherMessages[lessonMode] = [...next, { role: "assistant", content: summary.slice(0, 400) }].slice(-6);
      } else if (translating) {
        $("translation-result").hidden = true;
        const direction = $("translate-direction").value;
        const result = await request("/translate", JSON.stringify({ direction, text }), "application/json");
        if (mode !== "translate" || $("ai-view").hidden || $("translate-direction").value !== direction) return;
        $("translation-source").textContent = result.source || text;
        $("translation-text").textContent = result.translation;
        $("translation-result").hidden = false;
        $("ai-input").blur();
        $("translation-result").scrollIntoView({ block: "nearest" });
        translatedDirection = direction;
      } else {
        const next = [...messages, { role: "user", content: text }].slice(-9);
        const result = await request("/chat", JSON.stringify({ topic: $("ai-topic").value, messages: next }), "application/json");
        addLine("user", text);
        addLine("assistant", result.answer);
        messages = [...next, { role: "assistant", content: result.answer.slice(0, 400) }].slice(-8);
      }
      $("ai-input").value = "";
      status(roleplaying ? (roleplayDone ? "练习结束。查看改进建议，或重新开始任务。" : "继续用英文完成任务。") : teaching ? "可以继续提问或对话，也可以朗读英文。" : translating ? "翻译完成，可以朗读译文。" : "可以继续说一句，或点击朗读听回复。");
    } catch (error) { status(error.name === "AbortError" ? "等待超时，请再试一次。" : error.message || "网络暂时不可用。"); }
    finally { busy = false; $("ai-send").disabled = roleplaying && roleplayDone; }
  };
  $("ai-record").onclick = async () => {
    if (recorder && recorder.state === "recording") return stopRecording();
    if (busy) return;
    if (!settings.passcode) return status("请先填写访问口令。");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return status("当前设备无法网页录音，请用键盘输入。");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if ($("ai-view").hidden) { stream.getTracks().forEach(track => track.stop()); stream = null; return; }
      recorder = new MediaRecorder(stream);
      const active = recorder;
      const chunks = [];
      active.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      active.onstop = async () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        stream = null;
        recorder = null;
        clearTimeout(timer);
        $("ai-record").textContent = "● 录音转文字";
        if ($("ai-view").hidden || !chunks.length) return;
        busy = true;
        status("正在识别你说的话……");
        try {
          const audio = new Blob(chunks, { type: active.mimeType || "audio/mp4" });
          const result = await request("/transcribe", audio, audio.type);
          $("ai-input").value = result.transcript;
          status("识别结果可以修改；确认后点击下方按钮。录音只转文字，不评发音。");
        } catch (error) { status(error.name === "AbortError" ? "识别超时，请再试一次。" : error.message || "语音识别暂时不可用。"); }
        finally { busy = false; }
      };
      active.start();
      $("ai-record").textContent = "■ 停止录音";
      status(mode === "teach" ? "请说出问题或练习句子，最多录 20 秒。" : mode === "translate" ? "请说要翻译的话，最多录 20 秒。" : "请说一句英文，最多录 20 秒。");
      timer = setTimeout(() => { if (active.state === "recording") active.stop(); }, 20000);
    } catch { stopRecording(); status("录音未启动，请检查麦克风权限。"); }
  };
  roleplaySummary();
}

if (typeof module !== "undefined") module.exports = { validRoleplayProgress };
if (typeof document !== "undefined") startAiChat();
