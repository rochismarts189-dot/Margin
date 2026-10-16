import { verifyPhysics } from './physics.mjs';
import { verifyMathematics } from './mathematics.mjs';
import { verifyProgramming } from './programming.mjs';

// Each future subject implements verify(input) and supplies its own prompt guidance.
export const subjects = {
  physics: {
    name: 'Introductory Physics', supported: true, verify: verifyPhysics,
    guidance: 'Introductory engineering Physics: constant-acceleration motion, net force, work, and kinetic energy. Examine assumptions, units, signs, equations, substitutions, and completeness. Do not assume a force is net, acceleration is constant, or friction is absent unless stated. Quote evidence from actual work. For underspecified questions classify ambiguous and ask for the missing information. Never invent a mistake in correct work.'
  },
  mathematics: { name: 'Introductory Maths', supported: true, verify: verifyMathematics, guidance: 'Introductory Mathematics: arithmetic and linear equations in one variable. Identify the earliest invalid transformation, arithmetic error, or missing justification. Preserve the solution set. A correct intermediate equation is not a completed solution when asked to find x. If a numerical answer is requested but an unknown parameter or condition prevents it, classify ambiguous even if a symbolic expression can be derived. Incomplete applies only when the question supplies enough information but the student has not finished. If notation or the problem is underspecified classify ambiguous. Advanced mathematics is outside this MVP: say so and avoid claiming verification.' },
  chemistry: { name: 'Chemistry', supported: false },
  programming: { name: 'Code · model-assisted', supported: true, verify: verifyProgramming, guidance: 'You are a code-learning debugger. Review the selected language, intended behavior, actual error, and code as text. Do not execute code or claim you compiled, ran or tested it. Identify the earliest causal bug, not just where an exception surfaces. Preserve exact indentation in quotations. Explain the likely misconception and which concept to focus on. Hint 1 is conceptual; hint 2 suggests a debugging observation or small experiment without giving corrected code. Put a minimal fix only in the correction field, after hints. Avoid rewriting the whole program. Use correct only when the provided code and stated behavior appear consistent; acknowledge this is static model review. Use incomplete for TODO/unfinished logic. Use ambiguous for missing expected behavior, missing dependencies or insufficient context. Support common languages as model-assisted review; if unfamiliar or uncertain say so. For a code review, followUp is a small coding exercise targeting the same bug, with an answer held separately.' }
};

export const quantities = {
  u: { label: 'Initial velocity', unit: 'm/s' },
  v: { label: 'Final velocity / speed', unit: 'm/s' },
  a: { label: 'Acceleration', unit: 'm/s²' },
  t: { label: 'Time', unit: 's' },
  s: { label: 'Displacement', unit: 'm' },
  m: { label: 'Mass', unit: 'kg' },
  F: { label: 'Net force / applied force for work', unit: 'N' },
  KE: { label: 'Kinetic energy', unit: 'J' },
  W: { label: 'Work', unit: 'J' }
};
