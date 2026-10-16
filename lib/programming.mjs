// Code is reviewed as text. No student program is executed on the server.
export function verifyProgramming({ steps, language }) {
  return {
    checks: steps.map((quote, index) => ({ step: index + 1, quote, status: 'unverified', kind: 'code review', detail: 'Model-assisted review only. This line has not been parsed, compiled, or executed.' })),
    references: [], contradictions: [], firstFailure: null,
    limitation: `${language} code was not executed, compiled, or tested. Gemma’s diagnosis, suggested fix, and follow-up are model-generated; reproduce the issue and run tests in your own development environment. The first reported line is a hypothesis, not a verified runtime finding.`
  };
}
