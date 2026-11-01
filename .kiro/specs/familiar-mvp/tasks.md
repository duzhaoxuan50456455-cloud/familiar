# Familiar – MVP Tasks

**Source of truth:** `requirements.md`, `design.md`  
**Implementation language:** Python (backend), TypeScript + React + Vite (frontend)  
**Testing:** pytest (backend), Vitest (frontend)

Tasks are ordered by technical dependency. Each task is small enough to review, test, and merge independently. Do not begin a task until the tasks it depends on are complete and passing.

---

## Milestone 1 — Backend Foundation

### Task 1.1 — Project scaffolding

**Files to create:**
- `backend/requirements.txt`
- `backend/main.py`
- `backend/__init__.py`
- `backend/routers/__init__.py`
- `backend/tests/__init__.py`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx` (stub: renders "Familiar")

**Expected behavior:**
- `cd backend && uvicorn main:app --reload` starts a FastAPI server returning `{"status": "ok"}` from `GET /health`.
- `cd frontend && npm run dev` starts the Vite dev server and renders "Familiar" in the browser.
- `cd backend && pytest` runs without error (zero tests, zero failures).

**Acceptance criteria:**
- Both processes start without errors.
- `GET /health` returns `200 {"status": "ok"}`.
- Frontend renders without console errors.

**References:** design §11

---

### Task 1.2 — Challenge JSON files and index

**Files to create:**
- `backend/challenges/index.json`
- `backend/challenges/loops_01.json`
- `backend/challenges/loops_02.json`
- `backend/challenges/loops_03.json`

**Expected behavior:**
- Three complete challenge definitions for the concept "for-loop with range".
- Each challenge has `original`, `mutation`, and `transfer` exercises.
- All `expected_output` values are human-verified and stored without a trailing newline.
- All `title`, `description`, and `diff_description` values are answer-neutral (do not reveal output values).
- `index.json` contains `["loops_01", "loops_02", "loops_03"]`.

**Acceptance criteria:**
- Each JSON file is valid and parses without error.
- `expected_output` for every exercise has no trailing `\n` (manually verify).
- Descriptions do not mention specific output values.

**References:** design §3, requirements AC-1.1.2, AC-1.1.5

---

### Task 1.3 — Challenge registry

**Files to create:**
- `backend/registry.py`

**Expected behavior:**
- `load_registry(challenges_dir, index_file) -> dict` reads `index.json`, loads each challenge JSON in order, validates required fields, and returns a dict keyed by challenge ID.
- Required fields: `id`, `concept`, `title`, `description`; and for each exercise type: `code`, `expected_output`, `hint`, `walkthrough`. Mutation additionally requires `diff_line` and `diff_description`.
- Raises `ValueError` with a descriptive message if any required field is missing or if a challenge ID in `index.json` has no corresponding file.
- The registry is loaded once at application startup and stored as a module-level singleton.

**Acceptance criteria (pytest — `tests/test_registry.py`):**
- `test_loads_all_challenges`: registry contains exactly 3 entries with IDs matching `index.json`.
- `test_required_fields_present`: every challenge and exercise has all required fields.
- `test_no_trailing_newline_in_expected_output`: `expected_output` for every exercise does not end with `\n`.
- `test_missing_challenge_file_raises`: `load_registry` raises `ValueError` if a file listed in `index.json` is missing.
- `test_missing_required_field_raises`: `load_registry` raises `ValueError` if a required field is absent.

**References:** design §3.2, §5.1

---

### Task 1.4 — Output resolver

**Files to create:**
- `backend/output_resolver.py`

**Expected behavior:**
- Defines `OutputResolver` as a `typing.Protocol` with `resolve(challenge_id, exercise_type) -> str`.
- `PrecomputedResolver` implements the protocol: returns `registry[challenge_id]["exercises"][exercise_type]["expected_output"]`.
- Raises `KeyError` if the challenge ID or exercise type is not found (caught and converted to HTTP errors by the router).

**Acceptance criteria:**
- `PrecomputedResolver.resolve("loops_01", "original")` returns the exact `expected_output` string from `loops_01.json`.
- `PrecomputedResolver.resolve("loops_01", "nonexistent")` raises `KeyError`.

**References:** design §5.1

---

### Task 1.5 — FastAPI challenge endpoints

**Files to create/modify:**
- `backend/routers/challenges.py`
- `backend/main.py` (register router, configure CORS, inject resolver)

**Expected behavior:**

`GET /challenges`:
- Returns the ordered list of challenges.
- Each entry includes `id`, `title`, `description`, `concept`, and per-exercise `code`. Mutation exercise also includes `diff_line` and `diff_description`.
- Does **not** include `expected_output`, `hint`, or `walkthrough`.

`GET /challenges/{challenge_id}/exercises/{exercise_type}/output`:
- `challenge_id` validated against registry; returns `404` if not found.
- `exercise_type` must be `original`, `mutation`, or `transfer`; FastAPI path enum returns `422` otherwise.
- Returns `challenge_id`, `exercise_type`, `expected_output`, `hint`, `walkthrough`, and `output_source: "precomputed"`.

CORS: allow `http://localhost:5173` in development.

**Acceptance criteria (pytest — `tests/test_challenges_api.py`):**
- `test_get_challenges_status`: returns `200`.
- `test_get_challenges_order`: challenges in response match `index.json` order.
- `test_get_challenges_excludes_sensitive_fields`: `expected_output`, `hint`, `walkthrough` absent from list response.
- `test_get_output_valid`: for each of the 3 challenges × 3 exercise types (9 cases), returns `200` with correct `expected_output` and `output_source: "precomputed"`.
- `test_get_output_unknown_id`: returns `404`.
- `test_get_output_invalid_type`: returns `422`.
- `test_no_post_accepted`: `POST /challenges` returns `405`.

**References:** design §4, requirements AC-1.1.5, AC-2.2.1, AC-2.2.6

---

## Milestone 2 — Minimal Frontend Integration

### Task 2.1 — Shared TypeScript types

**Files to create:**
- `frontend/src/types.ts`

**Expected behavior:**
- Exports all shared TypeScript types from design §6.1: `ExerciseType`, `AssistanceLevel`, `ExerciseRecord`, `ChallengeRecord`, `PolicyEvent`, `SessionState`.
- Exports API response types: `ChallengeListResponse`, `ExerciseOutputResponse`.
- No runtime code; types only.

**Acceptance criteria:**
- `npm run build` (or `tsc --noEmit`) reports no type errors on this file.

**References:** design §6.1

---

### Task 2.2 — API client

**Files to create:**
- `frontend/src/api/client.ts`

**Expected behavior:**
- `fetchChallenges(): Promise<ChallengeListResponse>` — calls `GET /challenges`.
- `fetchExerciseOutput(challengeId, exerciseType): Promise<ExerciseOutputResponse>` — calls `GET /challenges/{id}/exercises/{type}/output`.
- On non-2xx response, throws an `Error` with the response status and `detail` message.
- Base URL defaults to `http://localhost:8000` in development (configurable via `VITE_API_BASE_URL`).

**Acceptance criteria:**
- Both functions return correctly typed responses when the backend is running.
- Both functions throw on 404/422/500 with a message including the HTTP status code.
- Manual test: open browser console with backend running; `fetchChallenges()` returns 3 challenges.

**References:** design §4

---

### Task 2.3 — Session context and initial state

**Files to create:**
- `frontend/src/context/SessionContext.tsx`

**Expected behavior:**
- `SessionProvider` wraps the app and provides `state: SessionState` and `dispatch` via context.
- Initial state: `assistanceLevel: "guided"`, `currentChallengeIndex: 0`, `policyHistory: []`, `sessionComplete: false`, `challenges: []` (populated after fetch).
- Exposes a `useSession()` hook.
- The reducer is defined here but does not yet implement evidence-tracking actions (those come in Milestone 3). For now the reducer handles `LOAD_CHALLENGES` (populates `challenges` from API response) and is otherwise a stub.

**Acceptance criteria:**
- `App.tsx` can call `useSession()` and read `state.challenges` after mounting.
- TypeScript reports no errors.

**References:** design §6

---

### Task 2.4 — Challenge list load and display

**Files to create/modify:**
- `frontend/src/App.tsx`
- `frontend/src/components/ChallengeView.tsx`

**Expected behavior:**
- On mount, `App.tsx` calls `fetchChallenges()` and dispatches `LOAD_CHALLENGES`.
- `ChallengeView` receives the current challenge (index 0 initially) and displays:
  - Challenge number and title (e.g. "Challenge 1 of 3 — Counting with range()").
  - Plain-language description.
  - Code block for the original exercise (syntax highlighted; use a lightweight library such as `highlight.js` or `prism-react-renderer`, or a `<pre><code>` block with a CSS theme for MVP).
- No output, hint, or answer is displayed.

**Acceptance criteria:**
- Browser shows the title, description, and code for `loops_01` original exercise on load.
- No `expected_output` or hint text is visible in the DOM.

**References:** requirements AC-1.1.1–1.1.4

---

### Task 2.5 — Prediction input, lock, and verification request

**Files to create:**
- `frontend/src/components/PredictionInput.tsx`

**Expected behavior:**
- Renders a `<textarea>` for the learner's prediction.
- A "Verify" button is disabled when the textarea is empty.
- While a verification request is in-flight, the "Verify" button is also disabled (and visually indicates loading) to prevent duplicate requests. The textarea remains editable during this window so the learner can refine their draft if they wish — but the in-flight request must complete or fail before a new one can start.
- On "Verify" click, the component calls `fetchExerciseOutput` and waits for the response before committing any state change.
- On a successful response: the prediction text is locked (textarea becomes `readOnly`) and `SUBMIT_PREDICTION` is dispatched with both the prediction text and the correctness result computed from that response. Locking and dispatching happen together as part of the same state update — they are never split across separate effects.
- On a network or backend error: the textarea remains editable, no `SUBMIT_PREDICTION` is dispatched, no attempt is recorded, and an inline error message is shown with a "Try again" affordance. The learner is not penalized.
- Subsequent clicks of "Verify" after a locked prediction are ignored (button absent or disabled).

**Acceptance criteria:**
- "Verify" button disabled when textarea is empty.
- "Verify" button disabled while a request is in-flight; second click during in-flight has no effect.
- On success: textarea is `readOnly`; `SUBMIT_PREDICTION` dispatched exactly once; `state.challenges[0].exercises.original.firstPrediction` holds the submitted text.
- On simulated network error: textarea is still editable; `firstPrediction` remains `null`; error message visible; "Try again" affordance present.
- A second successful "Verify" after a locked prediction does not dispatch `SUBMIT_PREDICTION` again (`attemptCount` stays at 1 after the first success).

**References:** requirements AC-2.1.1–2.1.4, AC-2.2.6, design §6.2 (invariant 1)

---

### Task 2.6 — Result display

**Files to create:**
- `frontend/src/components/ResultPanel.tsx`

**Expected behavior:**
- `ResultPanel` receives the `ExerciseOutputResponse` and the locked prediction string as props (both available once `SUBMIT_PREDICTION` has been dispatched).
- Displays the returned `expected_output` verbatim (preserving whitespace and newlines in a `<pre>` element).
- Labels the output "Expected output" when `output_source === "precomputed"`.
- Derives the correct/incorrect label using `normalize()` (remove at most one trailing newline) applied to both the prediction and `expected_output`. This comparison is for display only — the authoritative `firstPredictionCorrect` value was already committed to state in Task 2.5.
- Shows both the prediction and the expected output side-by-side or stacked.
- Labels the result **"Correct"** or **"Incorrect"** prominently.

**Acceptance criteria:**
- Correct prediction → "Correct" label shown.
- Incorrect prediction → "Incorrect" label shown.
- Output preserves internal whitespace (multi-line output is not collapsed).
- Label reads "Expected output", not "Actual output".
- `ResultPanel` does not dispatch any state actions (display only).

**References:** requirements AC-2.2.2–2.2.4, design §5.2–5.3

---

## Milestone 3 — Evidence Tracking

### Task 3.1 — Session reducer: evidence invariants

**Files to modify:**
- `frontend/src/context/SessionContext.tsx`

**Expected behavior:**

Add the following reducer actions (building on the stub from Task 2.3):

- `SUBMIT_PREDICTION { challengeIndex, exerciseType, prediction, correct }`:
  - If `firstPrediction` is `null`: set `firstPrediction`, `firstPredictionCorrect`, derive and freeze `firstAttemptTag` (`"unaided"` if `assistanceViewedBeforeFirstPrediction === false`, else `"after_assistance"`), set `attemptCount = 1`.
  - If `firstPrediction` is not `null`: increment `attemptCount` only. All other fields unchanged.
  - This action is only dispatched after a successful API response (see Task 2.5). The reducer never sees a failed or in-flight request.

- `VIEW_ASSISTANCE { challengeIndex, exerciseType }`:
  - If `firstPrediction === null`: set `assistanceViewedBeforeFirstPrediction = true`.
  - If `firstPrediction !== null`: no-op.
  - `assistanceViewedBeforeFirstPrediction` can never be set back to `false`.

- `COMPLETE_CHALLENGE { challengeIndex }`:
  - Sets `completed = true` on the challenge.
  - Records `lastDownwardTransitionIndexBeforeCompletion` as the `eventIndex` of the most recent downward event in `policyHistory`, or `null` if none exist.

- `ADVANCE_TO_NEXT_EXERCISE { challengeIndex }`:
  - Advances `currentExercise` from `original` → `mutation` → `transfer`.

**Acceptance criteria (Vitest — `tests/reducer/sessionReducer.test.ts`):**
- `SUBMIT_PREDICTION` sets `firstPrediction` when null.
- Second `SUBMIT_PREDICTION` does not overwrite `firstPrediction`.
- Second `SUBMIT_PREDICTION` increments `attemptCount` to 2.
- `firstAttemptTag` is `"unaided"` without prior `VIEW_ASSISTANCE`.
- `firstAttemptTag` is `"after_assistance"` after `VIEW_ASSISTANCE` before first prediction.
- `firstAttemptTag` unchanged on second `SUBMIT_PREDICTION`.
- `VIEW_ASSISTANCE` sets flag when `firstPrediction` is null.
- `VIEW_ASSISTANCE` has no effect after `firstPrediction` is set.
- `assistanceViewedBeforeFirstPrediction` cannot revert to `false`.
- `COMPLETE_CHALLENGE` records `lastDownwardTransitionIndexBeforeCompletion: null` with no prior downward event.
- `COMPLETE_CHALLENGE` records the latest downward event index when one exists.
- `lastDownwardTransitionIndexBeforeCompletion` is not changed by a subsequent action.
- `PolicyEvent.eventIndex` equals its position in `policyHistory`.

**References:** design §6.2, requirements AC-2.1.5, AC-2.2.7, AC-2.4.4

---

### Task 3.2 — Wire evidence tracking into ExercisePanel

**Files to create/modify:**
- `frontend/src/components/ExercisePanel.tsx`

**Expected behavior:**
- Composes `PredictionInput` and `ResultPanel` for a single exercise.
- `PredictionInput` owns the verification request lifecycle (Task 2.5): it calls `fetchExerciseOutput`, locks the prediction, and dispatches `SUBMIT_PREDICTION` atomically on success. On failure, it preserves the draft and shows an error — no state is committed.
- `ResultPanel` is rendered only after `firstPrediction` is non-null (i.e. after a successful verification), using the output response cached from the successful fetch.
- When the result is shown and the learner proceeds (correct prediction is acknowledged, or incorrect prediction is acknowledged after viewing assistance), `ExercisePanel` dispatches `ADVANCE_TO_NEXT_EXERCISE` if there are more exercises, or `COMPLETE_CHALLENGE` if the transfer exercise just completed.
- `ExercisePanel` does not re-fetch output on re-render; it uses the response already obtained during the successful verification.

**Acceptance criteria:**
- After completing all three exercises of challenge 1, `state.challenges[0].completed === true`.
- `state.challenges[0].exercises.original.firstPrediction` holds the submitted text.
- `state.challenges[0].exercises.original.firstPredictionCorrect` reflects whether it matched.
- A simulated API failure during verification leaves `firstPrediction === null` and does not advance the exercise.
- A retry after failure that succeeds sets `firstPrediction` and commits the result correctly.

**References:** requirements AC-2.1.*, AC-2.2.*, AC-3.1.*, AC-3.2.*, design §6.2

---

## Milestone 4 — Assistance Policy

### Task 4.1 — Policy engine (pure function)

**Files to create:**
- `frontend/src/policy/assistancePolicy.ts`

**Expected behavior:**

Implements `evaluatePolicy(currentLevel, completedChallenges, policyHistory, trigger): PolicyDecision` as specified in design §7.

Transition rules:
- **Guided → Hint**: ≥ 2/3 unaided correct on the most recently completed challenge, all 3 exercises attempted. An "after_assistance" exercise does not disqualify the two eligible results; it contributes 0 to the count.
- **Hint → Independent**: 2 consecutive in-window challenges, each with all 3 exercises unaided correct, transfer included. Window determined by `lastDownwardTransitionIndexBeforeCompletion` vs latest downward event index in `policyHistory`.
- **Auto-downward**: all 3 exercises on the most recently completed challenge are unaided AND incorrect. `"after_assistance"` exercises are excluded from this check.
- **Manual downward**: always steps level down one when trigger is `"learner_request_more_help"`. No upward evaluation on this trigger.
- Returns `changed: false` when no condition is met.
- Every transition produces a non-empty `policy_reason`.

**Acceptance criteria (Vitest — `tests/policy/assistancePolicy.test.ts`):**
- Guided → Hint fires at 2/3 unaided correct (all 3 attempted).
- Guided → Hint fires at 3/3 unaided correct.
- Guided → Hint does not fire at 1/3 unaided correct.
- Guided → Hint fires when 2 unaided correct + 1 after_assistance correct (mixed-result: aided result excluded, not disqualifying).
- Guided → Hint does not fire if any exercise has `firstPrediction === null` (not all attempted).
- Hint → Independent fires with 2 consecutive in-window challenges each at 3/3 unaided correct including transfer.
- Hint → Independent does not fire after only 1 qualifying in-window challenge.
- Hint → Independent does not fire if transfer is `"after_assistance"` in either challenge.
- Hint → Independent excludes challenges completed before a downward transition (evidence-window reset).
- Hint → Independent fires correctly after 2 post-downward qualifying challenges.
- Auto-downward fires at 3/3 unaided incorrect.
- Auto-downward does not fire if any exercise is `"after_assistance"`.
- Manual "Get more help" steps level down; does not immediately re-promote from prior evidence.
- Manual "Get more help" at Guided has no effect.
- `policy_reason` is non-empty for every transition.
- `changed === false` when no condition is met.

**References:** design §7, requirements US-4.1–4.3

---

### Task 4.2 — Policy events in session reducer

**Files to modify:**
- `frontend/src/context/SessionContext.tsx`

**Expected behavior:**

Add reducer action `RECORD_POLICY_EVENT { event: Omit<PolicyEvent, "eventIndex"> }`:
- Appends the event to `policyHistory`, assigning `eventIndex` equal to the current array length before appending.
- Updates `assistanceLevel` to `event.toLevel`.

The component layer is responsible for calling `evaluatePolicy` and deciding whether to dispatch this action. The reducer only records the event and updates the level.

**Acceptance criteria:**
- After dispatching `RECORD_POLICY_EVENT`, `state.assistanceLevel` updates to the new level.
- `policyHistory` grows by one entry.
- `eventIndex` on each event equals its 0-based array index.

**References:** design §7.4, §7.7

---

### Task 4.3 — Policy evaluation wired into challenge completion

**Files to modify:**
- `frontend/src/components/ChallengeView.tsx`

**Expected behavior:**
- When `COMPLETE_CHALLENGE` fires (transfer exercise verified), call `evaluatePolicy` with trigger `"challenge_completed"`.
- If `PolicyDecision.changed === true`, dispatch `RECORD_POLICY_EVENT`.
- Display `<PolicyAnnouncement>` with `policy_reason` before advancing to the next challenge.
- The learner must acknowledge the announcement before "Next Challenge" is available.
- If no transition occurs, "Next Challenge" is available immediately after challenge completion.

**Acceptance criteria:**
- Complete a challenge from Guided with ≥ 2/3 unaided correct → `assistanceLevel` becomes `"hint"` after acknowledgement.
- `policyHistory` contains one entry with `trigger: "upward_auto"`.
- Complete a challenge from Hint with 3/3 unaided incorrect → `assistanceLevel` steps down to `"guided"`.
- `<PolicyAnnouncement>` text matches `policy_reason` from the engine.
- No announcement shown when no transition occurs.

**References:** design §7.1, §7.7, requirements AC-4.1.2–4.1.5

---

### Task 4.4 — "Get more help" action

**Files to create:**
- `frontend/src/components/GetMoreHelpButton.tsx`

**Files to modify:**
- `frontend/src/components/ChallengeView.tsx` (or layout component)

**Expected behavior:**
- Always visible alongside the assistance level indicator.
- Disabled and visually muted when `assistanceLevel === "guided"`.
- On click: calls `evaluatePolicy` with trigger `"learner_request_more_help"`. If `PolicyDecision.changed === true`, dispatches `RECORD_POLICY_EVENT` and shows `<PolicyAnnouncement>`.
- Does not reset evidence counters.
- Does not trigger an upward re-evaluation.
- Labeled "Get more help" with 🛟 and sub-label "More support for the rest of the session".

**Acceptance criteria:**
- Clicking at `hint` → level becomes `"guided"`, policy event recorded with `trigger: "learner_request"`.
- Clicking at `guided` → no state change, no event recorded.
- Evidence counters (`firstPredictionCorrect`, `firstAttemptTag`) on already-completed exercises are unchanged after click.

**References:** design §9.3, requirements US-4.3, AC-4.3.1–4.3.5

---

### Task 4.5 — Assistance level indicator

**Files to modify:**
- `frontend/src/components/ChallengeView.tsx` (or a small inline badge component)

**Expected behavior:**
- Displays the current `assistanceLevel` visibly at all times during a session.
- Human-readable labels: "Guided", "Getting Hints", "Independent".
- Updates immediately when the level changes.

**Acceptance criteria:**
- Level label present in the DOM at all times during a session.
- Dispatching a policy event updates the label without a page refresh.

**References:** requirements AC-2.3.5

---

## Milestone 5 — Mutation and Transfer Challenge Flow

### Task 5.1 — Mutation exercise display

**Files to create/modify:**
- `frontend/src/components/CodeBlock.tsx`
- `frontend/src/components/ExercisePanel.tsx`

**Expected behavior:**
- `ExercisePanel` detects when `exerciseType === "mutation"` and passes `diff_line` to `CodeBlock`.
- `CodeBlock` visually highlights the changed line (e.g. a yellow background or left border on the `diff_line` row).
- `diff_description` is displayed as a plain-text label below or above the code block (e.g. "What changed: Applies an arithmetic expression to i before printing.").
- The mutation exercise otherwise follows the same predict → verify flow as the original.

**Acceptance criteria:**
- The mutated line is visually distinct from unchanged lines.
- `diff_description` text is visible in the DOM.
- The prediction input, verify button, and result panel work identically to the original exercise.

**References:** requirements AC-3.1.2, AC-3.1.5

---

### Task 5.2 — Transfer exercise display and sequencing

**Files to modify:**
- `frontend/src/components/ExercisePanel.tsx`
- `frontend/src/components/ChallengeView.tsx`

**Expected behavior:**
- After the mutation exercise is verified and acknowledged, the transfer exercise is presented.
- Transfer exercise is labeled "Transfer Challenge" (no concept name shown).
- Transfer code is displayed in a plain `CodeBlock` (no diff highlighting).
- Same predict → verify flow applies.
- After transfer is verified, `COMPLETE_CHALLENGE` fires and the policy engine evaluates.

**Acceptance criteria:**
- The label "Transfer Challenge" appears in the DOM when the transfer exercise is active.
- Transfer follows the same predict → verify flow.
- `state.challenges[0].exercises.transfer.firstPrediction` is populated after transfer submission.
- `state.challenges[0].completed === true` after transfer result shown.

**References:** requirements AC-3.2.1–3.2.4

---

### Task 5.3 — Challenge navigation

**Files to modify:**
- `frontend/src/components/ChallengeView.tsx`
- `frontend/src/App.tsx`

**Expected behavior:**
- "Next Challenge" button appears after challenge completion and, if applicable, after the policy announcement is acknowledged.
- Clicking it increments `currentChallengeIndex` and displays the next challenge, starting at the original exercise.
- "Next Challenge" is absent before a challenge is complete.
- On the last challenge, "Next Challenge" is replaced by "See Report".
- The learner cannot skip ahead.

**Acceptance criteria:**
- "Next Challenge" absent before challenge 1 is complete.
- After challenge 1 complete (and announcement acknowledged if one fired), button advances to challenge 2.
- After challenge 3 complete, "See Report" button present instead of "Next Challenge".

**References:** requirements AC-1.2.1–1.2.3

---

## Milestone 6 — Ghost, Assistance Panels, and Progress Report

### Task 6.1 — "Show me a hint" button and hint panel

**Files to create:**
- `frontend/src/components/HintButton.tsx`
- `frontend/src/components/AssistancePanel.tsx`

**Expected behavior:**
- "Show me a hint" button is available at all levels during an exercise, unless a walkthrough was already auto-shown for the current exercise (in which case it is hidden as redundant).
- On click: dispatches `VIEW_ASSISTANCE`, then displays a `<HintPanel>` showing the `hint` string from the output response.
- The hint text is fetched from the already-cached output response if available; if the learner clicks before verifying, `fetchExerciseOutput` is called to obtain it (and this call does not commit any prediction evidence — it only fetches the hint).
- Button label changes to "Hint shown" after activation; subsequent clicks are a no-op.
- Labeled "Show me a hint" with 💡 and sub-label "Hint for this exercise only".

**Acceptance criteria:**
- Clicking before first prediction: `assistanceViewedBeforeFirstPrediction` becomes `true`, hint panel visible.
- Clicking after first prediction: hint panel visible, `assistanceViewedBeforeFirstPrediction` unchanged (already set or irrelevant to tag).
- Button absent when walkthrough is already displayed for this exercise.
- `firstAttemptTag` is `"after_assistance"` for any prediction submitted after "Show me a hint" was clicked.

**References:** requirements US-2.4, AC-2.4.1–2.4.6

---

### Task 6.2 — Automatic assistance panels

**Files to modify:**
- `frontend/src/components/AssistancePanel.tsx`
- `frontend/src/components/ResultPanel.tsx`

**Expected behavior:**
- After an incorrect verification result:
  - At `guided` level: auto-display walkthrough (all steps at once).
  - At `hint` level: auto-display hint.
  - At `independent` level: display encouragement message and show "Show me a hint" button.
- After a correct verification result at any level: display a brief encouragement message.
- Walkthrough and hint content come from the cached output response.

**Acceptance criteria:**
- At `guided`: walkthrough panel appears automatically after incorrect verify, without user action.
- At `hint`: hint panel appears automatically after incorrect verify.
- At `independent`: no automatic assistance text; "Show me a hint" button present.
- Encouragement message appears after correct verify at all levels.
- "Show me a hint" hidden once walkthrough is auto-shown.

**References:** requirements AC-2.3.1–2.3.4, AC-2.4.1

---

### Task 6.3 — Policy announcement component

**Files to create:**
- `frontend/src/components/PolicyAnnouncement.tsx`

**Expected behavior:**
- Displayed as a modal or inline notice whenever a level transition occurs.
- Shows the `policy_reason` string.
- Learner must click "Got it" (or equivalent) to dismiss.
- Does not block background rendering; only blocks the "Next Challenge" / next-exercise action until dismissed.

**Acceptance criteria:**
- `policy_reason` text is visible in the DOM when a transition fires.
- "Next Challenge" (or next-exercise action) is absent until announcement is dismissed.
- After dismissal, announcement is removed from DOM.

**References:** design §7.7, requirements AC-4.1.4, AC-4.2.2, AC-4.3.2

---

### Task 6.4 — Ghost companion widget

**Files to create:**
- `frontend/src/components/GhostCompanion.tsx`
- `frontend/src/styles/ghost.css`

**Expected behavior:**
- Receives `assistanceLevel` and `reactionEvent` props.
- Three visual states: guided (full/bright), hint (semi-transparent), independent (outline only).
- Four animations via CSS keyframes: idle (gentle float), thinking (slow bob), correct (upward bounce), incorrect (shake). All ≤ 2 seconds.
- Level transition via `transition: opacity 0.4s, filter 0.4s`.
- Inline SVG ghost sprite (no external image file required for MVP).
- Never dispatches or reads from session state directly.
- Parent component sets `reactionEvent` based on: typing prediction → "thinking"; verify correct → "correct"; verify incorrect → "incorrect"; idle otherwise. Clears to "idle" after ≤ 2s via `setTimeout`.

**Acceptance criteria:**
- Ghost renders at all times during a session.
- Changing `assistanceLevel` prop visibly changes the ghost's appearance.
- CSS animation classes for `correct`, `incorrect`, `thinking` are applied and removed correctly.
- Ghost does not overlap the code block or prediction input.

**References:** requirements US-5.1, US-5.2, AC-5.1.1–5.2.5

---

### Task 6.5 — Progress report page

**Files to create:**
- `frontend/src/components/ProgressReport.tsx`

**Files to modify:**
- `frontend/src/App.tsx` (add `/report` route; dispatch `SESSION_COMPLETE` when navigating)

**Expected behavior:**
- Accessible at `/report` after `sessionComplete === true`.
- Shows per-challenge table: challenge title, and for each exercise whether the first attempt was correct and whether it was unaided or after assistance.
- Shows final assistance level.
- Shows total unaided first-attempt correct count out of total exercises attempted.
- Shows all `PolicyEvent` records with `policy_reason`.
- No mastery claims or validated learning outcome language.
- If Hint → Independent was unreachable (learner never reached Hint, or only one challenge at Hint remains), shows: "Reaching Independent requires completing two consecutive challenges at full first-attempt accuracy. More challenges are needed to reach this level."
- Plain HTML; printable via browser print.

**Acceptance criteria:**
- All 9 exercise results visible in the DOM.
- `unaided` vs `after_assistance` tag visible per exercise.
- Final assistance level shown.
- All policy events with `policy_reason` visible.
- No text contains "mastered", "proven", or similar validated-outcome language.

**References:** requirements US-6.1, AC-6.1.1–6.1.7

---

## Milestone 7 — End-to-End Verification, Deployment Prep, and Documentation

### Task 7.1 — End-to-end happy-path walkthrough

**Files to modify:** none (manual verification task)

**Correct promotion sequence starting from Guided:**
- Challenge 1: ≥ 2/3 unaided correct → **Guided → Hint** fires after Challenge 1 completes.
- Challenge 2: 3/3 unaided correct (including transfer) → 1 qualifying in-window challenge at Hint. Hint → Independent requires 2 consecutive; does **not** fire yet.
- Challenge 3: 3/3 unaided correct (including transfer) → 2 consecutive qualifying in-window challenges. **Hint → Independent** fires after Challenge 3 completes.

Walk through this full sequence manually:
1. Load app → Challenge 1 displayed at Guided.
2. Submit unaided correct predictions on all 3 exercises of Challenge 1.
3. Verify **Guided → Hint** transition fires; policy announcement shown and acknowledged.
4. Complete Challenge 2 with 3/3 unaided correct predictions. Verify **no transition fires** after Challenge 2.
5. Complete Challenge 3 with 3/3 unaided correct predictions. Verify **Hint → Independent** fires; announcement shown and acknowledged.
6. "See Report" button appears. Navigate to report.
7. Report shows all 9 exercises with correct/unaided tags, exactly 2 policy events (Guided → Hint, Hint → Independent), and final level Independent.

**Acceptance criteria:**
- Exactly 2 policy events recorded in `policyHistory` (Guided → Hint after Challenge 1; Hint → Independent after Challenge 3).
- No transition fires after Challenge 2 in this scenario.
- All UI elements from Milestones 1–6 are present and functional.
- No browser console errors during the full walkthrough.
- Report data matches the session.

**References:** design §7.2–7.3, requirements AC-4.1.2–4.1.3

---

### Task 7.2 — End-to-end recovery walkthrough

**Files to modify:** none (manual verification task)

**Note on initial state:** A normal session starts at Guided. This walkthrough requires a session that has already reached Hint. Use the following test fixture to establish the starting state:

**Test fixture:** Complete Challenge 1 with 2/3 unaided correct to earn Hint (Guided → Hint transition fires). The session is now at Hint level before Challenge 2. All subsequent steps proceed from this real, reachable state.

**Recovery sequence:**
1. At Hint level (established via fixture above), begin Challenge 2.
2. Submit unaided incorrect predictions on all 3 exercises of Challenge 2.
3. Verify **Hint → Guided** auto-downward transition fires; announcement shown and acknowledged.
4. Begin Challenge 3 at Guided.
5. Complete Challenge 3 with ≥ 2/3 unaided correct → **Guided → Hint** fires again after Challenge 3.
6. "See Report" button appears (Challenge 3 was the last). Navigate to report.
7. Verify report shows 3 policy events: (a) Guided → Hint after Challenge 1, (b) Hint → Guided after Challenge 2, (c) Guided → Hint after Challenge 3, each with a `policy_reason`.

**Note on "Get more help":** "Get more help" is a manual downward action. It has no effect at Guided (already the floor). To test it, use it at Hint or Independent level. A separate focused test for this button is covered in Task 4.4 acceptance criteria; it does not need to be re-verified here.

**Acceptance criteria:**
- Auto-downward transition fires and is announced after Challenge 2 (3/3 unaided incorrect at Hint).
- No spurious upward transition fires immediately after a downward one.
- Re-promotion fires correctly when evidence is re-earned after the downward transition.
- Report shows all policy events in order with `policy_reason` strings.

**References:** design §7.3–7.4, requirements AC-4.2.1–4.2.3

---

### Task 7.3 — Backend production configuration

**Files to create/modify:**
- `backend/main.py` (add configurable CORS origin via env var)
- `backend/.env.example`
- `backend/Procfile` or platform deployment config (e.g. `fly.toml`)

**Expected behavior:**
- `CORS_ORIGIN` environment variable controls the allowed origin. Falls back to `http://localhost:5173` if unset.
- `GET /health` returns `200 {"status": "ok"}`.
- Application starts cleanly with `uvicorn main:app --host 0.0.0.0 --port 8000`.

**Acceptance criteria:**
- `CORS_ORIGIN=https://example.com uvicorn main:app` starts without error.
- `GET /health` returns `200`.
- CORS header in response matches `CORS_ORIGIN` value.

---

### Task 7.4 — Frontend production build

**Files to create/modify:**
- `frontend/vite.config.ts` (set `VITE_API_BASE_URL` for production)
- `frontend/.env.example`

**Expected behavior:**
- `npm run build` produces a `dist/` directory.
- `VITE_API_BASE_URL` overrides the default `http://localhost:8000` base URL at build time.
- Built app is a static site with no server-side rendering required.

**Acceptance criteria:**
- `npm run build` exits without errors.
- `dist/index.html` exists.
- No TypeScript errors during build.

---

### Task 7.5 — README

**Files to create:**
- `README.md`

**Content:**
- Project name and one-paragraph description.
- Architecture summary: React frontend, FastAPI backend, precomputed outputs.
- Clear note: "The MVP uses precomputed, human-verified expected outputs. Program output is not executed at runtime."
- Local development setup: prerequisites, `pip install -r requirements.txt`, `uvicorn main:app --reload`, `npm install`, `npm run dev`.
- Running tests: `pytest` (backend), `npx vitest run` (frontend).
- Deployment notes: required environment variables, execution isolation requirements for any future live-execution tier.
- Kiroween 2026 hackathon attribution.

**Acceptance criteria:**
- A developer who has not seen the codebase can follow the README to run the app locally.
- README does not claim the app executes code securely in a sandbox.

---

## Dependency Order Summary

```
1.1 Scaffolding
 └─ 1.2 Challenge JSON
     └─ 1.3 Registry
         └─ 1.4 Output resolver
             └─ 1.5 FastAPI endpoints
                 └─ 2.1 Shared types
                     └─ 2.2 API client
                         └─ 2.3 Session context (stub)
                             └─ 2.4 Challenge display
                                 └─ 2.5 Prediction input + verify request
                                     └─ 2.6 Result display
                                         └─ 3.1 Reducer evidence invariants
                                             └─ 3.2 Wire evidence into ExercisePanel
                                                 └─ 4.1 Policy engine (pure function)
                                                     └─ 4.2 Policy events in reducer
                                                         └─ 4.3 Policy wired into challenge completion
                                                             └─ 4.4 "Get more help" button
                                                             └─ 4.5 Level indicator
                                                                 └─ 5.1 Mutation display
                                                                     └─ 5.2 Transfer display + sequencing
                                                                         └─ 5.3 Challenge navigation
                                                                             └─ 6.1 "Show me a hint"
                                                                             └─ 6.2 Auto assistance panels
                                                                             └─ 6.3 Policy announcement
                                                                             └─ 6.4 Ghost companion
                                                                             └─ 6.5 Progress report
                                                                                 └─ 7.1 Happy-path walkthrough
                                                                                 └─ 7.2 Recovery walkthrough
                                                                                 └─ 7.3 Backend prod config
                                                                                 └─ 7.4 Frontend prod build
                                                                                 └─ 7.5 README
```
