import { calculate } from './physics.mjs';

// Affine parser: each expression is a*x+b. Reject nonlinear operations.
export function linear(source) {
  const s = source.replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/(\d|\))\s*(?=x|\()/g, '$1*').trim();
  const tokens = s.match(/(?:\d+(?:\.\d*)?|\.\d+)|x|[()+*/\-]/g) ?? [];
  if (tokens.length > 128 || tokens.join('') !== s.replace(/\s/g, '')) throw new Error('Unsupported linear notation');
  let i = 0;
  function atom() {
    const t = tokens[i++];
    if (t === '(') { const v = sum(); if (tokens[i++] !== ')') throw new Error('Missing parenthesis'); return v; }
    if (t === 'x') return [1, 0];
    if (/^(?:\d|\.)/.test(t ?? '')) return [0, Number(t)];
    throw new Error('Unsupported symbol');
  }
  function unary() { if (tokens[i] === '-') { i++; return unary().map(n => -n); } if (tokens[i] === '+') { i++; return unary(); } return atom(); }
  function product() {
    let a = unary();
    while (['*', '/'].includes(tokens[i])) {
      const op = tokens[i++], b = unary();
      if (op === '/') { if (b[0] !== 0 || b[1] === 0) throw new Error('Nonconstant divisor'); a = a.map(v => v / b[1]); }
      else { if (a[0] !== 0 && b[0] !== 0) throw new Error('Nonlinear product'); a = [a[0] * b[1] + a[1] * b[0], a[1] * b[1]]; }
    }
    return a;
  }
  function sum() { let a = product(); while (['+', '-'].includes(tokens[i])) { const op = tokens[i++], b = product(); a = a.map((v, j) => v + (op === '+' ? b[j] : -b[j])); } return a; }
  const result = sum();
  if (i !== tokens.length || result.some(v => !Number.isFinite(v))) throw new Error('Invalid expression');
  return result;
}
export function solveLinear(equation) {
  const sides = equation.split('=');
  if (sides.length !== 2) throw new Error('Use one equality');
  const l = linear(sides[0]), r = linear(sides[1]);
  const a = l[0] - r[0], b = r[1] - l[1];
  if (a === 0) return { kind: b === 0 ? 'all' : 'none' };
  return { kind: 'unique', value: b / a };
}
export function verifyMathematics({ steps, referenceEquation = '' }) {
  let reference = null;
  try { if (referenceEquation) reference = solveLinear(referenceEquation); } catch { /* Unsupported reference stays unverified. */ }
  const checks = steps.map((quote, index) => {
    const base = { step: index + 1, quote };
    const equation = quote.replace(/^\s*(?:step\s*)?\d+[.)/:]\s+/i, '').trim();
    const sides = equation.split('=');
    if (sides.length < 2) return { ...base, status: 'unverified', detail: 'No supported equality on this line.' };
    if (/x/.test(equation) && reference && sides.length === 2) {
      try {
        const result = solveLinear(equation);
        const same = result.kind === reference.kind && (result.kind !== 'unique' || Math.abs(result.value - reference.value) <= Math.max(1e-9, Math.abs(reference.value) * 1e-9));
        return { ...base, status: same ? 'pass' : 'fail', kind: 'algebra', rule: 'Affine reduction with floating-point tolerance 1e-9', detail: same ? 'This equation preserves the solution set of the confirmed reference equation.' : 'This equation changes the solution set of the confirmed reference equation.' };
      } catch { return { ...base, status: 'unverified', detail: 'Outside the linear-in-x verifier. Gemma feedback is not independently verified.' }; }
    }
    try {
      const values = sides.map(s => calculate(s));
      const same = values.every(n => Math.abs(n - values[0]) <= Math.max(1e-9, Math.abs(values[0]) * 1e-9));
      return { ...base, status: same ? 'pass' : 'fail', kind: 'arithmetic', detail: same ? 'Numeric equalities agree.' : `The evaluated sides (${values.join(', ')}) do not agree.` };
    } catch { return { ...base, status: 'unverified', detail: referenceEquation && !reference ? 'Unsupported reference; use a linear equation in x.' : 'Needs a confirmed linear reference equation in x, or explicit numeric arithmetic.' }; }
  });
  return { checks, references: reference ? [{ quantity: 'Solution set', value: reference.kind === 'unique' ? `x = ${reference.value}` : reference.kind === 'all' ? 'All real x' : 'No solution', unit: '', rule: referenceEquation, source: 'User-confirmed reference; independent affine solver' }] : [], contradictions: [], firstFailure: checks.find(c => c.status === 'fail') ?? null, limitation: 'Maths checks cover numeric arithmetic and linear equations in x with a confirmed reference. Other algebra, geometry, calculus, and proofs are unverified model judgments. Arithmetic uses floating point, not exact rational arithmetic.' };
}
