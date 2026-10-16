# Margin

**Find where your reasoning went off track.** A hint-first reasoning debugger for adult (18+) students and developers, using real **Gemma 4** inference and a separate, bounded calculation verifier.

Students paste a question and their own steps. Margin identifies the earliest problematic step, quotes the actual work, explains the likely misconception, offers two progressive hints, reveals a correction, and asks a targeted follow-up. It also recognizes correct, incomplete, and ambiguous work rather than forcing every attempt into an error diagnosis.

## Run locally

Requires **Node.js 22 or newer**, internet access, and a Google AI Studio API key with access to Gemma 4. There are **no third-party runtime packages** and no dependency installation or build step.

```sh
git clone https://github.com/rochismarts189-dot/Margin.git
cd Margin
cp .env.example .env
```

Edit `.env` locally and set `GEMINI_API_KEY`. Do not put it in client JavaScript, screenshots, commits, or chat.

```sh
node server.mjs
```

Open **http://127.0.0.1:3000**. Click **Check Gemma connection**. Choose an example, then **Find the first wrong turn**. The server reads `.env` on every request, so saving a key does not require a restart. Environment variables take precedence over `.env`.

If your npm installation works, `npm start` and `npm test` are equivalent conveniences. Direct Node commands work without npm. `node server.js` remains compatible with the original prototype’s entry point.

## Optional offline mode

The app source and browser assets run locally. The default Google provider still needs internet. For fully offline inference, install [Ollama](https://ollama.com), download an official [Gemma 4 model](https://ollama.com/library/gemma4) once, and keep Ollama running:

```sh
ollama pull gemma4:e2b-it-q4_K_M
```

Set these values in `.env`:

```ini
MODEL_PROVIDER=ollama
OLLAMA_MODEL=gemma4:e2b-it-q4_K_M
```

Then run `node server.mjs`. No Gemini key is required in local mode. All inference requests go exclusively to `127.0.0.1:11434`, never a remote model or automatic cloud fallback. The UI labels local inference and changes its data notice. A missing model returns a download instruction rather than fabricated results. Supported local tags are `gemma4:e2b-it-q4_K_M`, `gemma4:e4b`, `gemma4:12b`, `gemma4:26b` and `gemma4:31b`; cloud tags and Gemma 3 are deliberately rejected. Model family metadata is checked.

The E2B download is roughly 4.6 GB (size may change) and requires additional RAM for runtime/context. Latency and accuracy differ from the hosted 26B model. Adapter tests are not proof of local model performance: see the verification report for whether local Gemma inference was actually tested on this machine. The API-specific age/data terms apply to hosted mode; downloaded weights have their separate Apache 2.0 license.

## Supported scope

| Subject | Gemma feedback | Independent checks |
|---|---|---|
| Introductory Physics | Mechanics, motion, force, work, kinetic energy; signs, assumptions and completeness | Explicit numeric equalities; supported SI suffixes; constant-acceleration velocity/displacement; net force; classical kinetic energy; work by a constant parallel force |
| Introductory Maths | Arithmetic and linear equations in one variable | Numeric equalities and solution-set preservation for affine equations in `x`, using a user-confirmed original equation |
| Code / Programming | Hint-first model-assisted code review; tested examples for Python and JavaScript; language selector also permits other common languages | No execution, compilation or runtime verification. Other languages are unverified |
| Chemistry | Disabled | Not implemented |

For Physics, expand **Independent checks**, confirm the question’s known values in SI units, and select the applicable assumptions. Do not enter your calculated answer as a given. Automatic natural-language extraction is deliberately avoided so an AI extraction error cannot masquerade as an independently established fact.

For Maths, confirm the original linear equation in the same panel. Numeric arithmetic needs no reference equation. Use `*` for multiplication and `^` for powers. The linear parser additionally supports `2x` and `2(x+3)`; nonlinear expressions stay unchecked.

A passed equality is **not proof that the entire reasoning is valid**. The Physics comparison permits 0.2% rounding tolerance; the Maths comparison uses a 1e-9 relative/absolute floating-point tolerance. Unparsed notation stays **unchecked**. The model judges conceptual validity and completeness. Contradictions between its diagnosis and independent checks are shown as **needs clarification**, with both sources preserved.

## Code mode

Choose **Code**, select a language, describe what the program should do, and optionally paste an error message or observed behavior. Paste the code with indentation intact. Gemma identifies the earliest likely cause, explains the concept to focus on, then offers two hints before a minimal fix is revealed. Python and JavaScript have live demo cases; other languages are explicitly unverified. No code is sent to a compiler or executed. Keep credentials, proprietary code and personal data out of API prompts.

## Meaningful Gemma integration

Default hosted model: **`gemma-4-26b-a4b-it`** through Google’s Gemini API REST `generateContent` endpoint. `gemma-4-31b-it` is the only alternative allowed by the server. Margin does not substitute Gemini, a different model, a canned response, or an offline mock when inference fails.

The server first checks the configured model’s metadata and generation support for the actual API key. Gemma receives the student’s steps, the selected subject’s guidance, and independent verification evidence. It produces the misconception diagnosis, progressive hints, correction, uncertainty and follow-up question. These language and interpretation tasks are central to the product, rather than decorative AI copy.

The output is validated for allowed status, field types and lengths, required practice fields, step bounds, and **exact equality between a quoted step and the student’s text**. Malformed output gets one new inference attempt; persistent invalid output is rejected. This validation checks structure and grounding, **not the factual truth of every model sentence**. Inference metadata records the requested/returned model and latency.

## Architecture

```text
Browser: subject → question + numbered lines → hints → reveal → practice → Markdown
   ↓ POST /api/analyze
Node HTTP server: size limits, same-origin/local-host controls, bounded concurrency
   ↓
Subject registry → Physics or Maths verifier → independent evidence
   ↓
Google Gemini API → Gemma 4 → validated feedback + conflict detection
   ↓
Browser renders plain text; independently checked evidence has its own panel
```

- `lib/subjects.mjs`: subject registry and extension interface (`guidance`, `verify`).
- `lib/physics.mjs`: safe arithmetic parser and bounded Physics rules.
- `lib/mathematics.mjs`: affine-expression parser and linear solution sets.
- `lib/programming.mjs`: explicit unverified provenance for text-only code review; never executes student code.
- `lib/model.mjs`: server-only configuration, verified Gemma access, inference, error handling.
- `lib/schema.mjs`: input and output validation.
- `public/`: responsive, accessible buildless interface and example **inputs**.
- `tests/`: unit, provider-adapter, and HTTP tests. Provider mocks are test-only.
- `scripts/evaluate.mjs`: actual live Gemma evaluation; never uses fixtures as responses.

To add a subject, implement its verifier, guidance and test examples; mark it supported only after testing. No generic chatbot session or history is required.

## Tests and live evaluation

```sh
node --test
node scripts/evaluate.mjs
```

The automated suite tests safe parsing, wrong and correct steps, incomplete and ambiguous work, units, conflicting data, exact quotations, malformed responses, API errors, and the HTTP route. These are not a substitute for live model testing.

The live evaluation uses the saved key and makes **one real generation per example**, with at most one additional call when a response fails validation. It reports expected versus observed status and first issue. It exits unsuccessfully on mismatches, and writes a report containing public example inputs and outputs, never the key. See `docs/verification.md` for actual results and remaining verification limits.

## Data and errors

Credentials stay on the server in ignored `.env`; only `.env.example` is tracked. The browser cannot request arbitrary files, `.env`, source code or model URLs. Model and student strings render with `textContent`, not HTML. Student questions/solutions are held in request/browser memory, with no database, localStorage, prompt logging or analytics. The Markdown export is generated in the browser and explicitly labels model-generated and independently checked material.

Google receives the prompt and work. Under the unpaid API terms, input/output can be used to improve Google products and can be reviewed by humans. Use public or invented learning examples; do not submit confidential or personal material. Google’s paid-service data terms differ. Margin targets adult college learners: the current Gemini API terms require developers and the audience to be **18+**, with regional restrictions. Review the linked terms before use.

Missing keys, unavailable models, quota/access failures, timeouts, incomplete responses, bad JSON and invalid inputs return actionable errors. They never return fabricated learning feedback. The UI preserves the input for retry.

This is a **local hackathon prototype**, bound to loopback by default. Before exposing it as a public service, add authentication, persistent rate limits, budget enforcement and provider-appropriate audience controls. Do not expose a shared paid API key through an unrestricted demo endpoint.

## Licenses and model terms

- **Original application code: MIT**, in [LICENSE](LICENSE).
- **Gemma 4 model: Apache 2.0**, separately documented in Google’s [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4) and [model license](https://huggingface.co/google/gemma-4-26B-A4B-it/blob/main/LICENSE). No model weights are bundled here.
- Hosted access is separately governed by [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms), [Google APIs Terms](https://developers.google.com/terms), and the linked prohibited-use policy. The app’s MIT license does not replace those terms.
- Provider integration: [official Gemma on Gemini API guide](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

## Hackathon

Built for **Hacktoberfest Hack Day Rajam × NIAT-GMRIT, October 16, 2026**. The [official event page](https://www.mlh.com/events/hacktoberfest-hack-day-rajam-x-nxtwave-of-innovation-in-advanced-technologies) lists Best Use of Gemma 4 and Best Open-Source AI Project. The latter requires an original project, meaningful open-source/open-weight AI, a public GitHub repository and an open-source license. See [project decision and rule review](docs/project-decision.md) and [submission copy](docs/submission.md).

Those are checked requirements, not a guarantee of eligibility or a win. Publication, real inference evidence, registration/check-in and a successful event submission must be verified separately.
