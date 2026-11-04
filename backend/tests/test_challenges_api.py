"""
API contract tests for the challenge endpoints (Task 1.5).

These tests verify:
- GET /challenges returns the correct shape and excludes sensitive fields.
- GET /challenges/{id}/exercises/{type}/output returns the correct payload.
- Validation errors (404, 422) are returned for bad inputs.
- POST/PUT/PATCH are rejected.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.registry import challenge_order, registry

client = TestClient(app)

EXERCISE_TYPES = ["original", "mutation", "transfer"]
SENSITIVE_FIELDS = {"expected_output", "hint", "walkthrough"}


# ---------------------------------------------------------------------------
# GET /challenges
# ---------------------------------------------------------------------------

def test_get_challenges_status():
    response = client.get("/challenges")
    assert response.status_code == 200


def test_get_challenges_returns_all_challenges():
    response = client.get("/challenges")
    data = response.json()
    assert "challenges" in data
    assert len(data["challenges"]) == len(challenge_order)


def test_get_challenges_order():
    response = client.get("/challenges")
    returned_ids = [ch["id"] for ch in response.json()["challenges"]]
    assert returned_ids == challenge_order


def test_get_challenges_excludes_sensitive_fields():
    response = client.get("/challenges")
    for challenge in response.json()["challenges"]:
        for ex_type in EXERCISE_TYPES:
            ex = challenge["exercises"][ex_type]
            for field in SENSITIVE_FIELDS:
                assert field not in ex, (
                    f"Field '{field}' must not appear in list response "
                    f"(challenge {challenge['id']}, exercise {ex_type})"
                )


def test_get_challenges_includes_mutation_diff_fields():
    response = client.get("/challenges")
    for challenge in response.json()["challenges"]:
        mutation = challenge["exercises"]["mutation"]
        assert "diff_line" in mutation
        assert "diff_description" in mutation


def test_get_challenges_top_level_fields():
    response = client.get("/challenges")
    for challenge in response.json()["challenges"]:
        for field in ("id", "title", "description", "concept"):
            assert field in challenge, f"Missing field '{field}' in challenge {challenge.get('id')}"


# ---------------------------------------------------------------------------
# GET /challenges/{id}/exercises/{type}/output
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("challenge_id", challenge_order)
@pytest.mark.parametrize("exercise_type", EXERCISE_TYPES)
def test_get_output_valid(challenge_id: str, exercise_type: str):
    response = client.get(f"/challenges/{challenge_id}/exercises/{exercise_type}/output")
    assert response.status_code == 200
    data = response.json()
    assert data["challenge_id"] == challenge_id
    assert data["exercise_type"] == exercise_type
    assert isinstance(data["expected_output"], str) and data["expected_output"]
    assert isinstance(data["hint"], str) and data["hint"]
    assert isinstance(data["walkthrough"], list) and data["walkthrough"]
    assert data["output_source"] == "precomputed"


@pytest.mark.parametrize("challenge_id", challenge_order)
@pytest.mark.parametrize("exercise_type", EXERCISE_TYPES)
def test_get_output_matches_registry(challenge_id: str, exercise_type: str):
    """Returned expected_output must exactly match the registry value."""
    response = client.get(f"/challenges/{challenge_id}/exercises/{exercise_type}/output")
    expected = registry[challenge_id]["exercises"][exercise_type]["expected_output"]
    assert response.json()["expected_output"] == expected


def test_get_output_source_is_precomputed():
    """All MVP responses must report output_source as 'precomputed'."""
    for cid in challenge_order:
        for ex_type in EXERCISE_TYPES:
            response = client.get(f"/challenges/{cid}/exercises/{ex_type}/output")
            assert response.json()["output_source"] == "precomputed"


def test_get_output_unknown_id():
    response = client.get("/challenges/loops_99/exercises/original/output")
    assert response.status_code == 404
    assert "loops_99" in response.json()["detail"]


def test_get_output_invalid_exercise_type():
    response = client.get("/challenges/loops_01/exercises/badtype/output")
    assert response.status_code == 422


def test_get_output_no_trailing_newline():
    """expected_output in the response must not have a trailing newline."""
    for cid in challenge_order:
        for ex_type in EXERCISE_TYPES:
            response = client.get(f"/challenges/{cid}/exercises/{ex_type}/output")
            out = response.json()["expected_output"]
            assert not out.endswith("\n"), (
                f"{cid}/{ex_type}: expected_output in response has a trailing newline"
            )


# ---------------------------------------------------------------------------
# Method restrictions
# ---------------------------------------------------------------------------

def test_post_challenges_rejected():
    response = client.post("/challenges")
    assert response.status_code == 405


def test_put_challenges_rejected():
    response = client.put("/challenges/loops_01/exercises/original/output")
    assert response.status_code == 405


def test_patch_challenges_rejected():
    response = client.patch("/challenges/loops_01/exercises/original/output")
    assert response.status_code == 405
