# Familiar – MVP Requirements

**Hackathon:** Kiroween 2026  
**Central principle:** "The AI companion that wants you to outgrow it."

---

## Overview

Familiar is a coding-learning companion that helps beginners genuinely understand AI-generated Python code. Rather than explaining code on demand, it guides learners through a predict → verify → challenge loop, and adjusts the level of assistance based on demonstrated evidence of understanding.

---

## User Stories and Acceptance Criteria

---

### Epic 1: Challenge Presentation

#### US-1.1 — View a Python challenge
**As a** learner,  
**I want to** see a short Python code snippet with a plain-language description of what it is supposed to do,  
**so that** I have enough context to reason about the code before running it.

**Acceptance criteria:**
- AC-1.1.1: The challenge displays the full Python source code with syntax highlighting.
- AC-1.1.2: The challenge displays a one-sentence plain-language description of the code's intent.
- AC-1.1.3: The challenge displays the name and number of the current challenge (e.g. "Challenge 2 of 5").
- AC-1.1.4: No output or execution result is shown until the learner has submitted a prediction.
- AC-1.1.5: Challenges are drawn from a predefined, trusted set; no arbitrary user-submitted code is accepted.

---

#### US-1.2 — Navigate between challenges
**As a** learner,  
**I want to** move to the next challenge after completing the current one,  
**so that** I can practice progressively.

**Acceptance criteria:**
- AC-1.2.1: A "Next Challenge" action is available only after the current challenge's predict-and-verify cycle is complete.
- AC-1.2.2: The learner cannot skip directly to a challenge they have not yet reached.
- AC-1.2.3: If the learner is on the last challenge, the "Next Challenge" action is replaced by a "See Report" action.

---

### Epic 2: Predict → Verify Loop

#### US-2.1 — Submit a prediction
**As a** learner,  
**I want to** type what I think the program will print before seeing the actual output,  
**so that** I am forced to reason actively rather than read passively.

**Acceptance criteria:**
- AC-2.1.1: The UI provides a text input for the learner's predicted output.
- AC-2.1.2: The learner must enter a non-empty prediction before the verify action becomes available.
- AC-2.1.3: After submission the prediction is locked; it cannot be edited.
- AC-2.1.4: The submitted prediction is preserved on screen next to the actual output during comparison.
- AC-2.1.5: Only the learner's first submitted prediction for a given exercise is recorded as evidence for assistance-level transitions. Subsequent attempts on the same exercise do not contribute evidence in either direction.

---

#### US-2.2 — Verify a prediction against actual execution
**As a** learner,  
**I want to** see the real program output alongside my prediction, clearly marked as matching or not matching,  
**so that** I get honest feedback on my understanding.

**Acceptance criteria:**
- AC-2.2.1: Clicking "Verify" triggers retrieval of the challenge output on the backend and returns stdout.
- AC-2.2.2: The actual output is displayed verbatim, preserving whitespace and newlines.
- AC-2.2.3: The result is labeled either "Correct" (exact string match, ignoring only a single trailing newline) or "Incorrect".
- AC-2.2.4: Both the learner's prediction and the actual output are visible simultaneously.
- AC-2.2.5: The verify action is not available before a prediction has been submitted (AC-2.1.2).
- AC-2.2.6: If the backend cannot return output (e.g. internal error), an error message is shown and the learner is not penalized.
- AC-2.2.7: Each result is tagged as either "unaided first attempt" (submitted before any hint or walkthrough was viewed for that exercise) or "after assistance" (submitted after a hint or walkthrough was viewed). This tag is stored in session state and used in the progress report and transition logic.

---

#### US-2.3 — Receive contextual assistance based on assistance level
**As a** learner,  
**I want to** receive help that is proportionate to my demonstrated level of understanding,  
**so that** I am supported without being given answers I haven't earned.

**Acceptance criteria:**
- AC-2.3.1: At the **Guided** level, after an incorrect prediction the companion automatically offers a step-by-step walkthrough of the code's execution.
- AC-2.3.2: At the **Hint** level, after an incorrect prediction the companion automatically offers a single targeted hint pointing to the misunderstood concept, not the full answer.
- AC-2.3.3: At the **Independent** level, after an incorrect prediction no assistance is shown automatically. The companion acknowledges the error and encourages the learner to re-read the code.
- AC-2.3.4: At all levels, after a correct prediction the companion offers brief positive reinforcement without restating the answer.
- AC-2.3.5: The current assistance level is visible to the learner at all times.

---

#### US-2.4 — Request temporary on-demand help without changing the default assistance level
**As a** learner at any assistance level,  
**I want to** be able to ask for a hint for the current exercise without triggering a permanent change to how the companion treats me,  
**so that** I can get unstuck without being penalized or having my progress reset.

**Acceptance criteria:**
- AC-2.4.1: A "Show me a hint" action is available at any assistance level, at any point before or after submitting a prediction for the current exercise.
- AC-2.4.2: Activating "Show me a hint" displays a single targeted hint for the current exercise (equivalent to the Hint-level hint). It does not display a full walkthrough.
- AC-2.4.3: Activating "Show me a hint" does **not** change the learner's current default assistance level.
- AC-2.4.4: After "Show me a hint" is activated for an exercise, any subsequent prediction submission for that exercise is tagged "after assistance" (AC-2.2.7) and is excluded from evidence used for upward transitions.
- AC-2.4.5: "Show me a hint" does not affect evidence counters for downward transitions; using it is not treated as a sign of struggle.
- AC-2.4.6: "Show me a hint" is distinct from "Get more help" (US-4.3). The UI must clearly label the two actions differently so the learner understands their respective effects.

---

### Epic 3: Code Mutations and Transfer Challenges

#### US-3.1 — Face a controlled code mutation challenge
**As a** learner,  
**I want to** see a small, deliberate modification to the code I just studied and predict the new output,  
**so that** I can confirm I understood the code rather than just its output.

**Acceptance criteria:**
- AC-3.1.1: After completing the predict-and-verify cycle on the original challenge, the learner is offered a mutation challenge.
- AC-3.1.2: The mutation is a single, clearly highlighted change to the original code (e.g. a changed literal, a swapped operator, a reordered statement).
- AC-3.1.3: The mutation challenge follows the same predict → verify flow as the original (AC-2.1.*, AC-2.2.*).
- AC-3.1.4: Each challenge has at least one predefined mutation; mutations are not generated dynamically for the MVP.
- AC-3.1.5: The diff between original and mutated code is visually highlighted.

---

#### US-3.2 — Face a transfer challenge
**As a** learner,  
**I want to** answer a question about a structurally similar but different code snippet,  
**so that** I can practice applying the concept I learned to a new context.

**Acceptance criteria:**
- AC-3.2.1: After completing the mutation challenge, the learner is offered a transfer challenge.
- AC-3.2.2: The transfer challenge presents a new code snippet that uses the same core concept in a slightly different context.
- AC-3.2.3: The transfer challenge follows the same predict → verify flow (AC-2.1.*, AC-2.2.*).
- AC-3.2.4: Each challenge has at least one predefined transfer snippet for the MVP.

---

### Epic 4: Assistance Level Transitions

#### US-4.1 — Progress toward less-assisted modes
**As a** learner,  
**I want to** earn a less-assisted mode by demonstrating understanding,  
**so that** the reduction in help reflects real evidence rather than just time spent.

**Acceptance criteria:**
- AC-4.1.1: Evidence for upward transitions is drawn exclusively from predictions tagged "unaided first attempt" (AC-2.2.7). Predictions submitted after a hint or walkthrough was viewed, and all subsequent attempts on the same exercise, are excluded.
- AC-4.1.2: Transitioning from **Guided** to **Hint** requires: unaided first-attempt correct predictions on at least 2 of the 3 exercises (original, mutation, transfer) within 1 completed challenge. The transfer challenge must be among the exercises attempted; passing it unaided is not strictly required at this threshold, but it must have been attempted.
- AC-4.1.3: Transitioning from **Hint** to **Independent** requires: unaided first-attempt correct predictions on all 3 exercises (original, mutation, and transfer) across 2 consecutive challenges. Passing the transfer challenge unaided is necessary for this transition; a correct transfer result tagged "after assistance" does not count.
- AC-4.1.4: A transition to a higher independence level is announced to the learner with a brief, plain-language `policy_reason` explaining exactly which evidence triggered it (e.g. "You predicted correctly without hints on all three exercises in Challenges 2 and 3, including the transfer.").
- AC-4.1.5: Every assistance-level change — whether upward or downward — records a `policy_reason` in session state. This field is surfaced in the progress report.

---

#### US-4.2 — Receive more support automatically when consistently struggling
**As a** learner,  
**I want to** have support restored if I am consistently missing exercises,  
**so that** the companion responds to how I am actually doing rather than locking me into a mode I've outgrown my ability to handle.

**Acceptance criteria:**
- AC-4.2.1: If a learner at **Hint** or **Independent** level submits incorrect unaided first-attempt predictions on all 3 exercises of a single challenge, the assistance level is automatically restored one step toward Guided (Independent → Hint, or Hint → Guided).
- AC-4.2.2: The downward transition is announced with a `policy_reason` (e.g. "You missed all three first-attempt predictions in Challenge 3. A bit more guidance is back.").
- AC-4.2.3: An automatic downward transition does not clear the evidence that previously justified the higher level; the learner can regain independence by demonstrating unaided correct predictions on subsequent challenges.

---

#### US-4.3 — Explicitly request a lower default assistance level
**As a** learner,  
**I want to** be able to ask the companion to give me more guidance as a lasting default,  
**so that** I am in control of the level of support I receive and am not forced to remain at a level that feels overwhelming.

**Acceptance criteria:**
- AC-4.3.1: A "Get more help" action is available at any time and explicitly lowers the default assistance level by one step (Independent → Hint, or Hint → Guided). It has no effect if already at Guided.
- AC-4.3.2: Activating "Get more help" records a `policy_reason` of "Learner requested more support."
- AC-4.3.3: "Get more help" changes the default assistance level for all subsequent exercises in the session, unlike "Show me a hint" (AC-2.4.3), which is temporary and per-exercise.
- AC-4.3.4: Using "Get more help" does not reset or penalize the evidence counters used for upward transitions; the learner is not punished for asking for help.
- AC-4.3.5: The UI must clearly distinguish "Get more help" (persistent level change) from "Show me a hint" (temporary, per-exercise). Both actions must remain accessible without the learner being made to feel that using either is a failure.

---

### Epic 5: Pixel Ghost Companion

#### US-5.1 — See a companion whose appearance reflects the assistance level
**As a** learner,  
**I want to** see a pixel art ghost character whose visual state corresponds to my current assistance level,  
**so that** I have an ambient, non-intrusive signal about how I am progressing.

**Acceptance criteria:**
- AC-5.1.1: The ghost has three distinct visual states, one per assistance level (Guided, Hint, Independent).
- AC-5.1.2: The ghost's visual state updates immediately when the assistance level changes.
- AC-5.1.3: The ghost is displayed persistently in the UI (not only when notifications appear).
- AC-5.1.4: The ghost's state change is accompanied by a short animation or transition (CSS transition is acceptable for the MVP).
- AC-5.1.5: The ghost does not obstruct the code or input areas.

---

#### US-5.2 — See companion reactions to prediction outcomes
**As a** learner,  
**I want to** see the ghost react when I submit a prediction and when I see the result,  
**so that** the experience feels alive and encouraging without being distracting.

**Acceptance criteria:**
- AC-5.2.1: The ghost plays a "thinking" animation while the learner is typing a prediction.
- AC-5.2.2: The ghost plays a "correct" animation when a prediction is verified as correct.
- AC-5.2.3: The ghost plays an "incorrect" animation when a prediction is verified as incorrect.
- AC-5.2.4: Animations are short (≤ 2 seconds) and do not block interaction.
- AC-5.2.5: All animations are implemented with CSS or a lightweight sprite approach; no external animation libraries are required for the MVP.

---

### Epic 6: Progress Report

#### US-6.1 — View a learning progress report
**As a** learner,  
**I want to** see a summary of my performance across all completed challenges,  
**so that** I can reflect on what I have learned and where I still struggle.

**Acceptance criteria:**
- AC-6.1.1: The report is accessible after the final challenge is completed.
- AC-6.1.2: The report shows, per challenge: challenge name, and for each exercise (original, mutation, transfer) whether the first attempt was correct and whether it was unaided or made after viewing a hint or walkthrough.
- AC-6.1.3: The report shows the assistance level at the end of the session.
- AC-6.1.4: The report shows the total number of unaided first-attempt correct predictions out of total exercises attempted.
- AC-6.1.5: The report shows each assistance-level change that occurred during the session, together with its recorded `policy_reason`.
- AC-6.1.6: The report does not make claims about learning outcomes validated by external research (e.g. no "you have mastered loops").
- AC-6.1.7: The report is printable / shareable as plain text or a simple page (no PDF generation required for MVP).

---

## Out of Scope for MVP

The following are explicitly deferred to avoid scope creep:

- User accounts, authentication, or persistent cross-session progress
- Dynamic code generation or AI-generated challenges
- Execution of arbitrary user-submitted code
- Multi-language support (Python only)
- Mobile-optimized layout
- Sound effects or music
- Leaderboards or social features
- Scientifically validated claims about learning efficacy
- Full WCAG 2.1 AA accessibility audit (semantic HTML and keyboard navigation are expected as baseline)

---

## Assumptions and Constraints

- **Challenge content:** All Python challenges are predefined and stored as static data. The backend's challenge API accepts only a challenge ID from the client — never raw code. The API validates the ID against the known challenge set before returning output.

- **Execution model — two tiers:**
  1. *Preferred:* If a secure, isolated execution environment is available (e.g. a container with no network access, read-only filesystem, and resource limits enforced by the runtime), the backend may execute challenge code at request time and return live stdout.
  2. *Fallback (MVP default):* If secure execution isolation cannot be guaranteed, the backend must serve precomputed, human-verified expected outputs stored alongside each challenge definition. In this case, "verify" means comparing the learner's prediction against the stored expected output, not against a live subprocess result.
  Standard subprocess configuration and timeouts alone do not constitute a security sandbox and must not be described as one.

- **API exposure:** The challenge output API (whether live or precomputed) may be exposed to the public internet only through validated, rate-limited endpoints that accept a challenge ID, never through an interface that accepts or executes arbitrary code. The underlying execution environment, if any, must not be directly reachable from the public internet.

- **Session state:** Progress, evidence counters, the current assistance level, and all `policy_reason` records are held in browser memory (React state) for the MVP. There is no database.

- **Matching rule:** Prediction correctness is determined by exact string match after stripping a single trailing newline from the actual or expected output. Leading/trailing whitespace within the output is significant.

- **Assistance level initialization:** The assistance level is always initialized to **Guided** at session start.

- **Evidence integrity:** Only unaided first-attempt predictions count as evidence for upward transitions (see AC-2.2.7, AC-4.1.1). The session state must record, per exercise, whether a hint or walkthrough was viewed before the first prediction was submitted, and must prevent re-submissions from overwriting this record.
