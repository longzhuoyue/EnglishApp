const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { nextInterval, nextReview, isDue } = require("./app.js");

const words = JSON.parse(fs.readFileSync(path.join(__dirname, "words.json"), "utf8"));
assert.equal(words.length, 20);
assert.equal(new Set(words.map(word => word.english)).size, words.length);
assert.deepEqual([0, 1, 3, 7, 15].map(days => nextInterval(days, true)), [1, 3, 7, 15, 30]);
assert.equal(nextInterval(7, false), 0);
assert.equal(nextReview(1000, 7, false), 601000);
assert.equal(isDue({ nextReview: 2000 }, 1999), false);
assert.equal(isDue({ nextReview: 2000 }, 2000), true);
assert.equal(isDue({ nextReview: "invalid" }, 2000), true);
for (const file of ["index.html", "app.js", "words.json", "manifest.webmanifest", "icon-180.png", "icon-512.png", "sw.js"]) {
  assert.ok(fs.existsSync(path.join(__dirname, file)), `${file} is missing`);
}
console.log("WordSpring web checks passed");
