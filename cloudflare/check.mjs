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
let listeningCall;
const listeningEnv = { ...env, AI: { async run(model, input) {
  listeningCall = { model, input };
  return { response: { title: "晨间问候", lines: [
    { speaker: "A", en: "Good morning, Mia.", zh: "早上好，米娅。" },
    { speaker: "B", en: "Good morning!", zh: "早上好！" },
    { speaker: "A", en: "How are you?", zh: "你好吗？" }
  ], question: "他们什么时候见面？", options: ["早上", "晚上", "周末"], answer: 0 } };
} } };
const generated = await handleRequest(post("/listening", JSON.stringify({ level: "入门", avoid: ["咖啡店"] })), listeningEnv);
const generatedBody = await generated.json();
assert.equal(generatedBody.title, "晨间问候");
assert.equal(generatedBody.lines.length, 3);
assert.equal(generatedBody.answer, 0);
assert.equal(listeningCall.model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
assert.ok(listeningCall.input.messages[0].content.includes("咖啡店"));
assert.equal((await handleRequest(post("/listening", JSON.stringify({ level: "错误", avoid: [] })), listeningEnv)).status, 400);
const knowledgePacks = {
  words: { items: ["hello", "tea", "bus", "shop", "home"].map(en => ({ en, zh: "意思", example: `I say ${en}.`, exampleZh: "我说了这个词。" })) },
  grammar: { examples: [{ en: "I am ready.", zh: "我准备好了。" }, { en: "She is happy.", zh: "她很开心。" }],
    questions: [
      { prompt: "I ___ ready.", options: ["am", "is", "are"], answer: 0, explanation: "I 后用 am。" },
      { prompt: "She ___ happy.", options: ["am", "is", "are"], answer: 1, explanation: "She 后用 is。" },
      { prompt: "They ___ here.", options: ["am", "is", "are"], answer: 2, explanation: "They 后用 are。" }
    ] },
  translate: { items: ["早上好。", "你好吗？", "再见。"].map(zh => ({ zh, reference: "Good morning.", hint: "使用 morning。" })) },
  reading: { lines: [
    ["On Saturday morning, Mia goes to the park with Ben.", "周六早上，米娅和本一起去公园。"],
    ["They meet near the bus stop at nine o'clock.", "他们九点在公交车站附近见面。"],
    ["Mia brings sandwiches and a bottle of cold water.", "米娅带了三明治和一瓶凉水。"],
    ["Ben brings a red ball for their afternoon game.", "本带了一个红球，准备下午一起玩。"],
    ["First, they walk around the lake and talk together.", "他们先沿着湖散步，边走边聊。"],
    ["Then, they eat their lunch under a big tree.", "然后他们在一棵大树下吃午饭。"],
    ["In the afternoon, they see a little brown dog.", "下午他们看到一只棕色的小狗。"],
    ["They go home before it starts to rain outside.", "外面下雨前，他们回家了。"]
  ].map(([en, zh]) => ({ en, zh })),
    questions: [0, 1, 2].map(() => ({ prompt: "他们在哪里见面？", options: ["bus stop", "school", "shop"], answer: 0, explanation: "短文说他们在车站附近见面。" })) }
};
const knowledgeCalls = [];
const knowledgeEnv = { ...env, AI: { async run(model, input) {
  knowledgeCalls.push({ model, input });
  const prompt = input.messages[0].content;
  if (prompt.startsWith("Decide whether")) return { response: { acceptable: true } };
  if (prompt.startsWith("Check this")) return { response: { valid: true, reason: "correct" } };
  const mode = prompt.includes("Generate 5 DISTINCT") ? "words" : prompt.includes("Teach the fixed") ? "grammar" :
    prompt.includes("Generate 3 DIFFERENT") ? "translate" : "reading";
  return { choices: [{ message: { content: JSON.stringify(knowledgePacks[mode]) } }] };
} } };
const knowledgeRequest = (mode, extra = {}) => post("/knowledge", JSON.stringify({
  action: "generate", mode, topic: 0, sequence: 0, avoidWords: [], ...extra
}));
for (const mode of ["words", "grammar", "translate", "reading"]) {
  const before = knowledgeCalls.length;
  const response = await handleRequest(knowledgeRequest(mode), knowledgeEnv);
  assert.equal(response.status, 200, mode);
  const pack = await response.json();
  assert.equal(pack.mode, mode);
  assert.equal(knowledgeCalls.length, before + (mode === "grammar" ? 1 : 2));
  assert.equal(knowledgeCalls[before].model, "@cf/zai-org/glm-4.7-flash");
  if (mode !== "grammar") assert.equal(knowledgeCalls[before + 1].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  if (mode === "words") assert.equal(pack.items.length, 5);
  if (mode === "grammar") {
    assert.equal(pack.questions.length, 3);
    assert.equal(pack.questions[0].explanation, pack.rule);
  }
  if (mode === "translate") assert.equal(pack.items.length, 3);
  if (mode === "reading") assert.ok(pack.passage.split(/\s+/).length >= 65);
}
assert.equal((await handleRequest(knowledgeRequest("words", { avoidWords: ["hello"] }), knowledgeEnv)).status, 502);
assert.equal((await handleRequest(knowledgeRequest("grammar", { topic: 2 }), knowledgeEnv)).status, 502);
for (const options of [["can", "can't", "doesn't"], ["swim", "swims", "swimming"], ["valid"]]) {
  let attempts = 0;
  const verbs = ["swim", "sing", "cry"];
  const forms = { swim: ["swim", "swims", "swimming"], sing: ["sing", "sings", "singing"],
    cry: ["cry", "cries", "crying"] };
  const generated = { examples: knowledgePacks.grammar.examples,
    questions: verbs.map((verb, index) => ({ prompt: options[0] === "valid" ?
      `${["She", "They", "We"][index]} can ___ well.` : `${["She", "They", "We"][index]} ___ ${verb} well.`,
      options: options[0] === "can" ? options : forms[verb],
      answer: options[0] === "can" && index === 2 ? 2 : 0, explanation: "can 后接动词原形。" })) };
  const repaired = await handleRequest(knowledgeRequest("grammar", { topic: 5 }), {
    ...env, AI: { async run() { attempts++; return { choices: [{ message: { content: JSON.stringify(generated) } }] }; } }
  });
  assert.equal(repaired.status, 200, `can/can't grammar with ${options[0]} options`);
  const pack = await repaired.json();
  assert.equal(attempts, 1);
  assert.ok(pack.questions.every(item => /\bcan ___/.test(item.prompt)));
  assert.deepEqual(pack.questions.map(item => item.options[item.answer]), verbs);
}
assert.equal((await handleRequest(knowledgeRequest("words", { avoidWords: Array(301).fill("test") }), knowledgeEnv)).status, 400);
let retryCount = 0;
const retryKnowledgeEnv = { ...knowledgeEnv, AI: { async run(model, input) {
  if (model === "@cf/zai-org/glm-4.7-flash") {
    retryCount++;
    const pack = retryCount === 1 ? { items: Array(5).fill(knowledgePacks.words.items[0]) } : knowledgePacks.words;
    return { choices: [{ message: { content: JSON.stringify(pack) } }] };
  }
  return { response: { valid: true, reason: "correct" } };
} } };
assert.equal((await handleRequest(knowledgeRequest("words"), retryKnowledgeEnv)).status, 200);
assert.equal(retryCount, 2);
const rejectedKnowledgeEnv = { ...knowledgeEnv, AI: { async run(model, input) {
  return input.messages[0].content.startsWith("Check this") ? { response: { valid: false, reason: "incorrect" } } :
    { choices: [{ message: { content: JSON.stringify(knowledgePacks.words) } }] };
} } };
assert.equal((await handleRequest(knowledgeRequest("words"), rejectedKnowledgeEnv)).status, 502);
const checked = await handleRequest(post("/knowledge", JSON.stringify({ action: "check", mode: "translate", source: "我想要水。", reference: "I would like water.", answer: "I would like some water." })), knowledgeEnv);
assert.deepEqual(await checked.json(), { acceptable: true, feedback: "意思表达正确，可以继续下一句。", improved: "I would like some water.", reference: "I would like water." });
assert.equal((await handleRequest(knowledgeRequest("invalid"), knowledgeEnv)).status, 400);
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
