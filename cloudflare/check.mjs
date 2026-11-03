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
assert.equal(calls[0].input.messages[0].content.includes("简体中文（zh-CN）"), true);
assert.equal(calls[0].input.messages.at(-1).content, "I want tea.");
const speech = await handleRequest(post("/transcribe", new Uint8Array([1, 2, 3]), "audio/mp4"), env);
assert.equal((await speech.json()).transcript, "我想点一杯咖啡。你今天怎么样？学习英语很有趣。");
assert.equal(calls[1].input.audio.length, 3);
const foreign = new Request(url + "/chat", { method: "POST", headers: { origin: "https://other.example", "x-wordspring-passcode": "test-only" }, body: "{}" });
assert.equal((await handleRequest(foreign, env)).status, 403);
console.log("WordSpring AI Worker checks passed");
