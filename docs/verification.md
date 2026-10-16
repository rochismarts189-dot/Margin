# Verification status

- Automated checks: **37/37 passed**. Covers Physics, Maths, exact code quotes/indentation, model validation and errors, local adapter isolation, HTTP routes and revision-note provenance.
- Hosted Gemma 4: **14/15 cases passed in the full run** (`live-evaluation.json`). The unfinished Physics case hit a provider service error, then passed on targeted retry (`live-evaluation-targeted.json`). All 15 examples have passed across these real runs; this is a small smoke test, not a broad accuracy benchmark.
- Early runs exposed ambiguity versus incompleteness classification problems. The taxonomy prompt and one ambiguous fixture were clarified; the final run correctly classifies missing parameters/dependencies as ambiguous. An older run is retained as `live-evaluation-initial.json` for transparency.
- Browser verified in Safari: Code mode, real Python inference, exact first causal line, first hint, second hint, correction reveal, targeted follow-up and answer. Markdown export downloaded and inspected: original code, hints, correction and source labels are present. Browser download permission was granted by the participant.
- Public GitHub repository: verified through unauthenticated GitHub metadata, `private: false`, at https://github.com/rochismarts189-dot/Margin. MIT license included; `.env` is ignored and not tracked; staged secret-pattern scan passed.
- Local offline adapter: tests pass, but **actual Gemma 4 download and inference are still in progress**. The existing Gemma 3 model was not used as a substitute. No offline performance claim yet.
- Official event submission: pending signed-in submission confirmation.

Provider mocks are confined to automated tests. The product and live evaluation make real inference requests and do not use canned feedback. API errors are surfaced rather than fabricated.

## Multimodal live check

A synthetic PNG containing a Physics question and intentionally wrong worked steps was sent to the real hosted Gemma 4 model. The model correctly transcribed the question and preserved the erroneous `v = u + a/t` and `v = 0.4 m/s` lines, without silently fixing them. See `live-image-result.json`. A blank model uncertainty field is converted to an explicit application reminder to review every line. This is one printed-text image smoke test; handwriting and diagram reliability are not established.
