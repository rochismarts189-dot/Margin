import { quantities, subjects } from './subjects.mjs';
export class AppError extends Error {
  constructor(message, status = 400, code = 'INVALID_INPUT') { super(message); this.status = status; this.code = code; }
}
export function validateInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AppError('Enter a question and your worked solution.');
  const subject = raw.subject ?? 'physics';
  if (!subjects[subject]?.supported) throw new AppError('Choose Physics, Maths, or Code. Chemistry is not supported.');
  if (typeof raw.question !== 'string' || raw.question.trim().length < 10 || raw.question.length > 4000) throw new AppError('Use a question between 10 and 4,000 characters.');
  if (typeof raw.attempt !== 'string' || raw.attempt.trim().length < 3 || raw.attempt.length > 12000) throw new AppError('Use a worked solution between 3 and 12,000 characters.');
  const steps = subject === 'programming' ? raw.attempt.replace(/\r\n/g, '\n').split('\n') : raw.attempt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (steps.length > (subject === 'programming' ? 100 : 40) || steps.some(s => s.length > 500)) throw new AppError('Use up to 40 reasoning steps or 100 code lines, with at most 500 characters each.');
  const scenario = raw.scenario ?? 'general';
  if (!['general', 'motion', 'force', 'energy', 'work'].includes(scenario)) throw new AppError('Choose a supported Physics scenario.');
  const givens = raw.givens ?? {};
  if (!givens || typeof givens !== 'object' || Array.isArray(givens)) throw new AppError('Question data must contain numeric SI quantities.');
  for (const [k, v] of Object.entries(givens)) {
    if (!Object.hasOwn(quantities, k) || typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e9) throw new AppError('Use finite numeric values for supported SI quantities.');
    if (['m', 't', 'KE'].includes(k) && v < 0) throw new AppError('Mass, elapsed time, and kinetic energy cannot be negative.');
    if (k === 'm' && v === 0) throw new AppError('Use a positive mass.');
  }
  const referenceEquation = raw.referenceEquation ?? '';
  if (typeof referenceEquation !== 'string' || referenceEquation.length > 200) throw new AppError('Use a reference equation of at most 200 characters.');
  const language = raw.language ?? 'Python';
  const errorMessage = raw.errorMessage ?? '';
  if (typeof language !== 'string' || language.length > 60 || typeof errorMessage !== 'string' || errorMessage.length > 2000) throw new AppError('Use a short language name and an error message under 2,000 characters.');
  return { subject, question: raw.question.trim(), attempt: subject === 'programming' ? raw.attempt : raw.attempt.trim(), steps, scenario, givens, referenceEquation: referenceEquation.trim(), language, errorMessage };
}

export const feedbackSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['incorrect', 'correct', 'incomplete', 'ambiguous'] },
    summary: { type: 'string' },
    firstIssue: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, properties: { step: { type: 'integer' }, quote: { type: 'string' }, misconception: { type: 'string' } }, required: ['step', 'quote', 'misconception'] }] },
    hints: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
    correction: { type: 'string' },
    followUp: { type: 'object', additionalProperties: false, properties: { question: { type: 'string' }, answer: { type: 'string' }, explanation: { type: 'string' } }, required: ['question', 'answer', 'explanation'] },
    uncertainty: { type: 'string', minLength: 1, maxLength: 700 }
  }, required: ['status', 'summary', 'firstIssue', 'hints', 'correction', 'followUp', 'uncertainty']
};

export function validateFeedback(raw, input) {
  const fail = () => { throw new AppError('Gemma returned feedback that failed validation. Please retry; no unvalidated feedback was displayed.', 502, 'MODEL_OUTPUT_INVALID'); };
  const isText = (s, max = 2500) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  if (!raw || !['incorrect', 'correct', 'incomplete', 'ambiguous'].includes(raw.status) || !isText(raw.summary, 700) || !isText(raw.correction) || !isText(raw.uncertainty, 700)) fail();
  if (!Array.isArray(raw.hints) || raw.hints.length !== 2 || !raw.hints.every(s => isText(s, 800))) fail();
  if (!raw.followUp || !['question', 'answer', 'explanation'].every(k => isText(raw.followUp[k], 1200))) fail();
  let firstIssue = null;
  if (raw.firstIssue !== null) {
    const f = raw.firstIssue;
    if (!f || !Number.isInteger(f.step) || f.step < 1 || f.step > input.steps.length || f.quote !== input.steps[f.step - 1] || !isText(f.misconception, 1200)) fail();
    firstIssue = { step: f.step, quote: f.quote, misconception: f.misconception };
  }
  if (raw.status === 'incorrect' && !firstIssue) fail();
  if (raw.status === 'correct' && firstIssue) fail();
  // Return only whitelisted fields; never return raw provider payloads.
  return { status: raw.status, summary: raw.summary, firstIssue, hints: raw.hints, correction: raw.correction, followUp: { question: raw.followUp.question, answer: raw.followUp.answer, explanation: raw.followUp.explanation }, uncertainty: raw.uncertainty };
}
