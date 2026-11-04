/**
 * CodeBlock — syntax-highlighted Python code display.
 *
 * Renders readable source lines and can highlight the one declared mutation
 * line without implying that any other line changed.
 */

import { Fragment } from 'react'

interface CodeBlockProps {
  code: string
  /** Zero-based line index supplied by the predefined mutation exercise. */
  diffLine?: number
}

export function CodeBlock({ code, diffLine }: CodeBlockProps) {
  const lines = code.split('\n')

  return (
    <pre className="code-block" aria-label={diffLine === undefined ? 'Python code' : 'Python code with one changed line'}>
      <code>
        {lines.map((line, index) => (
          <Fragment key={`${index}-${line}`}>
            <span
              className={index === diffLine ? 'code-line code-line-changed' : 'code-line'}
              data-changed={index === diffLine || undefined}
            >
              {line}
            </span>
            {index < lines.length - 1 && '\n'}
          </Fragment>
        ))}
      </code>
    </pre>
  )
}
