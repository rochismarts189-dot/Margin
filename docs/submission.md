# Submission copy

**Title:** Margin — Find where your reasoning went off track

**One line:** A Physics, Maths and Code reasoning debugger that finds your first wrong turn, then teaches through progressive hints and targeted practice.

**Description:** Students often see a wrong final answer without knowing which idea failed first. Margin reviews their actual worked solution, using Gemma 4 to identify the earliest problematic step, quote the exact line, and explain the likely misconception. Students get two progressive hints before revealing a correction, then try a new question targeting the same concept. A Markdown revision note preserves the learning.

The MVP supports introductory engineering Physics and Maths (arithmetic and linear equations). Independent parsers check supported arithmetic, SI quantities, Physics formulas and linear equation solution sets. These checks are visibly separate from Gemma interpretation; unsupported notation stays unchecked and conflicting evidence is flagged. Code mode reviews expected behavior, errors and source lines, guiding the learner through hints before revealing a minimal fix. Python and JavaScript have evaluation cases; other languages are model-assisted and unverified. Student code is never executed. Chemistry remains a future extension.

**Technology:** Gemma 4 `gemma-4-26b-a4b-it` via the Gemini API; Node built-in HTTP/fetch/test; vanilla HTML/CSS/JavaScript; MIT application code. Gemma's model license and hosted API terms are documented separately. No model weights are bundled.

**Challenges:** Best Use of Gemma 4; Best Open-Source AI Project.

**Repository:** https://github.com/rochismarts189-dot/Margin (published; MIT application code).

**Demo:** Local http://127.0.0.1:3000; accessible only on the demo laptop. Follow the README to reproduce.

**Validation:** 35 automated checks passed. All 15 hosted smoke-test examples passed across a full run and a targeted retry; the full run had one provider service error. See the verification report for details. Offline inference verification is in progress.

## 90-second demo

1. Physics → Wrong turn → Analyze.
2. Show the exact first erroneous equation, rather than just the wrong final answer.
3. Reveal hint 1, hint 2, then the corrected step.
4. Expand independent checks; explain deterministic evidence versus AI interpretation.
5. Show targeted practice and export the Markdown note.
6. If time permits, show Correct solution and Maths → Wrong division.

## Official submission

Open [the event page](https://www.mlh.com/events/hacktoberfest-hack-day-rajam-x-nxtwave-of-innovation-in-advanced-technologies). Sign in, confirm registration/check-in through OrganizerHQ, then **Submit Project**. Its current public route is [the submission form](https://www.mlh.com/events/hacktoberfest-hack-day-rajam-x-nxtwave-of-innovation-in-advanced-technologies/submissions/new). Select both challenges if offered, provide the actual public repository URL and verify the final confirmation. Ask the venue organizer about missing registration/check-in data.

Finish before the participant's **2:00 PM IST** deadline regardless of the event's later advertised closing time.
