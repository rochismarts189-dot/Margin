import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculate, verifyPhysics } from '../lib/physics.mjs';
import { linear, solveLinear, verifyMathematics } from '../lib/mathematics.mjs';
import { validateInput, validateFeedback } from '../lib/schema.mjs';
import { subjects } from '../lib/subjects.mjs';
import { analyzeWithGemma } from '../lib/model.mjs';
import { createServer } from '../server.mjs';
const examples = JSON.parse(await readFile(new URL('../public/examples.json', import.meta.url)));
const input = validateInput({ ...examples[0], subject: 'physics' });
const feedback = () => ({ status: 'incorrect', summary: 'Revisit the velocity equation.', firstIssue: { step: 4, quote: input.steps[3], misconception: 'Acceleration changes velocity per unit time.' }, hints: ['Check acceleration’s units.', 'Think about multiplying by elapsed time.'], correction: 'v = u + a*t = 10 m/s.', followUp: { question: 'From rest, a = 3 m/s² for 2 s. Find v.', answer: '6 m/s', explanation: 'Use v = u + a*t.' }, uncertainty: 'Assumes constant acceleration as stated.' });

test('safe arithmetic supports powers, precedence, signs, scientific notation and Unicode', () => {
  assert.equal(calculate('0.5*2*3^2'), 9);
  assert.equal(calculate('-2^2'), -4);
  assert.equal(calculate('(-2)^2'), 4);
  assert.equal(calculate('2×(3+4)'), 14);
  assert.equal(calculate('2e-3 + 0.1'), 0.10200000000000001);
});
test('expressions cannot execute code, overflow, divide by zero or grow unbounded', () => {
  for (const s of ['process.exit()', 'constructor()', '1/0', '2^999', 'x;alert(1)', '('.repeat(501)]) assert.throws(() => calculate(s));
});
test('first Physics failure is the wrong equation, not just its later numeric result', () => {
  const report = verifyPhysics(input);
  assert.equal(report.firstFailure.step, 4);
  assert.equal(report.references.find(r => r.quantity === 'v').value, 10);
});
test('correct motion has no flagged checks', () => assert.equal(verifyPhysics(validateInput(examples[1])).firstFailure, null));
test('incomplete work retains unchecked text without inventing a failure', () => {
  const report = verifyPhysics(validateInput(examples[2])); assert.equal(report.firstFailure, null); assert.equal(report.checks.at(-1).status, 'unverified');
});
test('an applied force with unknown friction is not independently treated as net force', () => {
  const report = verifyPhysics(validateInput(examples[3])); assert.equal(report.references.length, 0); assert.equal(report.firstFailure, null);
});
test('energy verifier catches missing square and work verifier catches wrong arithmetic', () => {
  assert.equal(verifyPhysics(validateInput(examples[4])).firstFailure.step, 3);
  assert.equal(verifyPhysics(validateInput(examples[5])).firstFailure.step, 4);
});
test('SI unit mismatches are flagged', () => assert.equal(verifyPhysics({ steps: ['v = 10 m'], givens: {}, scenario: 'general' }).firstFailure.kind, 'units'));
test('contradictory confirmed data is reported', () => assert.equal(verifyPhysics({ steps: ['v = 8 m/s'], givens: { u: 0, a: 2, t: 5, v: 8 }, scenario: 'motion' }).contradictions.length, 1));
test('unknown notation stays unchecked', () => assert.equal(verifyPhysics({ steps: ['v = u + at'], givens: {}, scenario: 'general' }).checks[0].status, 'unverified'));
test('a decimal at line start is not mistaken for a numbered step', () => assert.equal(verifyPhysics({ steps: ['0.5*2*3 = 3'], givens: {}, scenario: 'general' }).checks[0].status, 'pass'));
test('affine solver supports parentheses and implicit multiplication', () => { assert.deepEqual(linear('2(x+3)-x'), [1,6]); assert.deepEqual(solveLinear('2*x+3=11'), { kind: 'unique', value: 4 }); });
test('affine solver distinguishes identities and contradictions', () => { assert.equal(solveLinear('2*x=2*x').kind, 'all'); assert.equal(solveLinear('x+1=x+2').kind, 'none'); });
test('nonlinear algebra is rejected rather than falsely verified', () => { for (const s of ['x*x', 'x^2', '1/x', 'sin(x)']) assert.throws(() => linear(s)); });
test('Maths detects wrong division at its earliest step', () => {
  const e = examples.find(e => e.id === 'maths-incorrect'); const r = verifyMathematics(validateInput(e)); assert.equal(r.firstFailure.step, 3);
});
test('Maths correct, incomplete, and ambiguous examples are not falsely flagged', () => {
  for (const id of ['maths-correct','maths-incomplete','maths-ambiguous']) assert.equal(verifyMathematics(validateInput(examples.find(e => e.id === id))).firstFailure, null);
});
test('numeric Maths can be checked without a reference equation', () => assert.equal(verifyMathematics({ steps: ['3*4 = 10'] }).firstFailure.step, 1));
test('valid feedback keeps exact quoted evidence and strips extra fields', () => { const f = validateFeedback({ ...feedback(), secret: 'drop' }, input); assert.equal(f.firstIssue.quote, input.steps[3]); assert.equal(f.secret, undefined); });
test('hallucinated quotes, invalid step indices, statuses and missing practice are rejected', () => {
  for (const f of [{ ...feedback(), firstIssue: { ...feedback().firstIssue, quote: 'v = a + t' } }, { ...feedback(), firstIssue: { ...feedback().firstIssue, step: 99 } }, { ...feedback(), status: 'probably' }, { ...feedback(), followUp: null }, { ...feedback(), hints: ['only one'] }]) assert.throws(() => validateFeedback(f, input));
});
test('correct solutions must not contain invented first issues', () => assert.throws(() => validateFeedback({ ...feedback(), status: 'correct' }, input)));
test('bad, oversized, unsupported and non-finite inputs are rejected', () => {
  for (const r of [{}, { ...examples[0], subject: 'chemistry' }, { ...examples[0], givens: { m: -1 } }, { ...examples[0], givens: { x: 1 } }, { ...examples[0], givens: { a: Infinity } }, { ...examples[0], attempt: 'x'.repeat(501) }]) assert.throws(() => validateInput(r));
});

function providerStub(outputs) {
  const queue = [...outputs];
  return async (url) => ({ ok: true, json: async () => url.includes(':generateContent') ? { modelVersion: 'gemma-4-26b-a4b-it', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: queue.shift() }] } }] } : { name: 'models/gemma-4-26b-a4b-it', supportedGenerationMethods: ['generateContent'] } });
}
const config = { key: 'test-only-not-a-real-key', model: 'gemma-4-26b-a4b-it' };
test('provider adapter validates genuine API-shaped responses and marks provenance', async () => {
  const r = await analyzeWithGemma(input, subjects.physics.verify(input), config, providerStub([JSON.stringify(feedback())])); assert.equal(r.status, 'incorrect'); assert.equal(r.inference.realInference, true);
});
test('malformed model output is retried once, then safely rejected', async () => {
  await assert.rejects(analyzeWithGemma(input, subjects.physics.verify(input), config, providerStub(['bad JSON', 'bad JSON'])), /malformed JSON/);
});
test('disagreement between model and independent evidence is made visible', async () => {
  const f = { ...feedback(), status: 'correct', firstIssue: null };
  const r = await analyzeWithGemma(input, subjects.physics.verify(input), config, providerStub([JSON.stringify(f)])); assert.equal(r.status, 'ambiguous'); assert.equal(r.conflict, true); assert.equal(r.feedback.status, 'correct');
});
test('provider errors are sanitized and do not leak a key or raw body', async () => {
  await assert.rejects(analyzeWithGemma(input, subjects.physics.verify(input), config, async () => ({ ok: false, status: 403 })), e => !e.message.includes(config.key) && e.code === 'PROVIDER_ERROR');
});
test('non-Gemma and missing-key inference are rejected', async () => {
  await assert.rejects(analyzeWithGemma(input, subjects.physics.verify(input), { key: '', model: config.model }), /not connected/);
  await assert.rejects(analyzeWithGemma(input, subjects.physics.verify(input), { key: 'test', model: 'gemini-test' }), /deliberately disabled/);
});
test('HTTP flow: static page, validated analysis, error response and secret-file denial', async () => {
  const server = createServer({ analyze: async (i, verification) => ({ feedback: validateFeedback(feedback(), i), verification, status: 'incorrect' }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = {};
    assert.equal((await fetch(base, { headers })).status, 200);
    assert.equal((await fetch(base + '/.env', { headers })).status, 404);
    assert.equal((await fetch(base + '/api/analyze', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(examples[0]) })).status, 200);
    assert.equal((await fetch(base + '/api/analyze', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
    assert.equal((await fetch(base + '/api/health', { headers: { ...headers, origin: 'https://evil.example' } })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('programming preserves indentation, blank lines and exact code line numbers', () => {
  const i = validateInput({ subject: 'programming', language: 'Python', question: 'Return the sum of a list of numbers.', attempt: 'def total(xs):\n\n    return xs[0]' });
  assert.deepEqual(i.steps, ['def total(xs):', '', '    return xs[0]']);
  const f = { ...feedback(), firstIssue: { step: 3, quote: '    return xs[0]', misconception: 'Assumes a nonempty list.' } };
  assert.equal(validateFeedback(f, i).firstIssue.step, 3);
});
test('programming never presents static model review as executed or independently verified', () => {
  const i = validateInput(examples.find(e => e.id === 'code-incorrect') ?? { subject: 'programming', question: 'Find the cause of an index error.', attempt: 'def f(x):\n    return x[9]' });
  const r = subjects.programming.verify(i); assert.equal(r.firstFailure, null); assert.ok(r.checks.every(c => c.status === 'unverified')); assert.match(r.limitation, /not executed/);
});
test('oversized code context and unfamiliar subject are rejected safely', () => {
  assert.throws(() => validateInput({ subject: 'programming', question: 'Find the cause of this bug.', attempt: 'print(1)', errorMessage: 'x'.repeat(2001) }));
  assert.throws(() => validateInput({ subject: '__proto__', question: 'Find the cause of this bug.', attempt: 'print(1)' }));
});

const { checkLocalModel, localGeneration } = await import('../lib/ollama.mjs');
const { revisionNote } = await import('../public/revision-note.js');
test('offline adapter uses loopback only and verifies actual Gemma 4 family metadata', async () => {
  const urls = [];
  const stub = async (url, options) => { urls.push(url); assert.equal(options.headers['x-goog-api-key'], undefined); return { ok: true, json: async () => ({ models: [{ name: 'gemma4:e2b', digest: 'test-digest', details: { family: 'gemma4' } }] }) }; };
  const r = await checkLocalModel({ model: 'gemma4:e2b' }, stub); assert.equal(r.offline, true); assert.deepEqual(urls, ['http://127.0.0.1:11434/api/tags']);
});
test('offline adapter rejects cloud tags, Gemma 3, missing weights and wrong family', async () => {
  for (const model of ['gemma4:cloud', 'gemma3:1b']) await assert.rejects(checkLocalModel({ model }), /disabled/);
  await assert.rejects(checkLocalModel({ model: 'gemma4:e2b' }, async () => ({ ok: true, json: async () => ({ models: [] }) })), /Download/);
  await assert.rejects(checkLocalModel({ model: 'gemma4:e2b' }, async () => ({ ok: true, json: async () => ({ models: [{ name: 'gemma4:e2b', details: { family: 'gemma3' } }] }) })), /did not identify/);
});
test('offline generation is non-streaming, schema-constrained and omits thinking output', async () => {
  const stub = async (url, opts) => { const b = JSON.parse(opts.body); assert.equal(url, 'http://127.0.0.1:11434/api/chat'); assert.equal(b.stream, false); assert.equal(b.think, false); assert.equal(b.format.type, 'object'); return { ok: true, json: async () => ({ model: 'gemma4:e2b', done: true, done_reason: 'stop', message: { content: JSON.stringify(feedback()) } }) }; };
  const r = await localGeneration({ model: 'gemma4:e2b' }, 'Test prompt', stub); assert.equal(r.modelVersion, 'gemma4:e2b');
});
test('revision note preserves original work and separates provenance without premature answer reveal', () => {
  const data = { feedback: feedback(), status: 'incorrect', verification: subjects.physics.verify(input), inference: { modelVersion: 'gemma-4-26b-a4b-it', provider: 'Google Gemini API' } };
  const hidden = revisionNote(input, data, 'My practice attempt', false, false);
  assert.match(hidden, /Not revealed yet/); assert.ok(!hidden.includes('v = u + a*t = 10 m/s.'));
  const shown = revisionNote(input, data, 'My practice attempt', true, true);
  assert.ok(shown.includes('v = u + a*t = 10 m/s.')); assert.match(shown, /Independent checks/); assert.match(shown, /My practice attempt/);
});
test('revision note safely fences student code containing Markdown fences and HTML', () => {
  const codeInput = { ...input, attempt: '```\n<script>alert(1)</script>\n```' };
  const data = { feedback: feedback(), status: 'incorrect', verification: subjects.physics.verify(input), inference: { modelVersion: 'Gemma 4', provider: 'test' } };
  assert.ok(revisionNote(codeInput, data).includes('````text\n```\n<script>'));
});
