import * as OpenCC from "opencc-js/core";
import * as Locale from "opencc-js/preset";

const SITE = "https://longzhuoyue.github.io";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const TEACH_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";
const SPEECH_MODEL = "@cf/openai/whisper";
const simplify = OpenCC.ConverterFactory(Locale.from.tw, Locale.to.cn);

function reply(data, status = 200, origin = SITE) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "cache-control": "no-store"
    }
  });
}

export async function handleRequest(request, env) {
  const origin = request.headers.get("origin");
  if (origin !== SITE) return reply({ error: "不允许此网站访问。" }, 403);
  if (request.method === "OPTIONS") return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": SITE,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-wordspring-passcode",
      "access-control-max-age": "600"
    }
  });
  if (request.method !== "POST") return reply({ error: "请求方式不正确。" }, 405);
  if (!env.PASSCODE || request.headers.get("x-wordspring-passcode") !== env.PASSCODE) {
    return reply({ error: "口令不正确。" }, 401);
  }
  if (!env.AI) return reply({ error: "AI 服务尚未配置。" }, 503);

  const path = new URL(request.url).pathname;
  try {
    if (path === "/chat") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "对话太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "对话太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "对话内容无效。" }, 400); }
      if (!input || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 9 ||
          input.messages.some(item => !item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 400)) {
        return reply({ error: "对话内容无效。" }, 400);
      }
      const topic = ["日常交流", "点餐", "问路", "自由聊天"].includes(input.topic) ? input.topic : "日常交流";
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: `You are a patient English conversation partner for a Chinese beginner. Topic: ${topic}. Reply in exactly two lines. Line 1: one or two short, natural A1 English sentences, including one simple follow-up question. Line 2: one short Simplified Chinese hint, beginning with “中文提示：”. The English line must come first even when the learner writes Chinese or earlier assistant messages are in Chinese. If the learner writes Chinese, first show a natural English expression. Never claim to grade pronunciation or to have heard audio.` },
          ...input.messages
        ],
        max_tokens: 180,
        temperature: 0.5
      });
      let answer = typeof result.response === "string" ? result.response.trim() : "";
      const englishFirst = value => /^[^\n\u3400-\u9fff]*[A-Za-z]{2,}[^\n\u3400-\u9fff]*(?:\n|$)/.test(value);
      if (answer && !englishFirst(answer)) {
        const corrected = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: "Rewrite the given reply for a beginner learning English. First line: simple conversational English with one short follow-up question. Second line: one brief Simplified Chinese hint starting with 中文提示：. Never put Chinese before the English line." },
            { role: "user", content: answer.slice(0, 1200) }
          ],
          max_tokens: 180,
          temperature: 0.3
        });
        answer = typeof corrected.response === "string" ? corrected.response.trim() : "";
      }
      return englishFirst(answer) ? reply({ answer: simplify(answer).slice(0, 1200) }) : reply({ error: "AI 没有返回英文，请再试一次。" }, 502);
    }
    if (path === "/translate") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "翻译内容太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "翻译内容太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "翻译内容无效。" }, 400); }
      if (!input || !["zh-en", "en-zh"].includes(input.direction) || typeof input.text !== "string" || !input.text.trim() || input.text.length > 400) {
        return reply({ error: "翻译内容无效。" }, 400);
      }
      const toEnglish = input.direction === "zh-en";
      const source = input.text.trim();
      const result = await env.AI.run(TRANSLATION_MODEL, {
        text: source,
        source_lang: toEnglish ? "zh" : "en",
        target_lang: toEnglish ? "en" : "zh"
      });
      const translation = typeof result.translated_text === "string" ? simplify(result.translated_text.trim()) : "";
      return (toEnglish ? /[A-Za-z]/.test(translation) : /[\u3400-\u9fff]/.test(translation))
        ? reply({ source, translation: translation.slice(0, 1600) })
        : reply({ error: "AI 没有返回译文，请再试一次。" }, 502);
    }
    if (path === "/teach") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "内容太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "内容太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "教学内容无效。" }, 400); }
      if (!input || !["ask", "correct"].includes(input.mode) || !Array.isArray(input.messages) ||
          input.messages.length < 1 || input.messages.length > 7 ||
          input.messages.some(item => !item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 400) ||
          input.messages.at(-1).role !== "user") {
        return reply({ error: "教学内容无效。" }, 400);
      }
      const asking = input.mode === "ask";
      const fields = asking ? ["answer", "example", "meaning"] : ["corrected", "reason", "reply", "hint"];
      const prompt = asking
        ? "You are a patient English teacher for a Chinese absolute beginner. Put only the direct explanation in answer, using one or two short Simplified Chinese sentences. Put exactly one simple A1 English sentence in example and its Simplified Chinese translation in meaning. Do not repeat the example or translation inside answer. Use previous turns only to understand follow-up questions. Do not pretend to assess pronunciation. No field may be empty. Return only the requested JSON fields."
        : "You are a patient English conversation tutor for a Chinese absolute beginner. For the learner's latest message, correct at most one important English error. The corrected field must contain a complete English sentence. The reason field must ALWAYS contain one short Simplified Chinese sentence explaining the change. If the English is natural, copy it exactly into corrected and write '这句话自然，无需修改。' in reason; do not force punctuation or style changes. If the learner wrote Chinese, put a natural simple English equivalent in corrected and write '这是对应的英文表达。' in reason. Then continue with one short A1 English sentence or question in reply. The hint field must ALWAYS contain a short Simplified Chinese translation of reply. No field may be empty. Judge the text only; never claim to assess pronunciation. Return only the requested JSON fields.";
      const result = await env.AI.run(TEACH_MODEL, {
        messages: [{ role: "system", content: prompt }, ...input.messages],
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: Object.fromEntries(fields.map(field => [field, { type: "string", minLength: 1 }])),
            required: fields,
            additionalProperties: false
          }
        },
        max_tokens: 320,
        temperature: 0.2
      });
      let output = result.response;
      if (typeof output === "string") {
        try { output = JSON.parse(output); } catch { output = null; }
      }
      if (!output || fields.some(field => typeof output[field] !== "string" || !output[field].trim()) ||
          !(asking ? /[A-Za-z]/.test(output.example) : /[A-Za-z]/.test(output.corrected) && /[A-Za-z]/.test(output.reply))) {
        return reply({ error: "AI 没有生成完整的教学内容，请再试一次。" }, 502);
      }
      const teaching = Object.fromEntries(fields.map(field => [field, simplify(output[field].trim()).slice(0, 800)]));
      return reply({ mode: input.mode, source: input.messages.at(-1).content.trim(), ...teaching });
    }
    if (path === "/transcribe") {
      if (!/^audio\/(mp4|mpeg|wav|webm|x-m4a)(?:;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "录音格式不支持。" }, 415);
      if (Number(request.headers.get("content-length")) > 2_000_000) return reply({ error: "录音太大，请缩短到 20 秒以内。" }, 413);
      const audio = await request.arrayBuffer();
      if (!audio.byteLength || audio.byteLength > 2_000_000) return reply({ error: "录音太大或为空。" }, 413);
      const result = await env.AI.run(SPEECH_MODEL, { audio: [...new Uint8Array(audio)] });
      const transcript = typeof result.text === "string" ? simplify(result.text.trim()) : "";
      return transcript ? reply({ transcript: transcript.slice(0, 400) }) : reply({ error: "没有听清，请再说一遍。" }, 422);
    }
    return reply({ error: "功能不存在。" }, 404);
  } catch (error) {
    const limited = /quota|limit|capacity|neurons|429|3040/i.test(String(error));
    return reply({ error: limited ? "今日免费额度已用完，请明天再试。" : "服务暂时不可用，请稍后重试。" }, limited ? 429 : 502);
  }
}

export default { fetch: handleRequest };
