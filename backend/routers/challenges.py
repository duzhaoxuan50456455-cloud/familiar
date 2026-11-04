"""
Challenge endpoints.

GET /challenges
    Returns the ordered list of challenges for display. Expected outputs,
    hints, and walkthroughs are intentionally excluded to preserve the
    predict-before-verify learning flow. This is a UX default, not a
    security boundary.

GET /challenges/{challenge_id}/exercises/{exercise_type}/output
    Returns the expected output, hint, walkthrough, and output_source for
    one exercise. The output_source field is always "precomputed" in the MVP.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/challenges", tags=["challenges"])


# ---------------------------------------------------------------------------
# Path parameter enum
# ---------------------------------------------------------------------------

class ExerciseType(str, Enum):
    original = "original"
    mutation = "mutation"
    transfer = "transfer"


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class OriginalExerciseSummary(BaseModel):
    code: str


class MutationExerciseSummary(BaseModel):
    code: str
    diff_line: int
    diff_description: str


class TransferExerciseSummary(BaseModel):
    code: str


class ChallengeExercises(BaseModel):
    original: OriginalExerciseSummary
    mutation: MutationExerciseSummary
    transfer: TransferExerciseSummary


class ChallengeSummary(BaseModel):
    id: str
    title: str
    description: str
    concept: str
    exercises: ChallengeExercises


class ChallengeListResponse(BaseModel):
    challenges: list[ChallengeSummary]


class ExerciseOutputResponse(BaseModel):
    challenge_id: str
    exercise_type: str
    expected_output: str
    hint: str
    walkthrough: list[str]
    output_source: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_challenge_summary(data: dict[str, Any]) -> ChallengeSummary:
    ex = data["exercises"]
    return ChallengeSummary(
        id=data["id"],
        title=data["title"],
        description=data["description"],
        concept=data["concept"],
        exercises=ChallengeExercises(
            original=OriginalExerciseSummary(code=ex["original"]["code"]),
            mutation=MutationExerciseSummary(
                code=ex["mutation"]["code"],
                diff_line=ex["mutation"]["diff_line"],
                diff_description=ex["mutation"]["diff_description"],
            ),
            transfer=TransferExerciseSummary(code=ex["transfer"]["code"]),
        ),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=ChallengeListResponse)
def list_challenges(request: Request) -> ChallengeListResponse:
    """
    Return all challenges in curriculum order.

    expected_output, hint, and walkthrough are deliberately excluded here;
    they are available via the output endpoint once the learner is ready to
    verify their prediction.
    """
    from backend.registry import registry, challenge_order  # imported here to avoid circular refs at startup

    summaries = [_build_challenge_summary(registry[cid]) for cid in challenge_order]
    return ChallengeListResponse(challenges=summaries)


@router.get("/{challenge_id}/exercises/{exercise_type}/output", response_model=ExerciseOutputResponse)
def get_exercise_output(
    challenge_id: str,
    exercise_type: ExerciseType,
    request: Request,
) -> ExerciseOutputResponse:
    """
    Return the expected output, hint, and walkthrough for one exercise.

    output_source is "precomputed" in the MVP — outputs are human-verified
    values stored in the challenge JSON files. No code is executed at runtime.

    The endpoint is unauthenticated. A learner who calls it before submitting
    a prediction will see the expected output early. The predict-before-verify
    flow is enforced by the UI, not by this endpoint.
    """
    from backend.registry import registry
    from backend.output_resolver import PrecomputedResolver

    if challenge_id not in registry:
        raise HTTPException(status_code=404, detail=f"Challenge '{challenge_id}' not found.")

    resolver = PrecomputedResolver(registry)
    ex_data = registry[challenge_id]["exercises"][exercise_type.value]

    return ExerciseOutputResponse(
        challenge_id=challenge_id,
        exercise_type=exercise_type.value,
        expected_output=resolver.resolve(challenge_id, exercise_type.value),
        hint=ex_data["hint"],
        walkthrough=ex_data["walkthrough"],
        output_source=PrecomputedResolver.OUTPUT_SOURCE,
    )
