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
const invalidGrammar = await handleRequest(knowledgeRequest("grammar", { topic: 2 }), knowledgeEnv);
assert.equal(invalidGrammar.status, 502);
assert.match((await invalidGrammar.json()).error, /一般现在时否定句/);
const bePack = { examples: knowledgePacks.grammar.examples, questions: [
  { prompt: "___ is my best friend.", options: ["I", "He", "You"], answer: 1, explanation: "He 后面用 is。" },
  { prompt: "___ a doctor.", options: ["You", "She", "It"], answer: 0, explanation: "You 后面用 are。" },
  { prompt: "___ a student.", options: ["I am", "You are", "He is"], answer: 0, explanation: "I 后面用 am。" }
] };
let beAttempts = 0;
const normalizedBe = await handleRequest(knowledgeRequest("grammar", { topic: 0 }), {
  ...env, AI: { async run() { beAttempts++; return { choices: [{ message: { content: JSON.stringify(bePack) } }] }; } }
});
assert.equal(normalizedBe.status, 200);
assert.equal(beAttempts, 1);
assert.deepEqual((await normalizedBe.json()).questions.map(item => item.options[item.answer]), ["is", "are", "am"]);
const beMissingSubjects = { examples: [{ en: "I am a student.", zh: "我是一名学生。" },
  { en: "She is happy today.", zh: "她今天很开心。" }], questions: [
  { prompt: "___ a nice day today.", options: ["am", "is", "are"], answer: 1, explanation: "It 后面用 is。" },
  { prompt: "___ my best friend.", options: ["am", "is", "are"], answer: 0, explanation: "I 后面用 am。" },
  { prompt: "___ very happy.", options: ["am", "is", "are"], answer: 2, explanation: "They 后面用 are。" }
] };
let missingAttempts = 0;
const recoveredBe = await handleRequest(knowledgeRequest("grammar", { topic: 0 }), {
  ...env, AI: { async run() { missingAttempts++; return { choices: [{ message: { content: JSON.stringify(beMissingSubjects) } }] }; } }
});
assert.equal(recoveredBe.status, 200);
assert.equal(missingAttempts, 1);
assert.equal((await recoveredBe.json()).questions.length, 3);
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
const ongoingPack = { examples: [{ en: "She is reading a book now.", zh: "她现在正在读书。" },
  { en: "They are playing outside.", zh: "他们正在外面玩。" }], questions: [
  { prompt: "___ is cooking dinner.", options: ["He", "She", "They"], answer: 0, explanation: "主语是 He。" },
  { prompt: "___ you listening to music?", options: ["Are", "Am", "Is"], answer: 0, explanation: "you 前面用 Are。" },
  { prompt: "___ he ___ working now?", options: ["Is", "Are", "Am"], answer: 0, explanation: "he 前面用 Is。" }
] };
const pastPack = { examples: [{ en: "I ___ to the park yesterday.", zh: "我昨天去了公园。" },
  { en: "She ___ a movie last night.", zh: "她昨晚看了一部电影。" }], questions: [
  { prompt: "She ___ her grandmother last weekend.", options: ["visit", "visited", "visiting"], answer: 1, explanation: "visit 的过去式是 visited。" },
  { prompt: "I ___ bread this morning.", options: ["ate", "eat", "eats"], answer: 0, explanation: "eat 的过去式是 ate。" },
  { prompt: "He ___ his homework ___ last night.", options: ["did", "do", "done"], answer: 1, explanation: "do 的过去式是 did。" }
] };
for (const [topic, generated] of [[9, ongoingPack], [11, pastPack]]) {
  let attempts = 0;
  const response = await handleRequest(knowledgeRequest("grammar", { topic }), {
    ...env, AI: { async run() { attempts++; return { choices: [{ message: { content: JSON.stringify(generated) } }] }; } }
  });
  assert.equal(response.status, 200, `grammar topic ${topic}`);
  assert.equal(attempts, 1);
  const pack = await response.json();
  assert.ok(pack.examples.every(item => !item.en.includes("_")));
  if (topic === 9) assert.ok(pack.questions.every(item => ["is", "are"].includes(item.options[item.answer].toLowerCase())));
  if (topic === 11) {
    assert.ok(pack.questions.every(item => !item.prompt.includes("morning yesterday")));
    assert.equal(pack.questions[2].options[pack.questions[2].answer], "did");
  }
}
const tooRegular = structuredClone(pastPack);
tooRegular.questions[1] = { prompt: "He ___ his homework yesterday.", options: ["finish", "finished", "finishing"],
  answer: 1, explanation: "finish 的过去式是 finished。" };
let pastAttempts = 0;
const correctedPast = await handleRequest(knowledgeRequest("grammar", { topic: 11 }), {
  ...env, AI: { async run(model, input) {
    pastAttempts++;
    if (pastAttempts === 2) assert.match(input.messages[1].content, /上一次未通过校验/);
    return { choices: [{ message: { content: JSON.stringify(pastAttempts === 1 ? tooRegular : pastPack) } }] };
  } }
});
assert.equal(correctedPast.status, 200);
assert.equal(pastAttempts, 2);
const firstPartial = structuredClone(pastPack);
firstPartial.questions[2].prompt = "He ___ his homework and ___ to bed last night.";
const secondPartial = structuredClone(pastPack);
secondPartial.questions[0] = { prompt: "They ___ to the zoo last weekend.", options: ["go", "went", "gone"],
  answer: 1, explanation: "go 的过去式是 went。" };
secondPartial.questions[1].prompt = "I ___ and ___ breakfast yesterday.";
secondPartial.questions[2].prompt = "He ___ and ___ his homework yesterday.";
let partialAttempts = 0;
const mergedPast = await handleRequest(knowledgeRequest("grammar", { topic: 11 }), {
  ...env, AI: { async run() {
    partialAttempts++;
    return { choices: [{ message: { content: JSON.stringify(partialAttempts === 1 ? firstPartial : secondPartial) } }] };
  } }
});
assert.equal(mergedPast.status, 200);
assert.equal(partialAttempts, 2);
assert.deepEqual((await mergedPast.json()).questions.map(item => item.options[item.answer]).sort(), ["ate", "visited", "went"]);
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
