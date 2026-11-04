"""
Output resolver.

Defines the OutputResolver protocol and the PrecomputedResolver implementation
used by the MVP.

The MVP default is PrecomputedResolver, which returns human-verified expected
outputs stored in the challenge JSON files. No code is executed at runtime.

A future IsolatedExecutionResolver would implement the same protocol. Swapping
tiers requires changing one line in the application factory (main.py).
"""

from __future__ import annotations

from typing import Any, Protocol


class OutputResolver(Protocol):
    """
    Protocol for anything that can return the expected or actual output for
    one exercise in one challenge.

    Implementations must be stateless and safe to call from multiple requests.
    """

    def resolve(self, challenge_id: str, exercise_type: str) -> str:
        """
        Return the output string for the given challenge and exercise type.

        The returned string must NOT have a trailing newline (normalized at
        source — either at authoring time for precomputed outputs, or stripped
        by the resolver for live execution).

        Raises KeyError if challenge_id or exercise_type is not found.
        """
        ...  # pragma: no cover


class PrecomputedResolver:
    """
    Returns the human-verified expected_output stored in the challenge registry.

    This is the safe MVP default. No Python code is executed at request time.
    The output_source label for this resolver is "precomputed".
    """

    OUTPUT_SOURCE = "precomputed"

    def __init__(self, registry: dict[str, Any]) -> None:
        self._registry = registry

    def resolve(self, challenge_id: str, exercise_type: str) -> str:
        """
        Look up and return the stored expected_output.

        Raises KeyError if challenge_id or exercise_type is absent from the
        registry (the router is responsible for converting this to HTTP 404).
        """
        return self._registry[challenge_id]["exercises"][exercise_type]["expected_output"]
