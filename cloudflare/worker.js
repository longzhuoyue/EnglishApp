import * as OpenCC from "opencc-js/core";
import * as Locale from "opencc-js/preset";

const SITE = "https://longzhuoyue.github.io";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const TEACH_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const KNOWLEDGE_MODEL = "@cf/zai-org/glm-4.7-flash";
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";
const SPEECH_MODEL = "@cf/openai/whisper";
const simplify = OpenCC.ConverterFactory(Locale.from.tw, Locale.to.cn);
const GRAMMAR_TOPICS = [
  ["am / is / are", "I 后用 am；he、she、it 后用 is；you、we、they 后用 are。"],
  ["一般现在时肯定句", "说经常做的事，用动词原形；主语是 he、she、it 时，动词通常加 s 或 es。"],
  ["一般现在时否定句", "I、you、we、they 后用 don't 加动词原形；he、she、it 后用 doesn't 加动词原形。"],
  ["一般现在时疑问句", "一般疑问句常以 Do 或 Does 开头，后面的主要动词用原形。"],
  ["have / has", "I、you、we、they 后用 have；he、she、it 后用 has，表示拥有。"],
  ["can / can't", "can 表示会或能够，can't 表示不会或不能；后面都接动词原形。"],
  ["a / an", "单数可数名词前常用 a 或 an；元音音素开头的词前通常用 an。"],
  ["名词复数", "表示两个或更多，名词通常加 s；有些词要加 es 或改变拼写。"],
  ["there is / there are", "介绍某处有什么：一个或不可数用 there is；多个用 there are。"],
  ["现在进行时", "说正在发生的事，使用 am、is 或 are 加动词的 ing 形式。"],
  ["一般过去时", "说过去发生的事，规则动词通常加 ed，例如 walk → walked、watch → watched。"],
  ["常见不规则过去式", "一些动词的过去式不加 ed，要单独记忆，例如 go → went、see → saw。"]
];
const GRAMMAR_TASKS = [
  "Put a subject before ___ and use only am/is/are as options.",
  "Use habitual ACTION verbs such as play, cook, work, live, like, and read. Use only pronoun subjects I/you/we/they/he/she/it. Options must contrast base verb, third-person -s/-es, and -ing. Do not test am/is/are.",
  "Test negative habitual ACTION verbs: pronoun subject ___ base verb. Use only pronoun subjects I/you/we/they/he/she/it. Options must include don't and doesn't, and the correct one must match the subject.",
  "Start each question with ___ followed by a pronoun subject I/you/we/they/he/she/it and a base ACTION verb. Options must include Do and Does; the correct one must match the subject.",
  "Use pronoun subject I/you/we/they/he/she/it ___ object with have and has among the options. The answer must match the subject.",
  "All 3 prompts MUST contain the literal text 'can ___' or 'can't ___'. The blank is ALWAYS the action verb AFTER can/can't, NEVER can/can't itself. For each question choose one verb such as swim, sing, cook, or play; options must be that same verb in base, -s, and -ing forms. Example: prompt='She can ___ well.', options=['swim','swims','swimming'], answer=0. The base form is always correct. Never put can, can't, do, or doesn't in options.",
  "Put ___ immediately before a simple singular noun. Options must include a and an. Use clear words like apple, egg, orange, book, bag, or car.",
  "Put ___ after a number such as two, three, or four, and test the PLURAL form of a noun. Do not test verbs.",
  "Start each question with There ___, and test is versus are according to the following noun phrase.",
  "Use only pronoun subjects I/you/we/they/he/she/it. Put ___ AFTER the subject and BEFORE an -ing ACTION verb. The three options must be am, is, and are; the answer must agree with the subject. Never blank the subject.",
  "Test only REGULAR past affirmative ACTION verbs from walk/walked, play/played, watch/watched, clean/cleaned, cook/cooked, open/opened. Use yesterday or last night. The correct option must be one of walked/played/watched/cleaned/cooked/opened. NEVER include do/did, go/went, eat/ate, or see/saw in questions or options. Example: prompt='She ___ TV yesterday.', options=['watch','watched','watching'], answer=1.",
  "At least TWO questions must test irregular past verbs from go/went, see/saw, eat/ate, take/took, come/came, have/had, do/did, buy/bought. The third may contrast one regular past verb. Every question must include yesterday, last night, or last weekend. Never invent irregular forms."
];

const KNOWLEDGE_SCENES = ["打招呼", "自我介绍", "咖啡店", "餐厅", "问路", "购物", "乘车", "酒店", "天气", "周末计划", "兴趣爱好", "寻求帮助"];
const BE_FOR_PRONOUN = { i: "am", you: "are", we: "are", they: "are", he: "is", she: "is", it: "is" };
const REGULAR_PAST = ["walked", "played", "watched", "cleaned", "cooked", "opened", "washed", "brushed",
  "worked", "liked", "visited", "helped", "asked", "called", "started"];
const IRREGULAR_PAST = ["went", "saw", "ate", "had", "took", "came", "did", "bought", "gave", "found", "made", "wrote", "ran"];
function canVerbForms(verb) {
  if (typeof verb !== "string" || !/^[a-z]{2,20}$/.test(verb) ||
      ["can", "cannot", "is", "are", "was", "were"].includes(verb)) return null;
  const third = ({ have: "has", do: "does" })[verb] ||
    (/[^aeiou]y$/.test(verb) ? `${verb.slice(0, -1)}ies` : /(?:s|sh|ch|x|z|o)$/.test(verb) ? `${verb}es` : `${verb}s`);
  const ing = ({ swim: "swimming", run: "running", sit: "sitting", get: "getting",
    stop: "stopping", shop: "shopping", plan: "planning", put: "putting", cut: "cutting",
    die: "dying", lie: "lying", tie: "tying" })[verb] ||
    (/e$/.test(verb) && !/(?:ee|ye|oe)$/.test(verb) ? `${verb.slice(0, -1)}ing` : `${verb}ing`);
  return [verb, third, ing];
}
const stringField = { type: "string" };
const objectField = properties => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const arrayField = (items, count) => ({ type: "array", minItems: count, maxItems: count, items });
const knowledgeQuestion = objectField({ prompt: stringField, options: arrayField(stringField, 3), answer: { type: "integer" }, explanation: stringField });
const KNOWLEDGE_SCHEMAS = {
  words: objectField({ items: arrayField(objectField({ en: stringField, zh: stringField, example: stringField, exampleZh: stringField }), 5) }),
  grammar: objectField({ examples: arrayField(objectField({ en: stringField, zh: stringField }), 2), questions: arrayField(knowledgeQuestion, 3) }),
  translate: objectField({ items: arrayField(objectField({ zh: stringField, reference: stringField, hint: stringField }), 3) }),
  reading: objectField({ lines: arrayField(objectField({ en: stringField, zh: stringField }), 8), questions: arrayField(knowledgeQuestion, 3) })
};

const courseText = objectField({ en: stringField, zh: stringField });
const courseChoice = objectField({ prompt: stringField, options: arrayField(stringField, 3), answer: { type: "integer" } });
const COURSE_SCHEMA = objectField({
  words: arrayField(courseText, 6), examples: arrayField(courseText, 2),
  clips: arrayField(objectField({ a: stringField, aZh: stringField, b: stringField, bZh: stringField,
    prompt: stringField, options: arrayField(stringField, 3), answer: { type: "integer" } }), 3),
  grammar: arrayField(objectField({ prompt: stringField, options: arrayField(stringField, 3),
    answer: { type: "integer" }, why: stringField }), 3),
  reading: objectField({ en: stringField, zh: stringField, questions: arrayField(courseChoice, 3) }),
  output: objectField({ prompt: stringField, sample: stringField })
});

function validCoursePack(pack, level) {
  const text = (value, max = 600) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
  const pair = item => item && text(item.en, 180) && text(item.zh, 220) && /[A-Za-z]/.test(item.en) && /[\u3400-\u9fff]/.test(item.zh);
  const choice = item => item && text(item.prompt, 200) && Array.isArray(item.options) && item.options.length === 3 &&
    item.options.every(option => text(option, 120)) && new Set(item.options.map(option => option.trim().toLowerCase())).size === 3 &&
    Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 3;
  const count = value => (value.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length;
  return pack && JSON.stringify(pack).length <= 14000 &&
    Array.isArray(pack.words) && pack.words.length === 6 && pack.words.every(pair) &&
    new Set(pack.words.map(item => item.en.toLowerCase().trim())).size === 6 &&
    new Set(pack.words.map(item => item.zh.trim())).size === 6 &&
    Array.isArray(pack.examples) && pack.examples.length === 2 && pack.examples.every(pair) &&
    Array.isArray(pack.clips) && pack.clips.length === 3 && pack.clips.every(clip =>
      clip && text(clip.a, 180) && text(clip.b, 180) && text(clip.aZh, 220) && text(clip.bZh, 220) && choice(clip)) &&
    new Set(pack.clips.map(clip => `${clip.a} ${clip.b}`.toLowerCase())).size === 3 &&
    Array.isArray(pack.grammar) && pack.grammar.length === 3 && pack.grammar.every(item => choice(item) && text(item.why, 220)) &&
    new Set(pack.grammar.map(item => item.prompt.toLowerCase())).size === 3 &&
    pack.reading && text(pack.reading.en, 1300) && text(pack.reading.zh, 1500) &&
    count(pack.reading.en) >= ({ B1: 55, B2: 70, C1: 85, C2: 95 })[level] &&
    Array.isArray(pack.reading.questions) && pack.reading.questions.length === 3 &&
    pack.reading.questions.every(choice) &&
    pack.output && text(pack.output.prompt, 240) && text(pack.output.sample, 650) &&
    /[A-Za-z]/.test(pack.output.sample);
}

async function generateCourse(input, env, retry = false) {
  const level = input.level.toUpperCase();
  const model = retry ? TEACH_MODEL : KNOWLEDGE_MODEL;
  const prompt = `Create ONE original ${level} English micro-lesson. The fixed title is "${input.title}". Learning goal: ${input.goal}. Exact teaching point: ${input.rule}. Focus every task on this point and a realistic situation appropriate for ${level}. Return only the JSON fields in the schema. Give 6 DIFFERENT useful English words or short phrases with accurate Simplified Chinese meanings; 2 natural example sentences with accurate translations; 3 DIFFERENT two-turn English dialogues, each with line-by-line Simplified Chinese and its OWN Chinese comprehension question; 3 distinct English grammar or usage multiple-choice questions with one defensible answer and a short specific Simplified Chinese explanation; one coherent ${level} English reading passage of ${level === "B1" ? "65–90" : level === "B2" ? "80–110" : level === "C1" ? "95–130" : "110–150"} words with an accurate Simplified Chinese translation and 3 distinct Chinese comprehension questions; one English writing/speaking task and a realistic English sample. Every question has exactly three distinct options, exactly one supported answer, and a 0-based answer index. Avoid questions about the first or last line of a passage. All Chinese MUST be mainland Simplified Chinese. No pronunciation score or claim of CEFR certification.${retry ? " The previous attempt failed format/content checks; pay special attention to all required fields and reading length." : ""}`;
  const result = await env.AI.run(model, {
    messages: [{ role: "system", content: prompt }, { role: "user", content: `生成第 ${input.sequence + 1} 单元：${input.title}。语法及理解题必须紧扣该知识点，不重复同一问题。` }],
    response_format: { type: "json_schema", json_schema: COURSE_SCHEMA },
    ...(retry ? { max_tokens: 3200 } : { chat_template_kwargs: { enable_thinking: false }, max_completion_tokens: 3200 }),
    temperature: 0.35
  });
  let pack = retry ? result.response : result.choices?.[0]?.message?.content;
  if (typeof pack === "string") { try { pack = JSON.parse(pack); } catch { return null; } }
  if (!validCoursePack(pack, level)) return null;
  if (!retry) {
    const review = await env.AI.run(TEACH_MODEL, {
      messages: [{ role: "system", content: "Review an English micro-lesson. Reject only a clear teaching error: incorrect English, inaccurate Chinese translation, a comprehension answer not supported by its dialogue or reading, or more than one defensible choice. Accept natural alternatives. Return JSON with valid boolean and a brief English reason." },
        { role: "user", content: JSON.stringify({ level, title: input.title, rule: input.rule, pack }) }],
      response_format: { type: "json_schema", json_schema: objectField({ valid: { type: "boolean" }, reason: stringField }) },
      max_tokens: 80, temperature: 0.1
    });
    let verdict = review.response;
    if (typeof verdict === "string") { try { verdict = JSON.parse(verdict); } catch { return null; } }
    if (!verdict || verdict.valid !== true) return null;
  }
  const clean = value => simplify(value.trim());
  return { words: pack.words.map(item => ({ en: item.en.trim(), zh: clean(item.zh) })),
    examples: pack.examples.map(item => ({ en: item.en.trim(), zh: clean(item.zh) })),
    clips: pack.clips.map(item => ({ a: item.a.trim(), aZh: clean(item.aZh), b: item.b.trim(), bZh: clean(item.bZh),
      prompt: clean(item.prompt), options: item.options.map(clean), answer: item.answer })),
    grammar: pack.grammar.map(item => ({ prompt: item.prompt.trim(), options: item.options.map(option => option.trim()),
      answer: item.answer, why: clean(item.why) })),
    reading: { en: pack.reading.en.trim(), zh: clean(pack.reading.zh),
      questions: pack.reading.questions.map(item => ({ prompt: clean(item.prompt), options: item.options.map(clean), answer: item.answer })) },
    output: { prompt: clean(pack.output.prompt), sample: pack.output.sample.trim() } };
}

function grammarQuestionMatches(topic, item) {
  const prompt = item.prompt;
  const options = item.options.map(option => option.toLowerCase());
  const selected = options[item.answer];
  const subject = prompt.match(/\b(My (?:brother|sister|mother|father|friend)|The (?:cat|dog|man|woman|boy|girl|teacher)|I|you|we|they|he|she|it)\s+___/i)?.[1]?.toLowerCase();
  const third = ["he", "she", "it"].includes(subject) || /^(my|the) /.test(subject || "");
  if (topic === 0) return !!subject && options.includes("am") && options.includes("is") && options.includes("are") &&
    selected === (subject === "i" ? "am" : third ? "is" : "are");
  if (topic === 1) return !!subject &&
    options.some(option => option.endsWith("ing")) && options.some(option => /s$/.test(option)) &&
    !["am", "is", "are", "was", "were"].includes(selected);
  if (topic === 2) return !!subject && options.includes("don't") && options.includes("doesn't") &&
    selected === (third ? "doesn't" : "don't");
  if (topic === 3) {
    const next = prompt.match(/^___\s+(I|you|we|they|he|she|it)\b/i)?.[1]?.toLowerCase();
    return !!next && options.includes("do") && options.includes("does") &&
      selected === (["he", "she", "it"].includes(next) ? "does" : "do");
  }
  if (topic === 4) return !!subject && options.includes("have") && options.includes("has") &&
    selected === (third ? "has" : "have");
  if (topic === 5) {
    const forms = canVerbForms(selected);
    return /\bcan(?:'t)?\s+___/i.test(prompt) && !!forms && forms.every(form => options.includes(form));
  }
  if (topic === 6) return /___\s+[A-Za-z]+/.test(prompt) && options.includes("a") && options.includes("an") &&
    ["a", "an"].includes(selected);
  if (topic === 7) return /\b(two|three|four|five|six|many|several)\s+___/i.test(prompt) &&
    (/s$/.test(selected) || ["children", "people", "men", "women"].includes(selected));
  if (topic === 8) return /^There\s+___/i.test(prompt) && options.includes("is") && options.includes("are") &&
    ["is", "are"].includes(selected);
  if (topic === 9) {
    const pronoun = prompt.match(/^(?:(I|you|we|they|he|she|it)\s+___|___\s+(I|you|we|they|he|she|it))\s+\w+ing\b/i);
    if (pronoun) return selected === BE_FOR_PRONOUN[(pronoun[1] || pronoun[2]).toLowerCase()];
    return (/\b(am|is|are)\s+___/i.test(prompt) && selected.endsWith("ing")) ||
      (/___\s+\w+ing\b/i.test(prompt) && ["am", "is", "are"].includes(selected));
  }
  if (topic === 10) return /\b(yesterday|last|ago)\b/i.test(prompt) && REGULAR_PAST.includes(selected);
  return /\b(yesterday|last|ago)\b/i.test(prompt) &&
    (IRREGULAR_PAST.includes(selected) || REGULAR_PAST.includes(selected));
}

function validGeneratedKnowledge(mode, output, avoidWords, topic) {
  if (!output || typeof output !== "object" || JSON.stringify(output).length > 12000) return false;
  const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
  const chinese = (value, max) => text(value, max) && /[\u3400-\u9fff]/.test(value) &&
    !/(也也|我我|你你|他他|她她|它它|是是|有有|在在|的的|了了|都都|很很|和和|或或|再再)/.test(value);
  const english = (value, max) => text(value, max) && /[A-Za-z]/.test(value);
  const question = item => item && text(item.prompt, 180) && Array.isArray(item.options) && item.options.length === 3 &&
    item.options.every(option => text(option, 100)) && new Set(item.options.map(option => option.toLowerCase().trim())).size === 3 &&
    Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 3 && chinese(item.explanation, 240);
  if (mode === "words") return Array.isArray(output.items) && output.items.length === 5 &&
    output.items.every(item => item && /^[A-Za-z]+(?:-[A-Za-z]+)?$/.test(item.en) && item.en.length <= 24 &&
      !avoidWords.includes(item.en.toLowerCase()) && chinese(item.zh, 60) &&
      english(item.example, 140) && chinese(item.exampleZh, 180) &&
      item.example.toLowerCase().includes(item.en.toLowerCase())) &&
    new Set(output.items.map(item => item.en.toLowerCase())).size === 5;
  if (mode === "grammar") return Array.isArray(output.examples) && output.examples.length === 2 &&
    output.examples.every(item => item && english(item.en, 140) && chinese(item.zh, 180) &&
      !item.en.includes("_") && !item.zh.includes("_")) &&
    Array.isArray(output.questions) && output.questions.length === 3 &&
    output.questions.every(item => {
      if (!question(item) || !item.prompt.includes("___") || item.prompt.includes("____") ||
          (item.prompt.match(/___/g) || []).length !== 1 || /[\u3400-\u9fff()]/.test(item.prompt) ||
          !item.options.every(option => /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(option))) return false;
      return grammarQuestionMatches(topic, item);
    }) && new Set(output.questions.map(item => item.prompt.toLowerCase().trim())).size === 3 &&
    (topic !== 11 || output.questions.filter(item => IRREGULAR_PAST.includes(item.options[item.answer].toLowerCase())).length >= 2);
  if (mode === "translate") return Array.isArray(output.items) && output.items.length === 3 &&
    output.items.every(item => item && chinese(item.zh, 100) && !/[A-Za-z]/.test(item.zh) &&
      english(item.reference, 160) && chinese(item.hint, 120)) &&
    new Set(output.items.map(item => item.zh.trim())).size === 3;
  const passage = Array.isArray(output.lines) ? output.lines.map(line => line.en).join(" ") : "";
  return mode === "reading" && Array.isArray(output.lines) && output.lines.length === 8 &&
    output.lines.every(line => line && english(line.en, 160) && chinese(line.zh, 180) &&
      (line.en.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length >= 5) &&
    (passage.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length >= 60 &&
    (passage.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length <= 125 &&
    Array.isArray(output.questions) && output.questions.length === 3 &&
    output.questions.every(item => question(item) && chinese(item.prompt, 180) &&
      item.options.every(option => english(option, 100)));
}

function grammarPack(topic, output) {
  const [title, rule] = GRAMMAR_TOPICS[topic];
  return { mode: "grammar", title, rule,
    examples: output.examples.map(item => ({ en: item.en.trim(), zh: simplify(item.zh.trim()) })),
    questions: output.questions.map(item => ({ prompt: item.prompt.trim(), options: item.options.map(option => option.trim()),
      answer: item.answer, explanation: rule })) };
}

function beQuestionsFromExamples(examples) {
  if (!Array.isArray(examples)) return [];
  const questions = [];
  for (const item of examples) {
    const match = typeof item?.en === "string" && item.en.match(/^(I|you|we|they|he|she|it)\s+(am|is|are)(\b.*)$/i);
    if (!match || BE_FOR_PRONOUN[match[1].toLowerCase()] !== match[2].toLowerCase()) continue;
    const subjects = [match[1]];
    const alternate = ({ i: "You", he: "She", she: "He" })[match[1].toLowerCase()];
    if (alternate) subjects.push(alternate);
    for (const subject of subjects) questions.push({ prompt: `${subject} ___${match[3]}`,
      options: ["am", "is", "are"], answer: ["am", "is", "are"].indexOf(BE_FOR_PRONOUN[subject.toLowerCase()]),
      explanation: GRAMMAR_TOPICS[0][1] });
  }
  return questions;
}

function mergeGrammar(topic, outputs) {
  const candidates = outputs.filter(Boolean);
  const questions = candidates.flatMap(output => [...(Array.isArray(output.questions) ? output.questions : []),
    ...(topic === 0 ? beQuestionsFromExamples(output.examples) : [])]);
  for (const source of candidates) {
    for (let first = 0; first < questions.length - 2; first++)
      for (let second = first + 1; second < questions.length - 1; second++)
        for (let third = second + 1; third < questions.length; third++) {
          const output = { examples: source.examples, questions: [questions[first], questions[second], questions[third]] };
          if (validGeneratedKnowledge("grammar", output, [], topic)) return grammarPack(topic, output);
        }
  }
  return null;
}

async function generateKnowledge(input, env, retry = false) {
  const mode = input.mode;
  const scene = KNOWLEDGE_SCENES[input.sequence % KNOWLEDGE_SCENES.length];
  const [title, rule] = mode === "grammar" ? GRAMMAR_TOPICS[input.topic] : [scene, ""];
  const instructions = {
    words: `Generate 5 DISTINCT single-word A1 everyday English vocabulary items related to ${scene}. Give a short accurate Simplified Chinese meaning, one natural A1 example containing the exact English word, and an accurate Simplified Chinese translation for every example. Never use these already learned words: ${input.avoidWords.join(", ") || "none"}. No rare words, nonsense Chinese, repeated words, or extra fields.`,
    grammar: `Teach the fixed beginner grammar point "${title}". Exact rule: ${rule} Specific exercise pattern: ${GRAMMAR_TASKS[input.topic]} Generate 2 COMPLETE correct English example sentences with complete accurate Simplified Chinese translations; examples must contain NO blanks. Then generate 3 DISTINCT multiple-choice fill-in-the-blank questions. Every question prompt MUST be a complete English sentence containing the LITERAL EXACT THREE UNDERSCORES "___" (not more, not fewer); never put Chinese instructions or parentheses in the prompt. Each blank covers ONE word only. Every option must be ONE English word, never a whole phrase. Substituting exactly ONE option must make a correct sentence under the rule; the other two must be wrong. Give the correct answer index and a short specific Simplified Chinese explanation.`,
    translate: `Generate 3 DIFFERENT short natural Simplified Chinese sentences for an absolute beginner to translate into English, in the everyday scene "${scene}". For each give one English reference that means EXACTLY the same thing, and a short Simplified Chinese hint that does not reveal the whole English answer. Keep questions as questions, statements as statements; never add a reply to a question. Use accurate idiomatic language only.`,
    reading: `Generate one NEW coherent A1 English daily-life story about "${scene}" as EXACTLY 8 connected lines. Each line must have about 8-14 English words and its own accurate Simplified Chinese translation. Together the 8 lines must form one complete, logical story with no unrelated events. Then create 3 distinct comprehension questions with CHINESE prompts and CHINESE explanations. Give 3 short ENGLISH options per question. Exactly one option must be clearly supported by the English story; the other two must be clearly wrong. Never write question prompts in English.`
  };
  const result = await env.AI.run(KNOWLEDGE_MODEL, {
    messages: [{ role: "system", content: `You create accurate beginner English lessons. Chinese fields must use natural Simplified Chinese only; English fields must use natural beginner English only. Return only the requested JSON fields. ${instructions[mode]}` },
      { role: "user", content: mode === "grammar" ? `请生成第 ${input.sequence + 1} 组语法练习。questions.prompt 必须是完整英文句子，含三个下划线 ___，每题只考当前语法点。${input.topic === 0 ? "三道题的空格只能放在主语后面，选项只能是 am、is、are，绝不能把主语挖空。" : ""}${input.topic === 5 ? "这组三道题的空格一律放在 can 或 can't 后面，选项只填动作动词原形、第三人称形式和 ing 形式，绝不能把 can、can't、do 或 doesn't 放进选项。" : ""}${input.topic === 9 ? "现在进行时的三题只能挖空 am、is、are，不能挖空主语。" : ""}${input.topic === 11 ? "两个例句必须是完整英文句子，绝不能含下划线；每题必须有 yesterday、last night 或 last weekend。" : ""}${retry && input.topic === 11 ? "上一次未通过校验。这次三题正确答案必须全部是不规则过去式：went、saw、ate、took、came、had、did、bought 中任选三个；不得选 visited、finished 等规则过去式，且每个题目只能有一个 ___。" : ""}例句译文和解释用简体中文。` :
        `请生成第 ${input.sequence + 1} 组全新的练习。题目、提示和解释请使用简体中文；英文只放在英文句子、选项和单词字段中。` }],
    response_format: { type: "json_schema", json_schema: KNOWLEDGE_SCHEMAS[mode] },
    chat_template_kwargs: { enable_thinking: false },
    max_completion_tokens: mode === "reading" ? 1600 : mode === "grammar" ? 850 : mode === "translate" ? 650 : 800,
    temperature: 0.45
  });
  let output = result.choices?.[0]?.message?.content;
  if (typeof output === "string") { try { output = JSON.parse(output); } catch { return null; } }
  if (!output) return null;
  if (mode === "grammar" && input.topic === 0 && Array.isArray(output.questions)) {
    output.questions.forEach(item => {
      if (!item || typeof item.prompt !== "string" || !Array.isArray(item.options) ||
          !item.options.every(option => typeof option === "string")) return;
      const match = item.prompt.match(/^___\s+(?:(am|is|are)\s+)?(.+)$/i);
      const chosen = item.options[item.answer]?.trim();
      const part = chosen?.match(/^(I|you|we|they|he|she|it)(?:\s+(am|is|are))?$/i);
      const expected = BE_FOR_PRONOUN[part?.[1]?.toLowerCase()];
      if (!match || !expected || (match[1] && match[1].toLowerCase() !== expected) ||
          (part[2] && part[2].toLowerCase() !== expected) ||
          (["we", "they"].includes(part[1].toLowerCase()) && /^an?\s+/i.test(match[2]))) return;
      item.prompt = `${part[1].toLowerCase() === "i" ? "I" : part[1]} ___ ${match[2]}`;
      item.options = ["am", "is", "are"];
      item.answer = item.options.indexOf(expected);
    });
  }
  if (mode === "grammar" && [10, 11].includes(input.topic) && Array.isArray(output.questions)) {
    output.questions.forEach(item => {
      if (typeof item?.prompt === "string" && (item.prompt.match(/___/g) || []).length === 2)
        item.prompt = item.prompt.replace(/\s+___(?=\s+(?:yesterday|last\b))/i, "");
      if (typeof item?.prompt === "string") item.prompt = item.prompt.replace(/\bthis morning\b/gi, "yesterday morning");
      if (typeof item?.prompt === "string" && !/\b(yesterday|last|ago|tomorrow|next|today|now)\b/i.test(item.prompt))
        item.prompt = item.prompt.replace(/[.!?]$/, "") + " yesterday.";
      if (Array.isArray(item?.options)) {
        const pastForms = input.topic === 10 ? REGULAR_PAST : [...REGULAR_PAST, ...IRREGULAR_PAST];
        const matches = item.options.flatMap((option, index) => typeof option === "string" &&
          pastForms.includes(option.toLowerCase()) ? [index] : []);
        if (matches.length === 1) item.answer = matches[0];
      }
    });
  }
  if (mode === "grammar" && input.topic === 9 && Array.isArray(output.questions)) {
    output.questions.forEach(item => {
      if (!item || typeof item.prompt !== "string" || !Array.isArray(item.options)) return;
      item.prompt = item.prompt.replace(/^___\s+(I|you|we|they|he|she|it)\s+___\s+(\w+ing\b)/i, "___ $1 $2");
      const match = item.prompt.match(/^___\s+(am|is|are)\s+(\w+ing\b.*)$/i);
      const chosen = item.options[item.answer]?.trim();
      const expected = BE_FOR_PRONOUN[chosen?.toLowerCase()];
      if (!match || expected !== match[1].toLowerCase()) return;
      item.prompt = `${chosen === "i" ? "I" : chosen} ___ ${match[2]}`;
      item.options = ["am", "is", "are"];
      item.answer = item.options.indexOf(expected);
    });
  }
  if (mode === "grammar" && input.topic === 11 && Array.isArray(output.examples) &&
      output.examples.some(item => typeof item?.en !== "string" || item.en.includes("_"))) {
    output.examples = [{ en: "I went to the park yesterday.", zh: "我昨天去了公园。" },
      { en: "She saw a movie last night.", zh: "她昨晚看了一部电影。" }];
  }
  if (mode === "grammar" && input.topic === 5 && Array.isArray(output.questions)) {
    output.questions.forEach((item, index) => {
      if (!item || typeof item.prompt !== "string" || !Array.isArray(item.options) ||
          !item.options.every(option => typeof option === "string") || grammarQuestionMatches(5, item)) return;
      const match = item.prompt.match(/^(.+?)\s+___\s+(\w+)(\b.*)$/i);
      const forms = match && canVerbForms(match[2].toLowerCase());
      const selected = item.options[item.answer]?.toLowerCase();
      if (!forms || /\bcan(?:'t)?$/i.test(match[1]) ||
          !(selected === forms[0] || item.options.some(option => ["can", "can't"].includes(option.toLowerCase())))) return;
      item.prompt = `${match[1]} ${selected === "can't" ? "can't" : "can"} ___${match[3]}`;
      item.options = forms.slice(index).concat(forms.slice(0, index));
      item.answer = (3 - index) % 3;
    });
  }
  if (!validGeneratedKnowledge(mode, output, input.avoidWords, input.topic))
    return mode === "grammar" && JSON.stringify(output).length <= 12000 ? { incomplete: output } : null;
  let verdict = { valid: true };
  if (mode !== "grammar") {
    const review = await env.AI.run(TEACH_MODEL, {
      messages: [{ role: "system", content: "Check this beginner English lesson for clear errors: nonsensical Chinese, wrong English grammar, wrong Chinese-English meaning, or incorrect question answers. Accept natural alternatives and simple repetition. Reject only a clear learning error. Return JSON with valid boolean and a short English reason." },
        { role: "user", content: JSON.stringify({ mode, rule, output }) }],
      response_format: { type: "json_schema", json_schema: objectField({ valid: { type: "boolean" }, reason: stringField }) },
      max_tokens: 80, temperature: 0.1
    });
    verdict = review.response;
    if (typeof verdict === "string") { try { verdict = JSON.parse(verdict); } catch { return null; } }
  }
  if (!verdict || verdict.valid !== true) return null;
  const clean = value => simplify(value.trim());
  if (mode === "words") return { mode, title: `${scene} · 第${input.sequence + 1}组`,
    items: output.items.map(item => ({ en: item.en.trim().toLowerCase(), zh: clean(item.zh),
      example: item.example.trim(), exampleZh: clean(item.exampleZh) })) };
  if (mode === "grammar") return grammarPack(input.topic, output);
  if (mode === "translate") return { mode, title: `${scene} · 第${input.sequence + 1}组`,
    items: output.items.map(item => ({ zh: clean(item.zh), reference: item.reference.trim(), hint: clean(item.hint) })) };
  return { mode, title: `${scene} · 第${input.sequence + 1}篇`, passage: output.lines.map(line => line.en.trim()).join(" "),
    translation: output.lines.map(line => clean(line.zh)).join(""), questions: output.questions.map(item => ({ prompt: clean(item.prompt),
      options: item.options.map(option => option.trim()), answer: item.answer, explanation: clean(item.explanation) })) };
}

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
    if (path === "/course") {
      if (Number(request.headers.get("content-length")) > 1800) return reply({ error: "课程请求太长。" }, 413);
      const body = await request.text();
      if (body.length > 1800) return reply({ error: "课程请求太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "课程请求无效。" }, 400); }
      if (!input || !["b1", "b2", "c1", "c2"].includes(input.level) ||
          !Number.isInteger(input.sequence) || input.sequence < 0 || input.sequence > 43 ||
          !["title", "goal", "rule"].every(key => typeof input[key] === "string" && input[key].trim() && input[key].length <= 180))
        return reply({ error: "课程请求无效。" }, 400);
      let pack = await generateCourse(input, env);
      if (!pack) pack = await generateCourse(input, env, true);
      return pack ? reply(pack) : reply({ error: "这次课程内容未通过检查，请再试一次。" }, 502);
    }
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
    if (path === "/knowledge") {
      if (Number(request.headers.get("content-length")) > 8000) return reply({ error: "练习请求太长。" }, 413);
      const body = await request.text();
      if (body.length > 8000) return reply({ error: "练习请求太长。" }, 413);
      let input;
      try { input = JSON.parse(body); } catch { return reply({ error: "练习请求无效。" }, 400); }
      if (input && input.action === "check") {
        if (input.mode !== "translate" || ["source", "reference", "answer"].some(key => typeof input[key] !== "string" || !input[key].trim() || input[key].length > 300))
          return reply({ error: "翻译答案无效。" }, 400);
        const result = await env.AI.run(TEACH_MODEL, {
          messages: [{ role: "system", content: "Decide whether the learner's English conveys the Chinese source naturally enough. Accept valid alternatives to the reference. Ignore minor punctuation and capitalization. Return only JSON with acceptable as boolean." },
            { role: "user", content: `中文原句：${input.source}\n参考表达：${input.reference}\n学习者写的英文：${input.answer}` }],
          response_format: { type: "json_schema", json_schema: { type: "object", properties: {
            acceptable: { type: "boolean" }
          }, required: ["acceptable"], additionalProperties: false } },
          max_tokens: 50, temperature: 0.1
        });
        let output = result.response;
        if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }
        if (!output || typeof output.acceptable !== "boolean") return reply({ error: "评改没有完成，请再试一次。" }, 502);
        return reply({ acceptable: output.acceptable,
          feedback: output.acceptable ? "意思表达正确，可以继续下一句。" : "这句与原意还有差别，请对照参考表达学习。",
          improved: output.acceptable ? input.answer.trim() : input.reference.trim(), reference: input.reference.trim() });
      }
      if (input && input.action === "generate") {
        if (input.sequence === undefined) input.sequence = 0;
        if (input.avoidWords === undefined) input.avoidWords = [];
      }
      if (!input || input.action !== "generate" || !["words", "grammar", "translate", "reading"].includes(input.mode) ||
          !Number.isInteger(input.sequence) || input.sequence < 0 || input.sequence > 100000 ||
          !Array.isArray(input.avoidWords) || input.avoidWords.length > 300 ||
          input.avoidWords.some(word => typeof word !== "string" || !/^[a-z]+(?:-[a-z]+)?$/.test(word) || word.length > 24) ||
          (input.mode === "grammar" && (!Number.isInteger(input.topic) || input.topic < 0 || input.topic >= GRAMMAR_TOPICS.length)))
        return reply({ error: "练习请求无效。" }, 400);
      let pack = await generateKnowledge(input, env);
      if (input.mode === "grammar" && pack?.incomplete)
        pack = mergeGrammar(input.topic, [pack.incomplete]) || pack;
      if (!pack || pack.incomplete) {
        const second = await generateKnowledge(input, env, true);
        pack = second && !second.incomplete ? second : input.mode === "grammar" ?
          mergeGrammar(input.topic, [pack?.incomplete, second?.incomplete]) : null;
      }
      return pack ? reply(pack) : reply({ error: input.mode === "grammar" ?
        `${GRAMMAR_TOPICS[input.topic][0]}：这次 AI 练习未通过内容检查，请再试一次。` :
        "这次 AI 练习未通过内容检查，请再试一次。" }, 502);
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
