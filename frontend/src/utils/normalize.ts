/**
 * normalize — remove at most one trailing newline.
 *
 * Design spec §5.2:
 *   normalize(s) → s.endsWith('\n') ? s.slice(0, -1) : s
 *
 * Applied to both the learner's prediction and the expected_output string
 * before comparison so that a trailing Enter in the textarea doesn't cause
 * a spurious mismatch.
 *
 * "1\n2\n\n" → "1\n2\n"  (one removed; the inner newline is significant)
 * "1\n2\n3"  → "1\n2\n3" (no trailing newline, unchanged)
 * "6\n"      → "6"
 */
export function normalize(s: string): string {
  return s.endsWith('\n') ? s.slice(0, -1) : s
}
