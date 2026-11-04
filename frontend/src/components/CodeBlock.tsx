/**
 * CodeBlock — syntax-highlighted Python code display.
 *
 * For Milestone 2 this renders plain monospace code. Syntax highlighting
 * and diff-line highlighting (for mutation exercises) will be added in
 * Milestone 5 when mutation exercises are wired up.
 */

interface CodeBlockProps {
  code: string
}

export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <pre className="code-block">
      <code>{code}</code>
    </pre>
  )
}
