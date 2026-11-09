function startBackup() {
  const $ = id => document.getElementById(id);
  const keys = [NOTEBOOK_KEY, LISTENING_KEY, ROLEPLAY_KEY, KNOWLEDGE_KEY, COURSE_KEY, A2_COURSE_KEY];
  const read = key => JSON.parse(localStorage.getItem(key) || "[]");
  $("backup-export").onclick = async () => {
    try {
      const payload = { format: "wordspring-backup-v5", notebook: read(NOTEBOOK_KEY),
        listening: read(LISTENING_KEY), roleplay: read(ROLEPLAY_KEY),
        knowledge: JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || "null") || freshKnowledge(),
        a1Course: JSON.parse(localStorage.getItem(COURSE_KEY) || "null") || freshCourse(),
        a2Course: JSON.parse(localStorage.getItem(A2_COURSE_KEY) || "null") || freshCourse() };
      if (!validNotebook(payload.notebook) || !validListening(payload.listening) || !validRoleplayProgress(payload.roleplay) || !validKnowledge(payload.knowledge) || !validCourse(payload.a1Course) || !validCourse(payload.a2Course, 28, 14)) throw new Error();
      const text = JSON.stringify(payload);
      $("backup-text").value = text;
      $("backup-text").select();
      try { await navigator.clipboard.writeText(text); $("backup-message").textContent = "已复制备份文本，请妥善保存。"; }
      catch { $("backup-message").textContent = "备份已显示在文本框，请手动全选复制。"; }
    } catch { $("backup-message").textContent = "导出失败，请检查浏览器存储。"; }
  };
  $("backup-import").onclick = () => {
    try {
      const payload = JSON.parse($("backup-text").value);
      if (!payload || !["wordspring-backup-v1", "wordspring-backup-v2", "wordspring-backup-v3", "wordspring-backup-v4", "wordspring-backup-v5"].includes(payload.format)) throw new Error();
      if (["wordspring-backup-v2", "wordspring-backup-v3", "wordspring-backup-v4", "wordspring-backup-v5"].includes(payload.format) && ["notebook", "listening", "roleplay"].some(key => payload[key] === undefined)) throw new Error();
      if (["wordspring-backup-v3", "wordspring-backup-v4", "wordspring-backup-v5"].includes(payload.format) && payload.knowledge === undefined) throw new Error();
      if (["wordspring-backup-v4", "wordspring-backup-v5"].includes(payload.format) && payload.a1Course === undefined) throw new Error();
      if (payload.format === "wordspring-backup-v5" && payload.a2Course === undefined) throw new Error();
      if (payload.format === "wordspring-backup-v1" &&
          (!payload.course || typeof payload.course !== "object" || Array.isArray(payload.course) ||
           !payload.wordReviews || typeof payload.wordReviews !== "object" || Array.isArray(payload.wordReviews))) throw new Error();
      const notebook = payload.notebook === undefined ? [] : payload.notebook;
      const listening = payload.listening === undefined ? [] : payload.listening;
      const roleplay = payload.roleplay === undefined ? [] : payload.roleplay;
      const knowledge = ["wordspring-backup-v3", "wordspring-backup-v4", "wordspring-backup-v5"].includes(payload.format) ? payload.knowledge :
        JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || "null") || freshKnowledge();
      const a1Course = ["wordspring-backup-v4", "wordspring-backup-v5"].includes(payload.format) ? payload.a1Course :
        JSON.parse(localStorage.getItem(COURSE_KEY) || "null") || freshCourse();
      const a2Course = payload.format === "wordspring-backup-v5" ? payload.a2Course :
        JSON.parse(localStorage.getItem(A2_COURSE_KEY) || "null") || freshCourse();
      if (!validNotebook(notebook) || !validListening(listening) || !validRoleplayProgress(roleplay) || !validKnowledge(knowledge) || !validCourse(a1Course) || !validCourse(a2Course, 28, 14)) throw new Error();
      if (!confirm("导入会替换这台设备上的学习进度。确定继续吗？")) return;
      const old = keys.map(key => localStorage.getItem(key));
      try { [notebook, listening, roleplay, knowledge, a1Course, a2Course].forEach((value, index) => localStorage.setItem(keys[index], JSON.stringify(value))); }
      catch (error) {
        keys.forEach((key, index) => { try { if (old[index] === null) localStorage.removeItem(key); else localStorage.setItem(key, old[index]); } catch { /* Best effort rollback. */ } });
        throw error;
      }
      location.reload();
    } catch { $("backup-message").textContent = "备份格式不正确，或存储空间不足。"; }
  };
}

if (typeof document !== "undefined") startBackup();
