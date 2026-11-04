"""
Challenge registry.

Loads and validates all challenge JSON files at startup. The registry is a
plain dict keyed by challenge ID, in the order defined by index.json.
Only this module may read challenge files; the rest of the application
accesses challenges through the registry dict.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Required top-level fields on every challenge.
_CHALLENGE_FIELDS = {"id", "concept", "title", "description", "exercises"}

# Required fields on every exercise (original and transfer).
_EXERCISE_FIELDS = {"code", "expected_output", "hint", "walkthrough"}

# Additional required fields on mutation exercises only.
_MUTATION_EXTRA_FIELDS = {"diff_line", "diff_description"}

_VALID_EXERCISE_TYPES = {"original", "mutation", "transfer"}


def load_registry(
    challenges_dir: Path,
    index_file: Path,
) -> dict[str, Any]:
    """
    Read index.json, load each challenge file in order, validate all required
    fields, and return an ordered dict keyed by challenge ID.

    Raises ValueError with a descriptive message on any validation failure.
    """
    try:
        order: list[str] = json.loads(index_file.read_text())
    except Exception as exc:
        raise ValueError(f"Cannot read index file {index_file}: {exc}") from exc

    registry: dict[str, Any] = {}

    for challenge_id in order:
        challenge_file = challenges_dir / f"{challenge_id}.json"
        if not challenge_file.exists():
            raise ValueError(
                f"Challenge '{challenge_id}' listed in index.json but file "
                f"'{challenge_file}' does not exist."
            )

        try:
            data: dict[str, Any] = json.loads(challenge_file.read_text())
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Challenge file '{challenge_file}' is not valid JSON: {exc}"
            ) from exc

        _validate_challenge(data, challenge_file)
        registry[data["id"]] = data

    return registry


def _validate_challenge(data: dict[str, Any], source: Path) -> None:
    """Raise ValueError if any required field is missing or invalid."""
    missing_top = _CHALLENGE_FIELDS - data.keys()
    if missing_top:
        raise ValueError(
            f"Challenge file '{source}' is missing top-level fields: {sorted(missing_top)}"
        )

    exercises = data["exercises"]
    missing_types = _VALID_EXERCISE_TYPES - exercises.keys()
    if missing_types:
        raise ValueError(
            f"Challenge '{data.get('id', source)}' is missing exercise types: "
            f"{sorted(missing_types)}"
        )

    for ex_type in _VALID_EXERCISE_TYPES:
        ex = exercises[ex_type]
        missing_fields = _EXERCISE_FIELDS - ex.keys()
        if missing_fields:
            raise ValueError(
                f"Challenge '{data.get('id', source)}' exercise '{ex_type}' "
                f"is missing fields: {sorted(missing_fields)}"
            )

        expected_output = ex["expected_output"]
        if not isinstance(expected_output, str) or not expected_output:
            raise ValueError(
                f"Challenge '{data.get('id', source)}' exercise '{ex_type}': "
                f"expected_output must be a non-empty string."
            )
        if expected_output.endswith("\n"):
            raise ValueError(
                f"Challenge '{data.get('id', source)}' exercise '{ex_type}': "
                f"expected_output must not have a trailing newline (normalize at authoring time)."
            )

        if not isinstance(ex["walkthrough"], list) or not ex["walkthrough"]:
            raise ValueError(
                f"Challenge '{data.get('id', source)}' exercise '{ex_type}': "
                f"walkthrough must be a non-empty list."
            )

    # Mutation-specific fields
    mutation = exercises["mutation"]
    missing_mutation = _MUTATION_EXTRA_FIELDS - mutation.keys()
    if missing_mutation:
        raise ValueError(
            f"Challenge '{data.get('id', source)}' mutation exercise "
            f"is missing fields: {sorted(missing_mutation)}"
        )


# ---------------------------------------------------------------------------
# Module-level singleton — loaded once when the backend starts.
# ---------------------------------------------------------------------------

_CHALLENGES_DIR = Path(__file__).parent / "challenges"
_INDEX_FILE = _CHALLENGES_DIR / "index.json"

registry: dict[str, Any] = load_registry(_CHALLENGES_DIR, _INDEX_FILE)

# Ordered list of IDs (preserves index.json order for the list endpoint).
challenge_order: list[str] = list(registry.keys())
