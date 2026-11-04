"""Tests for the challenge registry (Task 1.3)."""

from __future__ import annotations

import json
import pathlib
import tempfile

import pytest

from backend.registry import load_registry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_challenge(
    challenge_id: str = "test_01",
    *,
    drop_top: str | None = None,
    drop_exercise_field: tuple[str, str] | None = None,
    drop_exercise_type: str | None = None,
    drop_mutation_field: str | None = None,
    trailing_newline: bool = False,
    empty_output: bool = False,
    empty_walkthrough: bool = False,
) -> dict:
    """Return a valid challenge dict, with optional deliberate flaws."""
    ch = {
        "id": challenge_id,
        "concept": "test concept",
        "title": "Test Challenge",
        "description": "A test challenge.",
        "exercises": {
            "original": {
                "code": "print('x')",
                "expected_output": "x",
                "hint": "A hint.",
                "walkthrough": ["Step one.", "Step two."],
            },
            "mutation": {
                "code": "print('y')",
                "expected_output": "y",
                "diff_line": 0,
                "diff_description": "Changed the printed value.",
                "hint": "A hint.",
                "walkthrough": ["Step one."],
            },
            "transfer": {
                "code": "print('z')",
                "expected_output": "z",
                "hint": "A hint.",
                "walkthrough": ["Step one."],
            },
        },
    }
    if drop_top:
        del ch[drop_top]
    if drop_exercise_field:
        ex_type, field = drop_exercise_field
        del ch["exercises"][ex_type][field]
    if drop_exercise_type:
        del ch["exercises"][drop_exercise_type]
    if drop_mutation_field:
        del ch["exercises"]["mutation"][drop_mutation_field]
    if trailing_newline:
        ch["exercises"]["original"]["expected_output"] = "x\n"
    if empty_output:
        ch["exercises"]["original"]["expected_output"] = ""
    if empty_walkthrough:
        ch["exercises"]["original"]["walkthrough"] = []
    return ch


def _write_registry(tmp: pathlib.Path, challenges: list[dict]) -> tuple[pathlib.Path, pathlib.Path]:
    """Write challenge files and index.json into tmp dir, return (dir, index)."""
    for ch in challenges:
        (tmp / f"{ch['id']}.json").write_text(json.dumps(ch))
    index = tmp / "index.json"
    index.write_text(json.dumps([ch["id"] for ch in challenges]))
    return tmp, index


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_loads_all_challenges():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        challenges = [_make_challenge(f"ch_{i:02}") for i in range(3)]
        ch_dir, index = _write_registry(tmp, challenges)
        reg = load_registry(ch_dir, index)
        assert list(reg.keys()) == [ch["id"] for ch in challenges]
        assert len(reg) == 3


def test_required_top_level_fields_present():
    """Registry loads without error when all required fields are present."""
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge()])
        reg = load_registry(ch_dir, index)
        ch = reg["test_01"]
        for field in ("id", "concept", "title", "description", "exercises"):
            assert field in ch


def test_all_exercise_types_present():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge()])
        reg = load_registry(ch_dir, index)
        exercises = reg["test_01"]["exercises"]
        assert set(exercises.keys()) == {"original", "mutation", "transfer"}


def test_no_trailing_newline_in_expected_output():
    """The real challenge files must all have normalized expected_output."""
    real_dir = pathlib.Path(__file__).parent.parent / "challenges"
    real_index = real_dir / "index.json"
    reg = load_registry(real_dir, real_index)
    for ch_id, ch in reg.items():
        for ex_type, ex in ch["exercises"].items():
            assert not ex["expected_output"].endswith("\n"), (
                f"{ch_id}/{ex_type}: expected_output has a trailing newline"
            )


def test_missing_challenge_file_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        index = tmp / "index.json"
        index.write_text(json.dumps(["nonexistent_01"]))
        with pytest.raises(ValueError, match="nonexistent_01"):
            load_registry(tmp, index)


def test_missing_top_level_field_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(drop_top="title")])
        with pytest.raises(ValueError, match="title"):
            load_registry(ch_dir, index)


def test_missing_exercise_type_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(drop_exercise_type="transfer")])
        with pytest.raises(ValueError, match="transfer"):
            load_registry(ch_dir, index)


def test_missing_exercise_field_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(drop_exercise_field=("original", "hint"))])
        with pytest.raises(ValueError, match="hint"):
            load_registry(ch_dir, index)


def test_missing_mutation_diff_field_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(drop_mutation_field="diff_line")])
        with pytest.raises(ValueError, match="diff_line"):
            load_registry(ch_dir, index)


def test_trailing_newline_in_expected_output_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(trailing_newline=True)])
        with pytest.raises(ValueError, match="trailing newline"):
            load_registry(ch_dir, index)


def test_empty_expected_output_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(empty_output=True)])
        with pytest.raises(ValueError, match="non-empty"):
            load_registry(ch_dir, index)


def test_empty_walkthrough_raises():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        ch_dir, index = _write_registry(tmp, [_make_challenge(empty_walkthrough=True)])
        with pytest.raises(ValueError, match="walkthrough"):
            load_registry(ch_dir, index)


def test_real_challenges_load_without_error():
    """Smoke test: the actual loops_01/02/03.json load cleanly."""
    real_dir = pathlib.Path(__file__).parent.parent / "challenges"
    real_index = real_dir / "index.json"
    reg = load_registry(real_dir, real_index)
    assert list(reg.keys()) == ["loops_01", "loops_02", "loops_03"]
