import { readFile, writeFile } from 'node:fs/promises';
import { validateInput } from '../lib/schema.mjs';
import { subjects } from '../lib/subjects.mjs';
import { analyzeWithGemma, configuration } from '../lib/model.mjs';
const examples = JSON.parse(await readFile(new URL('../public/examples.json', import.meta.url)));
if (configuration().provider !== 'ollama' && !configuration().key.trim()) { console.error('No API key configured. Save GEMINI_API_KEY in .env, then rerun.'); process.exit(1); }
const report = { timestamp: new Date().toISOString(), model: configuration().model, realInference: true, cases: [] };
const selected = process.argv.slice(2);
for (const example of examples.filter(e => !selected.length || selected.includes(e.id))) {
  const input = validateInput(example), expected = example.id.replace('maths-', '');
  const expectedStatus = example.expectedStatus ?? (['energy', 'work'].includes(expected) ? 'incorrect' : expected);
  const expectedStep = example.expectedStep ?? { incorrect: 4, energy: 3, work: 4, 'maths-incorrect': 3 }[example.id] ?? null;
  try {
    const result = await analyzeWithGemma(input, subjects[input.subject].verify(input));
    const passed = result.status === expectedStatus && (!expectedStep || result.feedback.firstIssue?.step === expectedStep);
    report.cases.push({ id: example.id, expectedStatus, expectedStep, passed, result });
    console.log(`${passed ? 'PASS' : 'FAIL'} ${example.id}: ${result.status}, issue ${result.feedback.firstIssue?.step ?? 'none'}, ${result.inference.milliseconds}ms`);
  } catch (e) { report.cases.push({ id: example.id, passed: false, error: e.message, code: e.code }); console.log(`FAIL ${example.id}: ${e.message}`); }
}
await writeFile(new URL(selected.length ? '../docs/live-evaluation-targeted.json' : '../docs/live-evaluation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.cases.filter(c => c.passed).length}/${report.cases.length} live examples passed.`);
if (!report.cases.length || report.cases.some(c => !c.passed)) process.exitCode = 1;
