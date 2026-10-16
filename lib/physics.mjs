// Deliberately bounded verifier. Student text is never executed with eval/Function.
const close = (a, b) => Math.abs(a - b) <= Math.max(1e-5, Math.max(Math.abs(a), Math.abs(b)) * 0.002);
const UNITS = { u: 'm/s', v: 'm/s', a: 'm/s^2', t: 's', s: 'm', m: 'kg', F: 'N', KE: 'J', W: 'J' };
const normalize = s => s.replaceAll('²', '^2').replaceAll('³', '^3').replace(/[×·]/g, '*').replaceAll('÷', '/').replace(/[−–]/g, '-').replace(/\*\*/g, '^');

export function calculate(source, vars = {}) {
  source = normalize(source).trim();
  if (source.length > 500) throw new Error('Expression too long');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z]+|[()+*/^\-]/g) ?? [];
  if (tokens.length > 128 || tokens.join('') !== source.replace(/\s/g, '')) throw new Error('Unsupported notation');
  let i = 0;
  function atom() {
    const token = tokens[i++];
    if (token === '(') { const n = sum(); if (tokens[i++] !== ')') throw new Error('Missing parenthesis'); return n; }
    if (/^(?:\d|\.)/.test(token ?? '')) return Number(token);
    if (Object.hasOwn(vars, token)) return vars[token];
    throw new Error('Unknown quantity');
  }
  function power() { let n = atom(); if (tokens[i] === '^') { i++; const p = unary(); if (Math.abs(p) > 12) throw new Error('Power too large'); n **= p; } return n; }
  function unary() { if (tokens[i] === '-') { i++; return -unary(); } if (tokens[i] === '+') { i++; return unary(); } return power(); }
  function product() { let n = unary(); while (['*', '/'].includes(tokens[i])) { const op = tokens[i++]; const rhs = unary(); n = op === '*' ? n * rhs : n / rhs; } return n; }
  function sum() { let n = product(); while (['+', '-'].includes(tokens[i])) { const op = tokens[i++]; const rhs = product(); n = op === '+' ? n + rhs : n - rhs; } return n; }
  const n = sum();
  if (i !== tokens.length || !Number.isFinite(n) || Math.abs(n) > 1e100) throw new Error('Invalid expression');
  return n;
}

function stripUnit(s) {
  s = normalize(s).trim();
  const match = s.match(/(?<=\d|\))\s*(m\/s\^2|m\/s|kg|N|J|m|s)\s*$/);
  // A symbol by itself is a quantity, not a unit suffix.
  if (!match || !s.slice(0, match.index).trim()) return { expression: s, unit: null };
  return { expression: s.slice(0, match.index).trim(), unit: match[1] };
}

export function verifyPhysics({ steps, givens = {}, scenario = 'general' }) {
  const values = { ...givens }, references = [];
  const derive = (key, value, rule) => {
    if (!Number.isFinite(value)) return;
    references.push({ quantity: key, value, unit: UNITS[key], rule, source: 'Confirmed question data and selected assumptions' });
    if (!Object.hasOwn(values, key)) values[key] = value;
  };
  const has = (...keys) => keys.every(k => Object.hasOwn(givens, k));
  if (scenario === 'motion' && has('u', 'a', 't')) {
    derive('v', givens.u + givens.a * givens.t, 'v = u + a*t (constant acceleration)');
    derive('s', givens.u * givens.t + 0.5 * givens.a * givens.t ** 2, 's = u*t + 0.5*a*t^2 (constant acceleration)');
  }
  if (scenario === 'force' && has('m', 'a')) derive('F', givens.m * givens.a, 'F_net = m*a (inertial frame, constant mass)');
  if (scenario === 'force' && has('m', 'F') && givens.m > 0) derive('a', givens.F / givens.m, 'a = F_net/m (inertial frame, constant mass)');
  if (scenario === 'energy' && has('m', 'v')) derive('KE', 0.5 * givens.m * givens.v ** 2, 'KE = 0.5*m*v^2 (classical kinetic energy)');
  if (scenario === 'work' && has('F', 's')) derive('W', givens.F * givens.s, 'W = F*s (constant force parallel to displacement)');

  const checks = steps.map((quote, index) => {
    const text = quote.replace(/^\s*(?:step\s*)?\d+[.)/:]\s+/i, '').trim();
    const pieces = text.split('=');
    const base = { step: index + 1, quote };
    if (pieces.length < 2 || pieces.some(p => !p.trim())) return { ...base, status: 'unverified', detail: 'No complete supported equation on this line.' };
    const parts = pieces.map(stripUnit);
    const lhs = parts[0].expression.trim();
    const unitIssue = Object.hasOwn(UNITS, lhs) && parts.some(p => p.unit && p.unit !== UNITS[lhs]);
    if (unitIssue) return { ...base, status: 'fail', kind: 'units', detail: `${lhs} requires ${UNITS[lhs]}; the written unit is incompatible.`, rule: 'SI quantity/unit check' };
    const evaluated = parts.map(p => { try { return calculate(p.expression, values); } catch { return null; } });
    // Adjacent numeric expressions can be checked even when a quantity is unknown.
    const pairs = evaluated.slice(1).map((n, j) => [evaluated[j], n]).filter(([a, b]) => a !== null && b !== null);
    if (!pairs.length) return { ...base, status: 'unverified', detail: 'Needs confirmed values or notation outside the bounded verifier.' };
    const mismatch = pairs.find(([a, b]) => !close(a, b));
    const usesSymbols = parts.some(p => /[A-Za-z]/.test(p.expression.replace(/\d[eE][+-]?\d/g, '')));
    const kind = usesSymbols ? 'physics' : 'arithmetic';
    if (mismatch) return { ...base, status: 'fail', kind, detail: `The equation compares ${Number(mismatch[0].toPrecision(7))} with ${Number(mismatch[1].toPrecision(7))}; they do not agree.`, rule: usesSymbols ? 'Substitution using confirmed data / applicable reference rule' : 'Arithmetic evaluation' };
    return { ...base, status: 'pass', kind, detail: 'Evaluated equalities agree within 0.2% rounding tolerance. This does not verify the whole solution.' };
  });
  const contradictions = references.filter(r => Object.hasOwn(givens, r.quantity) && !close(givens[r.quantity], r.value));
  return { checks, references, contradictions, firstFailure: checks.find(c => c.status === 'fail') ?? null, limitation: 'Only supported explicit equations and confirmed SI inputs are checked. Unchecked lines, assumptions, completeness, and conceptual feedback remain model judgments. No general symbolic proof or natural-language fact verification.' };
}
