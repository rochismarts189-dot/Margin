# Project decision and published rules

Decision: **Margin**, a first-wrong-step reasoning debugger. Initial scope was Physics; the participant subsequently requested Maths, so the MVP includes arithmetic and linear equations. The participant also requested code debugging. Code mode provides hint-first text review with Python/JavaScript evaluation cases and explicitly unverified assistance for other languages; it never executes student code. Chemistry remains disabled.

These are engineering judgments and estimated build times, not official judging weights or score predictions.

| Criterion | Margin | Physics Q&A tutor | AI lab-report reviewer |
|---|---|---|---|
| Usefulness | Repair the student's own reasoning, then transfer learning | Convenient explanations; may encourage answer dependence | Helpful feedback after writing a longer report |
| Originality | Distinctive workflow; first-error tutoring itself already exists | Common hackathon pattern | Moderate; many writing-review tools exist |
| Meaningful Gemma | Step interpretation, misconception, hints and practice grounded in verification | Central answer generation, less structured | Central interpretation, harder evidence grounding |
| Demo clarity | Six lines → quoted first issue → hint → correction → practice | Prompt → answer; easy but generic | Needs a longer document and subjective assessment |
| Open-source eligibility | Public-repo/license/meaningful-model requirements apply | Same basic requirements | Same basic requirements |
| Feasibility | Small server, bounded checks; API access is critical | Easiest implementation, weak differentiation | Parsing and scientific correctness add risk |
| Estimated completion | 75–120 focused minutes plus sign-in/submission | 30–60 minutes plus publication | 90–150 minutes with higher reliability risk |

Weaknesses: no model training novelty, text-only input, model-dependent conceptual diagnosis, narrow deterministic coverage, and a small evaluation set. Exact-quote validation does not prove the model is right. The app shows evidence and uncertainty, preserves unchecked steps, and flags conflicts. It does not prove arbitrary solutions.

## Published descriptions checked October 16, 2026

Source: [official Rajam event](https://www.mlh.com/events/hacktoberfest-hack-day-rajam-x-nxtwave-of-innovation-in-advanced-technologies).

**Best Use of Gemma 4** describes focused AI tools for learning, creativity, productivity or community, multimodal experiences, and rapid prototyping via the Gemini API. Margin fits the focused-learning-tool direction. Multimodal experiences are an example direction; the description does not require every entry to accept images. Margin does not claim image support.

**Best Open-Source AI Project** requires an original project with open-source/open-weight AI important to its function, a public GitHub repository and an open-source license. Agent-skill and model-harness requirements apply to those entry types. Margin is an application using an open-weight model with original verification, validation and learning workflows.

No numerical scoring weights or detailed rubric appeared in the published event descriptions. The comparison criteria above are our own selection criteria. The organizer can clarify additional rules.

The event advertises 7:30 PM IST closure. The participant's personal deadline is **2:00 PM IST**, with **1:15 PM** target; that takes precedence. Registration/check-in is managed through OrganizerHQ links, and the MLH page exposes a submission route.

Eligibility must be assessed after real inference, public repository/license, registration/check-in, and accepted submission have been verified. Neither eligibility nor a win is guaranteed.
