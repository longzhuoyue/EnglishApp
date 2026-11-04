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
      const fields = asking ? ["answer", "example", "meaning"] : ["corrected", "meaning", "reason", "reply", "hint"];
      const prompt = asking
        ? "You are a patient English teacher for a Chinese absolute beginner. Put only the direct explanation in answer, using one or two short Simplified Chinese sentences. Put exactly one simple A1 English sentence in example and its Simplified Chinese translation in meaning. Do not repeat the example or translation inside answer. Use previous turns only to understand follow-up questions. Do not pretend to assess pronunciation. No field may be empty. Return only the requested JSON fields."
        : "You are a patient English conversation tutor for a Chinese absolute beginner. For the learner's latest message, correct at most one important English error. The corrected field must contain a complete English sentence. The meaning field must contain its short Simplified Chinese translation. The reason field must ALWAYS contain one short Simplified Chinese sentence explaining the change. If the English is natural, copy it exactly into corrected and write '这句话自然，无需修改。' in reason; do not force punctuation or style changes. If the learner wrote Chinese, put a natural simple English equivalent in corrected and write '这是对应的英文表达。' in reason. Then continue with one short A1 English sentence or question in reply. The hint field must ALWAYS contain a short Simplified Chinese translation of reply. No field may be empty. Judge the text only; never claim to assess pronunciation. Return only the requested JSON fields.";
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
    if (path === "/listening") {
      if (Number(request.headers.get("content-length")) > 1000) return reply({ error: "听力请求太长。" }, 413);
      const body = await request.text();
      if (body.length > 1000) return reply({ error: "听力请求太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "听力请求无效。" }, 400); }
      if (!input || !["入门", "基础", "进阶"].includes(input.level) || !Array.isArray(input.avoid) ||
          input.avoid.length > 5 || input.avoid.some(title => typeof title !== "string" || title.length > 40))
        return reply({ error: "听力请求无效。" }, 400);
      const scenes = ["咖啡店", "公交站", "超市", "图书馆", "酒店", "公园", "餐厅", "机场", "药店", "周末计划", "朋友见面", "购物", "天气", "看电影", "约时间", "询问价格", "找洗手间", "学校", "打电话", "点外卖"];
      const scene = scenes[Math.floor(Math.random() * scenes.length)];
      const levelGuide = { 入门: "A1: 3 very short lines, about 4–8 words per English line.", 基础: "A1–A2: 4 lines, about 5–12 words per English line.", 进阶: "A2: 4 lines, about 7–15 words per English line." };
      const prompt = `Create a fresh listening exercise for a Chinese learner. Level ${input.level}. ${levelGuide[input.level]} Everyday scenario: ${scene}. Avoid repeating these titles or the same situation: ${input.avoid.join("、") || "none"}. Write a natural alternating A/B English dialogue and an accurate Simplified Chinese translation for every line. The Chinese title and question must be short. Ask one factual comprehension question answered unambiguously by the dialogue. Give exactly 3 distinct Simplified Chinese options, with one correct answer; answer is its zero-based index. No phonetic transcription or pronunciation score. Return only the requested JSON.`;
      const result = await env.AI.run(TEACH_MODEL, {
        messages: [{ role: "system", content: prompt }, { role: "user", content: `Generate a different ${input.level} listening practice now.` }],
        response_format: { type: "json_schema", json_schema: { type: "object", properties: {
          title: { type: "string" },
          lines: { type: "array", minItems: 3, maxItems: 4, items: { type: "object", properties: {
            speaker: { type: "string", enum: ["A", "B"] }, en: { type: "string" }, zh: { type: "string" }
          }, required: ["speaker", "en", "zh"], additionalProperties: false } },
          question: { type: "string" }, options: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
          answer: { type: "integer", minimum: 0, maximum: 2 }
        }, required: ["title", "lines", "question", "options", "answer"], additionalProperties: false } },
        max_tokens: 650, temperature: 0.65
      });
      let output = result.response;
      if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }
      if (!output || typeof output.title !== "string" || !/[\u3400-\u9fff]/.test(output.title) ||
          !Array.isArray(output.lines) || output.lines.length < 3 || output.lines.length > 4 ||
          output.lines.some((line, index) => !line || line.speaker !== (index % 2 ? "B" : "A") ||
            typeof line.en !== "string" || !/[A-Za-z]/.test(line.en) || typeof line.zh !== "string" || !/[\u3400-\u9fff]/.test(line.zh)) ||
          typeof output.question !== "string" || !/[\u3400-\u9fff]/.test(output.question) ||
          !Array.isArray(output.options) || output.options.length !== 3 ||
          output.options.some(option => typeof option !== "string" || !option.trim()) ||
          new Set(output.options).size !== 3 || !Number.isInteger(output.answer) || output.answer < 0 || output.answer > 2)
        return reply({ error: "这次听力内容生成不完整，请再试一次。" }, 502);
      return reply({ level: input.level, title: simplify(output.title.trim()).slice(0, 60),
        lines: output.lines.map(line => [line.speaker, line.en.trim().slice(0, 180), simplify(line.zh.trim()).slice(0, 180)]),
        question: simplify(output.question.trim()).slice(0, 180),
        options: output.options.map(option => simplify(option.trim()).slice(0, 100)), answer: output.answer });
    }
    if (path === "/roleplay") {
      if (Number(request.headers.get("content-length")) > 5000) return reply({ error: "任务对话太长。" }, 413);
      const body = await request.text();
      if (body.length > 5000) return reply({ error: "任务对话太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "任务对话内容无效。" }, 400); }
      const scenes = {
        cafe: "You are a café clerk. The learner must order a drink, say its size, and ask or confirm its price.",
        directions: "You are a local resident. The learner must ask how to reach the library and confirm a direction.",
        shop: "You are a shop clerk. The learner must ask for an item, ask about its size, and say they will buy it.",
        hotel: "You are a hotel receptionist. The learner must check in and ask about breakfast time."
      };
      const examples = {
        cafe: "I'd like a small coffee, please. How much is it?",
        directions: "Could you tell me how to get to the library?",
        shop: "Do you have this in medium? I'll take it.",
        hotel: "I'd like to check in. What time is breakfast?"
      };
      if (!input || !Object.hasOwn(scenes, input.scene) || !Number.isInteger(input.turn) || input.turn < 1 || input.turn > 5 ||
          !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 9 ||
          input.messages.some(item => !item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 400) ||
          input.messages.at(-1).role !== "user") return reply({ error: "任务对话内容无效。" }, 400);
      const prompt = `You are a patient A1 English roleplay partner for a Chinese absolute beginner. ${scenes[input.scene]} Reply as the character, using one short natural English sentence or question in reply. Put a short Simplified Chinese translation of reply in hint. Set completed to true only if the learner has achieved every task goal. If a learner writes Chinese, show a natural English expression and continue the roleplay. Never assess pronunciation. Turn ${input.turn} of 5. Return only the requested JSON fields.`;
      const result = await env.AI.run(TEACH_MODEL, {
        messages: [{ role: "system", content: prompt }, ...input.messages],
        response_format: { type: "json_schema", json_schema: { type: "object", properties: {
          reply: { type: "string", minLength: 1 }, hint: { type: "string", minLength: 1 },
          completed: { type: "boolean" }
        }, required: ["reply", "hint", "completed"], additionalProperties: false } },
        max_tokens: 160, temperature: 0.2
      });
      let output = result.response;
      if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }
      if (!output || typeof output.completed !== "boolean" || typeof output.reply !== "string" || !/[A-Za-z]/.test(output.reply))
        return reply({ error: "任务对话未生成完整回复，请重试。" }, 502);
      const completed = input.turn >= 3 && output.completed;
      const finished = completed || input.turn === 5;
      let hint = typeof output.hint === "string" ? simplify(output.hint.trim()) : "";
      if (!/[\u3400-\u9fff]/.test(hint)) {
        const translated = await env.AI.run(TRANSLATION_MODEL, { text: output.reply.trim(), source_lang: "en", target_lang: "zh" });
        hint = typeof translated.translated_text === "string" ? simplify(translated.translated_text.trim()) : "";
      }
      if (!/[\u3400-\u9fff]/.test(hint)) hint = "请听英文回复，再用英语回答。";
      let feedback = "继续练习用完整句子表达自己的需求。";
      let better = examples[input.scene];
      if (finished) {
        const review = await env.AI.run(TEACH_MODEL, {
          messages: [{ role: "system", content: `You are an English teacher for a Chinese A1 beginner. The roleplay goal was: ${scenes[input.scene]} Give one specific, kind improvement suggestion about the learner's actual English in feedback (Simplified Chinese). Put one better complete A1 English sentence the learner could say in better. Do not assess pronunciation. Return only JSON.` },
            ...input.messages],
          response_format: { type: "json_schema", json_schema: { type: "object", properties: {
            feedback: { type: "string", minLength: 1 }, better: { type: "string", minLength: 1 }
          }, required: ["feedback", "better"], additionalProperties: false } },
          max_tokens: 140, temperature: 0.2
        });
        let suggestion = review.response;
        if (typeof suggestion === "string") { try { suggestion = JSON.parse(suggestion); } catch { suggestion = null; } }
        if (suggestion && typeof suggestion.feedback === "string" && /[\u3400-\u9fff]/.test(suggestion.feedback)) feedback = simplify(suggestion.feedback.trim());
        if (suggestion && typeof suggestion.better === "string" && /[A-Za-z]{2,}/.test(suggestion.better) && !/^none$/i.test(suggestion.better.trim())) better = suggestion.better.trim();
      }
      return reply({ scene: input.scene, reply: output.reply.trim().slice(0, 500), hint: hint.slice(0, 500),
        completed, finished, feedback: feedback.slice(0, 500), better: better.slice(0, 500) });
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
