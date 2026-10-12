// Fails when any error or success message is not 3 to 7 words.
// Runs before every build: `npm run check:messages`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAUSE, ERR, FAIL, MAX_WORDS, MIN_WORDS, NOTE, OK, V, countWords } from '../src/lib/messages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
let checked = 0;

function check(label, text) {
  checked += 1;
  const words = countWords(text);
  if (words < MIN_WORDS || words > MAX_WORDS) problems.push(`${label}: "${text}" has ${words} words`);
}

// Fixed messages.
for (const [name, value] of Object.entries(ERR)) check(`ERR.${name}`, value);
for (const [name, value] of Object.entries(NOTE)) check(`NOTE.${name}`, value);
for (const [name, value] of Object.entries(OK)) check(`OK.${name}`, typeof value === 'function' ? value('Ada') : value);
OK.welcome('') && check('OK.welcome (no name)', OK.welcome(''));
for (const [name, value] of Object.entries(V)) {
  if (typeof value === 'string') check(`V.${name}`, value);
}

// Field messages built from a label, tried with short and very long labels.
['Email', 'Full Name', 'Current Residential Address', 'Do you have pets?', 'A label that goes on for far too long'].forEach(
  (label) => {
    check(`V.required(${label})`, V.required(label));
    check(`V.select(${label})`, V.select(label));
  }
);
check('V.fileSize', V.fileSize(5));

// Every "what failed" phrase combined with every possible cause.
for (const [whatName, what] of Object.entries(FAIL)) {
  for (const [causeName, cause] of Object.entries(CAUSE)) {
    check(`FAIL.${whatName} + CAUSE.${causeName}`, `${what} ${cause}`);
  }
}

// Literal messages written directly in code: fail('...') in the dummy backend, toast.x('...') anywhere.
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(path.join(root, 'src')).filter((f) => /\.jsx?$/.test(f))) {
  const source = readFileSync(file, 'utf8');
  for (const m of source.matchAll(/\bfail\(\s*(['"`])((?:(?!\1).)*)\1/g)) {
    check(`${path.relative(root, file)} fail()`, m[2]);
  }
  for (const m of source.matchAll(/toast\.(?:success|error|info)\(\s*(['"`])((?:(?!\1).)*)\1/g)) {
    check(`${path.relative(root, file)} toast`, m[2]);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} message(s) are not ${MIN_WORDS} to ${MAX_WORDS} words:\n`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}
console.log(`All ${checked} messages are ${MIN_WORDS} to ${MAX_WORDS} words.`);
