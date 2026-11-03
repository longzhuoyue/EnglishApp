import * as OpenCC from "opencc-js/core";
import * as Locale from "opencc-js/preset";

const SITE = "https://longzhuoyue.github.io";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
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
