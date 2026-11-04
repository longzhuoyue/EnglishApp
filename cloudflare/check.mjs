import assert from "node:assert/strict";
import { handleRequest } from "./worker.js";

const origin = "https://longzhuoyue.github.io";
const url = "https://wordspring-ai.example.workers.dev";
const calls = [];
const env = {
  PASSCODE: "test-only",
  AI: { async run(model, input) {
    calls.push({ model, input });
    return model.includes("whisper") ? { text: "我想點一杯咖啡。你今天怎麼樣？學習英語很有趣。" } : { response: "Hello! How are you?\n你好！" };
  } }
};
const post = (path, body, type = "application/json", passcode = "test-only") => new Request(url + path, {
  method: "POST",
  headers: { origin, "content-type": type, "x-wordspring-passcode": passcode },
  body
});

assert.equal((await handleRequest(post("/chat", "{}", "application/json", "wrong"), env)).status, 401);
assert.equal((await handleRequest(post("/chat", "{}"), env)).status, 400);
const answer = await handleRequest(post("/chat", JSON.stringify({ topic: "点餐", messages: [{ role: "user", content: "I want tea." }] })), env);
assert.equal((await answer.json()).answer.startsWith("Hello!"), true);
assert.equal(calls[0].input.messages[0].role, "system");
assert.equal(calls[0].input.messages[0].content.includes("Simplified Chinese"), true);
assert.equal(calls[0].input.messages.at(-1).content, "I want tea.");
let attempts = 0;
const chineseFirst = { ...env, AI: { async run() {
  attempts++;
  return { response: attempts === 1 ? "你好！我也好。\n你喜欢吃什么？" : "Hello! Nice to meet you. What do you like to eat?\n中文提示：说说你喜欢的食物。" };
} } };
const recovered = await handleRequest(post("/chat", JSON.stringify({ topic: "日常交流", messages: [{ role: "user", content: "hello" }] })), chineseFirst);
assert.equal((await recovered.json()).answer.startsWith("Hello!"), true);
assert.equal(attempts, 2);
const chineseOnly = { ...env, AI: { async run() { return { response: "你好！你喜欢吃什么？" }; } } };
assert.equal((await handleRequest(post("/chat", JSON.stringify({ messages: [{ role: "user", content: "hello" }] })), chineseOnly)).status, 502);
const translations = [];
const translateEnv = { ...env, AI: { async run(model, input) {
  translations.push({ model, input });
  return { translated_text: translations.length === 1 ? "I'd like a coffee, please." : "我想點一杯咖啡。" };
} } };
const toEnglish = await handleRequest(post("/translate", JSON.stringify({ direction: "zh-en", text: "我想点一杯咖啡。" })), translateEnv);
assert.equal((await toEnglish.json()).translation, "I'd like a coffee, please.");
const toChinese = await handleRequest(post("/translate", JSON.stringify({ direction: "en-zh", text: "I want a coffee." })), translateEnv);
assert.equal((await toChinese.json()).translation, "我想点一杯咖啡。");
assert.equal(translations[0].model, "@cf/meta/m2m100-1.2b");
assert.deepEqual(translations[0].input, { text: "我想点一杯咖啡。", source_lang: "zh", target_lang: "en" });
assert.deepEqual(translations[1].input, { text: "I want a coffee.", source_lang: "en", target_lang: "zh" });
assert.equal((await handleRequest(post("/translate", JSON.stringify({ direction: "other", text: "hello" })), env)).status, 400);
const weatherEnv = { ...env, AI: { async run(model, input) {
  return model === "@cf/meta/m2m100-1.2b"
    ? { translated_text: input.text === "今天天气怎么样" ? "What's the weather like today?" : "" }
    : { response: "The weather today is nice." };
} } };
const weather = await handleRequest(post("/translate", JSON.stringify({ direction: "zh-en", text: "今天天气怎么样" })), weatherEnv);
assert.deepEqual(await weather.json(), { source: "今天天气怎么样", translation: "What's the weather like today?" });
const teachCalls = [];
const teachEnv = { ...env, AI: { async run(model, input) {
  teachCalls.push({ model, input });
  return { response: teachCalls.length === 1
    ? { answer: "go 的过去式是 went。", example: "I went to the store yesterday.", meaning: "我昨天去了商店。" }
    : { corrected: "I went to the store yesterday.", meaning: "我昨天去了商店。", reason: "go 的过去式是 went。", reply: "What did you buy?", hint: "你买了什么？" } };
} } };
const ask = await handleRequest(post("/teach", JSON.stringify({ mode: "ask", messages: [{ role: "user", content: "为什么 go 变成 went？" }] })), teachEnv);
assert.deepEqual(await ask.json(), { mode: "ask", source: "为什么 go 变成 went？", answer: "go 的过去式是 went。", example: "I went to the store yesterday.", meaning: "我昨天去了商店。" });
const correction = await handleRequest(post("/teach", JSON.stringify({ mode: "correct", messages: [{ role: "user", content: "I goed to the store yesterday." }] })), teachEnv);
assert.deepEqual(await correction.json(), { mode: "correct", source: "I goed to the store yesterday.", corrected: "I went to the store yesterday.", meaning: "我昨天去了商店。", reason: "go 的过去式是 went。", reply: "What did you buy?", hint: "你买了什么？" });
assert.equal(teachCalls[0].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
assert.equal(teachCalls[0].input.response_format.type, "json_schema");
assert.equal(teachCalls[1].input.messages.at(-1).content, "I goed to the store yesterday.");
assert.equal((await handleRequest(post("/teach", JSON.stringify({ mode: "other", messages: [{ role: "user", content: "hello" }] })), env)).status, 400);
const roleplayEnv = { ...env, AI: { async run() { return { response: { reply: "What size would you like?", hint: "你想要多大杯？", completed: true, feedback: "记得说出杯型。", better: "I'd like a small coffee, please." } }; } } };
const roleplayBody = turn => JSON.stringify({ scene: "cafe", turn, messages: [{ role: "user", content: "I'd like coffee." }] });
const roleplayStart = await (await handleRequest(post("/roleplay", roleplayBody(1)), roleplayEnv)).json();
assert.equal(roleplayStart.completed, false);
assert.equal(roleplayStart.finished, false);
const roleplayFinish = await (await handleRequest(post("/roleplay", roleplayBody(3)), roleplayEnv)).json();
assert.equal(roleplayFinish.completed, true);
assert.equal(roleplayFinish.finished, true);
assert.equal(roleplayFinish.reply, "What size would you like?");
const fallbackEnv = { ...env, AI: { async run(model) { return model === "@cf/meta/m2m100-1.2b"
  ? { translated_text: "你想要多大杯？" }
  : { response: { reply: "What size would you like?", hint: "}2", completed: false } }; } } };
const fallback = await (await handleRequest(post("/roleplay", roleplayBody(1)), fallbackEnv)).json();
assert.equal(fallback.hint, "你想要多大杯？");
assert.equal(fallback.finished, false);
assert.equal((await handleRequest(post("/roleplay", JSON.stringify({ scene: "other", turn: 1, messages: [{ role: "user", content: "Hello" }] })), roleplayEnv)).status, 400);
const speech = await handleRequest(post("/transcribe", new Uint8Array([1, 2, 3]), "audio/mp4"), env);
assert.equal((await speech.json()).transcript, "我想点一杯咖啡。你今天怎么样？学习英语很有趣。");
assert.equal(calls[1].input.audio.length, 3);
const foreign = new Request(url + "/chat", { method: "POST", headers: { origin: "https://other.example", "x-wordspring-passcode": "test-only" }, body: "{}" });
assert.equal((await handleRequest(foreign, env)).status, 403);
console.log("WordSpring AI Worker checks passed");
