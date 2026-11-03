function startAiChat() {
  const $ = id => document.getElementById(id);
  const STORAGE = "wordspring-ai-settings-v1";
  const ENDPOINT = "https://wordspring-ai-pages.pages.dev";
  let settings = { passcode: "" };
  let messages = [];
  let recorder = null;
  let stream = null;
  let timer = null;
  let busy = false;

  try { settings = { ...settings, ...JSON.parse(localStorage.getItem(STORAGE) || "{}") }; } catch { /* Settings can be entered again. */ }

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
  async function request(path, body, contentType) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
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

  $("ai-open").onclick = () => {
    $("ai-view").hidden = false;
    document.body.style.overflow = "hidden";
    showSettings();
  };
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
    status("设置已保存，可以开始对话。");
  };
  $("ai-send").onclick = async () => {
    const text = $("ai-input").value.trim();
    if (busy || !text) return;
    if (recorder && recorder.state === "recording") return status("请先停止录音，再发送文字。");
    if (!settings.passcode) { showSettings(); return status("请先填写访问口令。"); }
    if (text.length > 400) return status("每次最多输入 400 个字。");
    busy = true;
    $("ai-send").disabled = true;
    status("对话伙伴正在回复……");
    try {
      const next = [...messages, { role: "user", content: text }].slice(-9);
      const result = await request("/chat", JSON.stringify({ topic: $("ai-topic").value, messages: next }), "application/json");
      addLine("user", text);
      addLine("assistant", result.answer);
      messages = [...next, { role: "assistant", content: result.answer.slice(0, 400) }].slice(-8);
      $("ai-input").value = "";
      status("可以继续说一句，或点击朗读听回复。");
    } catch (error) { status(error.name === "AbortError" ? "等待超时，请再试一次。" : error.message || "网络暂时不可用。"); }
    finally { busy = false; $("ai-send").disabled = false; }
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
          status("识别结果可以修改；确认后点击发送。这不是发音评分。");
        } catch (error) { status(error.name === "AbortError" ? "识别超时，请再试一次。" : error.message || "语音识别暂时不可用。"); }
        finally { busy = false; }
      };
      active.start();
      $("ai-record").textContent = "■ 停止录音";
      status("请说一句英文，最多录 20 秒。");
      timer = setTimeout(() => { if (active.state === "recording") active.stop(); }, 20000);
    } catch { stopRecording(); status("录音未启动，请检查麦克风权限。"); }
  };
}

if (typeof document !== "undefined") startAiChat();
