# Familiar – MVP Design

**Source of truth:** `requirements.md`  
**Scope:** Python loops curriculum, precomputed outputs, no database, no auth.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React)                   │
│                                                     │
│  ┌─────────────┐   ┌──────────────┐  ┌──────────┐  │
│  │  Challenge  │   │  Policy      │  │  Ghost   │  │
│  │  View       │   │  Engine      │  │  Widget  │  │
│  │  (display,  │◄──│  (pure fn,   │  │  (reads  │  │
│  │  predict,   │   │  no side fx) │  │  level   │  │
│  │  verify)    │   └──────┬───────┘  │  only)   │  │
│  └──────┬──────┘          │          └──────────┘  │
│         │                 │                         │
│         └────────┬────────┘                         │
│                  │                                  │
│          ┌───────▼────────┐                         │
│          │  Session State │                         │
│          │  (React)       │                         │
│          └───────┬────────┘                         │
└──────────────────┼──────────────────────────────────┘
                   │  HTTP (fetch)
                   │  GET /challenges
                   │  GET /challenges/{id}/exercises/{type}/output
┌──────────────────▼──────────────────────────────────┐
│                FastAPI Backend                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Challenge Registry  (in-process dict)       │   │
│  │  Loaded from challenges/*.json at startup    │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐   │
│  │  Output Resolver                             │   │
│  │  MVP default: return precomputed output      │   │
│  │  Optional: isolated runner (future)          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Key principles:**
- The policy engine is a pure function in the browser — no server round-trip for assistance decisions.
- The backend only knows about challenges and outputs. It has no awareness of assistance levels, sessions, or learner state.
- The ghost widget reads assistance level from session state. It never writes to it.

---

## 2. Learner Flow Through a Single Challenge

Each challenge consists of three sequential exercises: original → mutation → transfer. The learner cannot proceed to the next exercise until the current one is verified.

```
Challenge starts
      │
      ▼
┌─────────────┐   predict   ┌──────────────┐   verify   ┌──────────────┐
│  Original   │────────────►│  Original    │───────────►│  Original    │
│  exercise   │             │  prediction  │            │  result      │
│  displayed  │             │  locked      │            │  shown       │
└─────────────┘             └──────────────┘            └──────┬───────┘
                                                               │
                                                  assistance shown if applicable
                                                               │
                                                               ▼
                                                     ┌──────────────────┐
                                                     │  Mutation        │
                                                     │  exercise        │◄── (same flow)
                                                     └──────────────────┘
                                                               │
                                                               ▼
                                                     ┌──────────────────┐
                                                     │  Transfer        │
                                                     │  exercise        │◄── (same flow)
                                                     └──────────────────┘
                                                               │
                                                               ▼
                                                     Policy engine evaluates
                                                     evidence for this challenge
                                                     (once, at challenge completion)
                                                               │
                                                               ▼
                                                     "Next Challenge" unlocked
```

---

## 3. Challenge Data Structure

All challenges live in `backend/challenges/`. Each file is a JSON object that a human author writes and verifies before including in the build. There is no runtime code generation.

### 3.1 Challenge descriptions — answer-neutral authoring rule

Challenge titles and descriptions must describe **what the code does structurally**, not what its output values are.

**Rule:** descriptions may name the operation and concept, but must not state, enumerate, or numerically imply the output values.

**Examples:**
- ❌ "A loop that prints 1, 2, and 3."
- ✓ "A for loop that prints each value produced by range()."
- ✓ "A loop that accumulates a running total and prints the result."

The same rule applies to `diff_description` on mutation exercises.

### 3.2 Challenge file schema

```jsonc
{
  "id": "loops_01",
  "concept": "for-loop with range",
  "title": "Counting with range()",
  "description": "A for loop that prints each value produced by range().",
  "exercises": {
    "original": {
      "code": "for i in range(1, 4):\n    print(i)",
      "expected_output": "1\n2\n3",
      "hint": "Think about what range(1, 4) produces — what is the first value, and when does it stop?",
      "walkthrough": [
        "range(1, 4) produces a sequence — it starts at the first argument and stops before the second.",
        "On the first iteration, i is assigned the first value from that sequence.",
        "print(i) outputs whatever i currently holds.",
        "This repeats for each remaining value in the sequence.",
        "When the sequence is exhausted, the loop ends."
      ]
    },
    "mutation": {
      "code": "for i in range(1, 4):\n    print(i * 2)",
      "expected_output": "2\n4\n6",
      "diff_line": 1,
      "diff_description": "Applies an arithmetic expression to i before printing.",
      "hint": "The loop still runs the same number of times. What changes is how each value of i is transformed before printing.",
      "walkthrough": [
        "range(1, 4) still produces the same sequence as before.",
        "On each iteration, the value printed is i with an arithmetic operation applied.",
        "Trace what that operation does to each value of i in turn."
      ]
    },
    "transfer": {
      "code": "total = 0\nfor n in range(1, 4):\n    total = total + n\nprint(total)",
      "expected_output": "6",
      "hint": "Instead of printing on each iteration, the loop is building up a value across iterations. What does total hold after each step?",
      "walkthrough": [
        "total is initialised before the loop.",
        "On each iteration, total is updated by adding the current value of n.",
        "Trace the value of total after each iteration.",
        "print(total) runs once, after the loop is finished."
      ]
    }
  }
}
```

**Fields:**
| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique, filesystem-safe slug |
| `concept` | string | Human-readable concept tag |
| `title` | string | Display name — answer-neutral |
| `description` | string | One-sentence intent — answer-neutral |
| `exercises.{type}.code` | string | Python source, newlines as `\n` |
| `exercises.{type}.expected_output` | string | Human-verified stdout; no trailing `\n` |
| `exercises.{type}.hint` | string | Single targeted hint |
| `exercises.{type}.walkthrough` | string[] | Ordered steps for Guided level |
| `exercises.mutation.diff_line` | int | 0-indexed line that changed |
| `exercises.mutation.diff_description` | string | Structural description — answer-neutral |

### 3.3 Challenge ordering

`backend/challenges/index.json` defines the ordered list of challenge IDs.

```json
["loops_01", "loops_02", "loops_03"]
```

### 3.4 MVP curriculum

3 challenges on Python `for` loops with `range`. Enough to trigger Guided → Hint (1 challenge, ≥ 2/3) and potentially Hint → Independent (2 consecutive at 3/3 including transfer).

Known limitation: a learner who earns Hint only on challenge 2 cannot reach Independent within the session. The report notes this when applicable.

---

## 4. API Contracts

### 4.1 `GET /challenges`

Returns ordered challenges. Expected outputs, hints, and walkthroughs are **not** included — this preserves the predict-before-verify learning flow. This is a UX default, not a security boundary; a learner can call the output endpoint directly.

**Response `200 OK`:** array of challenge objects with `id`, `title`, `description`, `concept`, and per-exercise `code` (plus `diff_line`/`diff_description` for mutations).

### 4.2 `GET /challenges/{challenge_id}/exercises/{exercise_type}/output`

Returns `expected_output`, `hint`, `walkthrough`, and `output_source` for one exercise. `exercise_type` ∈ `{original, mutation, transfer}`.

The endpoint is unauthenticated. A learner who calls it before predicting will see the expected output early. The product relies on learner motivation, not access control.

**Response `200 OK`:**
```jsonc
{
  "challenge_id": "loops_01",
  "exercise_type": "original",
  "expected_output": "1\n2\n3",
  "hint": "...",
  "walkthrough": ["...", "..."],
  "output_source": "precomputed"
}
```

`output_source` is always `"precomputed"` for the MVP. Included now so a future live-execution tier can return `"executed"` without a contract change.

**Errors:** `404` unknown ID, `422` invalid exercise type, `500` internal error.

### 4.3 CORS

Dev: `http://localhost:5173`. Production: deployed frontend origin only.

---

## 5. Verification Architecture

### 5.1 Output resolver

```python
class OutputResolver(Protocol):
    def resolve(self, challenge_id: str, exercise_type: str) -> str: ...

class PrecomputedResolver:
    def resolve(self, challenge_id: str, exercise_type: str) -> str:
        return self._registry[challenge_id]["exercises"][exercise_type]["expected_output"]
```

A future `IsolatedExecutionResolver` implements the same interface. Swapping tiers requires one line in the app factory.

### 5.2 Output normalization

**Remove at most one trailing newline.**

```
normalize(s) → s.endsWith('\n') ? s.slice(0, -1) : s
```

Applied at authoring time (stored pre-normalized) and client-side at comparison time. `"1\n2\n\n"` → `"1\n2\n"` (one removed; the inner newline is significant).

### 5.3 UI copy accuracy

`output_source === "precomputed"` → label **"Expected output"**.  
`output_source === "executed"` → label **"Actual output"**.

---

## 6. Session State

Single React context + `useReducer`. No external store.

### 6.1 State shape (TypeScript)

```typescript
type ExerciseType = "original" | "mutation" | "transfer";
type AssistanceLevel = "guided" | "hint" | "independent";

interface ExerciseRecord {
  exerciseType: ExerciseType;
  firstPrediction: string | null;
  firstPredictionCorrect: boolean | null;
  assistanceViewedBeforeFirstPrediction: boolean;
  firstAttemptTag: "unaided" | "after_assistance" | null;
  attemptCount: number;
}

interface ChallengeRecord {
  challengeId: string;
  exercises: Record<ExerciseType, ExerciseRecord>;
  currentExercise: ExerciseType;
  completed: boolean;
  // Snapshot of the latest downward-transition eventIndex at challenge-completion time.
  // null if no downward transition had occurred before this challenge completed.
  lastDownwardTransitionIndexBeforeCompletion: number | null;
}

interface PolicyEvent {
  fromLevel: AssistanceLevel;
  toLevel: AssistanceLevel;
  trigger: "upward_auto" | "downward_auto" | "learner_request";
  policy_reason: string;
  afterChallengeId: string;
  eventIndex: number;
}

interface SessionState {
  challenges: ChallengeRecord[];
  currentChallengeIndex: number;
  assistanceLevel: AssistanceLevel;
  policyHistory: PolicyEvent[];
  sessionComplete: boolean;
}
```

### 6.2 Evidence integrity invariants (enforced in reducer)

1. `firstPrediction` is write-once. Subsequent submissions increment `attemptCount` only.
2. `assistanceViewedBeforeFirstPrediction` is set-once to `true`. Never reset.
3. `firstAttemptTag` is derived and frozen at first submission.
4. All exercise fields except `attemptCount` are immutable after first submission.

---

## 7. Policy Engine

Pure function. Takes state, returns `PolicyDecision`. No side effects.

```typescript
interface PolicyDecision {
  newLevel: AssistanceLevel;
  policy_reason: string;
  changed: boolean;
}

function evaluatePolicy(
  currentLevel: AssistanceLevel,
  completedChallenges: ChallengeRecord[],
  policyHistory: PolicyEvent[],
  trigger: "challenge_completed" | "learner_request_more_help"
): PolicyDecision
```

### 7.1 Evaluation timing

- Once per challenge completion (after transfer verified).
- On manual "Get more help" (downward only; no upward re-check on existing evidence).
- Never triggered by "Show me a hint".
- Never re-evaluated retroactively after "Get more help".

### 7.2 Guided → Hint (upward)

- Most recently completed challenge.
- Count exercises: `firstAttemptTag === "unaided"` AND `firstPredictionCorrect === true`.
- Require ≥ 2 of 3, all 3 attempted.
- An "after_assistance" exercise does not disqualify the two eligible correct results; it contributes 0 to the count.

### 7.3 Hint → Independent (upward)

- Identify the current consecutive evidence window (§7.5).
- Two most recent in-window challenges must each have all 3 exercises unaided correct, including transfer.

### 7.4 Downward automatic

- Current level is `hint` or `independent`.
- Most recently completed challenge: all 3 exercises unaided AND incorrect.
- ("after_assistance" exercises are excluded from this check.)
- Level steps down one.

### 7.5 Consecutive-evidence window

`lastDownwardTransitionIndexBeforeCompletion` on each `ChallengeRecord` snapshots the latest downward `eventIndex` at the moment the challenge was completed. Challenges completed before the most recent downward transition have a smaller (or null) value and are excluded from the Hint → Independent window.

### 7.6 Manual downward ("Get more help")

Steps down one. Records `policy_reason: "Learner requested more support."`. Does not reset evidence counters. Does not trigger upward re-check.

### 7.7 "Show me a hint"

No policy-engine call. Only sets `assistanceViewedBeforeFirstPrediction` via `VIEW_ASSISTANCE` dispatch.

---

## 8. Ghost Companion

Read-only component. Two props: `assistanceLevel` and `reactionEvent`. Never dispatches.

| `assistanceLevel` | Appearance |
|---|---|
| `guided` | Full, bright |
| `hint` | Semi-transparent |
| `independent` | Outline only |

| `reactionEvent` | Animation |
|---|---|
| `thinking` | Slow float |
| `correct` | Upward bounce |
| `incorrect` | Shake |
| `idle` | Gentle float |

CSS transitions for level changes (`opacity 0.4s, filter 0.4s`). Inline SVG sprite. No JS animation library.

---

## 9. Assistance Delivery

| Level | After incorrect | After correct |
|---|---|---|
| `guided` | Auto-expand walkthrough | Encouragement |
| `hint` | Auto-expand hint | Encouragement |
| `independent` | Encouragement + "Show me a hint" | Encouragement |

**"Show me a hint"** — temporary, per-exercise. Available at all levels unless a walkthrough was already auto-shown. Dispatches `VIEW_ASSISTANCE`. Does not change assistance level. Button relabeled "Hint shown" after activation.

**"Get more help"** — persistent. Lowers default level. Always visible in header/sidebar.

UI labeling:
- "Show me a hint" 💡 — "Hint for this exercise only"
- "Get more help" 🛟 — "More support for the rest of the session"

---

## 10. Progress Report

Route `/report`. Derived from `SessionState` only.

```typescript
interface ReportData {
  challenges: ChallengeSummary[];
  finalAssistanceLevel: AssistanceLevel;
  unaidedCorrect: number;
  totalAttempted: number;
  policyHistory: PolicyEvent[];
}
```

No mastery claims. Notes Hint → Independent unreachable if applicable.

---

## 11. File Structure

```
familiar/
├── backend/
│   ├── main.py
│   ├── routers/challenges.py
│   ├── registry.py
│   ├── output_resolver.py
│   ├── challenges/
│   │   ├── index.json
│   │   ├── loops_01.json
│   │   ├── loops_02.json
│   │   └── loops_03.json
│   ├── tests/
│   │   ├── test_challenges_api.py
│   │   └── test_registry.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/client.ts
│   │   ├── context/SessionContext.tsx
│   │   ├── policy/assistancePolicy.ts
│   │   ├── components/
│   │   │   ├── ChallengeView.tsx
│   │   │   ├── ExercisePanel.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── PredictionInput.tsx
│   │   │   ├── ResultPanel.tsx
│   │   │   ├── AssistancePanel.tsx
│   │   │   ├── HintButton.tsx
│   │   │   ├── GetMoreHelpButton.tsx
│   │   │   ├── GhostCompanion.tsx
│   │   │   ├── PolicyAnnouncement.tsx
│   │   │   └── ProgressReport.tsx
│   │   ├── styles/
│   │   │   ├── ghost.css
│   │   │   └── global.css
│   │   └── types.ts
│   ├── tests/
│   │   ├── policy/assistancePolicy.test.ts
│   │   └── reducer/sessionReducer.test.ts
│   ├── package.json
│   └── tsconfig.json
```

---

## 12. Testing Strategy

### Backend (pytest)

| Test | Covers |
|---|---|
| All challenge JSON files load; required fields present; no trailing `\n` in `expected_output` | Registry validation |
| `GET /challenges` — list response excludes `expected_output`, `hint`, `walkthrough` | API contract |
| `GET /.../output` — returns correct fields and `output_source: "precomputed"` | Output contract |
| 404 on unknown challenge ID | Validation |
| 422 on invalid exercise type | Validation |
| POST/PUT/PATCH returns 404/405 | No code acceptance |

### Frontend (Vitest)

#### Policy engine

| Test | Covers |
|---|---|
| Guided → Hint fires at 2/3 unaided correct | Core threshold |
| Guided → Hint fires at 3/3 unaided correct | Upper bound |
| Guided → Hint does not fire at 1/3 | Below threshold |
| Guided → Hint fires when 2 unaided correct + 1 after_assistance correct | **Mixed-result: aided result excluded, not disqualifying** |
| Guided → Hint does not fire if not all exercises attempted | Attempted requirement |
| Hint → Independent fires with 2 consecutive in-window challenges at 3/3 unaided correct including transfer | Core two-challenge requirement |
| Hint → Independent does not fire after 1 qualifying challenge | Consecutive requirement |
| Hint → Independent does not fire if transfer is after_assistance | Transfer-unaided requirement |
| Hint → Independent excludes challenges before a downward transition | Evidence window |
| Hint → Independent fires correctly after 2 post-downward qualifying challenges | Window reset happy path |
| Auto-downward fires at 3/3 unaided incorrect | Downward rule |
| Auto-downward does not fire if any exercise is after_assistance | Aided-exercise exclusion |
| Manual "Get more help" steps down; no immediate re-promotion | Manual trigger isolation |
| Manual at Guided has no effect | Floor no-op |
| `policy_reason` non-empty on every transition | Explainability |
| `changed === false` when no condition met | No spurious events |

#### Session reducer

| Test | Covers |
|---|---|
| `SUBMIT_PREDICTION` sets `firstPrediction` when null | Happy path |
| Second `SUBMIT_PREDICTION` does not overwrite `firstPrediction` | Write-once invariant |
| Second `SUBMIT_PREDICTION` increments `attemptCount` | Duplicate tracking |
| `firstAttemptTag` is `"unaided"` without prior assistance | Tag derivation |
| `firstAttemptTag` is `"after_assistance"` with prior hint | Tag derivation |
| `firstAttemptTag` unchanged on second submission | Tag is frozen |
| `VIEW_ASSISTANCE` sets flag when `firstPrediction` is null | Hint-viewed flag |
| `VIEW_ASSISTANCE` has no effect after `firstPrediction` set | Post-submission irrelevance |
| Flag cannot revert to false | Set-once invariant |
| `CHALLENGE_COMPLETED` records `lastDownwardTransitionIndexBeforeCompletion: null` with no prior downward event | Window tracking |
| `CHALLENGE_COMPLETED` records correct downward event index when one exists | Window snapshot |
| `lastDownwardTransitionIndexBeforeCompletion` unchanged after completion | Field is frozen |
| Policy not re-evaluated on `REQUEST_MORE_HELP` mid-challenge | Manual trigger isolation |
| `PolicyEvent.eventIndex` matches position in `policyHistory` | Index integrity |

---

## 13. Key Edge Cases

| Scenario | Behaviour |
|---|---|
| 2 unaided correct + 1 after_assistance correct | Guided → Hint fires (aided result excluded, not disqualifying) |
| Hint viewed before prediction; prediction correct | Tagged "after_assistance"; not eligible for upward evidence |
| "Get more help" used; next 2 challenges 3/3 unaided correct | Hint → Independent fires on the second post-downward challenge |
| Challenge 1 complete (3/3 unaided at hint); "Get more help"; challenge 2 complete (3/3 unaided at hint) | Challenge 1 outside window; only challenge 2 in window; Hint → Independent does not fire |
| Verify clicked twice | Button disabled after first verify; `attemptCount` not incremented |
| "Get more help" at Guided | No state change, button disabled |
| Backend 500 on output fetch | Error shown inline; exercise state unchanged |
| `normalize("1\n2\n\n")` | Returns `"1\n2\n"` (one trailing newline removed) |

---

## 14. Security Boundaries

- Backend never accepts code from client.
- MVP uses precomputed outputs only.
- Challenge IDs validated against registry at startup.
- Predictions never leave the browser.
- Output endpoint is unauthenticated; predict-before-verify is a UX default only.
- Rate limiting recommended before public deployment.
- Future live-execution runner must be network-isolated and not publicly reachable.

---

## 15. Open Questions

**Q1** — Walkthrough reveal: all steps at once vs. step-by-step. **MVP:** all at once.  
**Q2** — Transfer label: label section "Transfer Challenge", omit concept name.  
**Q3** — Independent level unreachable with ≤ 1 challenge at Hint. **MVP:** note in report.  
**Q4** — Ghost sprite: inline SVG for MVP.  
**Q5** — Hide "Show me a hint" once walkthrough auto-shown for that exercise.  
**Q6** — Multiple downward transitions handled correctly by `lastDownwardTransitionIndexBeforeCompletion` snapshotting the latest event at each completion. No special handling needed.
