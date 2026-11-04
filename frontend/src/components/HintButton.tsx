interface HintButtonProps {
  shown: boolean
  loading: boolean
  onShow: () => void
}

export function HintButton({ shown, loading, onShow }: HintButtonProps) {
  return (
    <button type="button" className="btn btn-secondary hint-button" disabled={shown || loading} onClick={onShow}>
      💡 {loading ? 'Getting hint…' : shown ? 'Hint shown' : 'Show me a hint'}
      <span>Hint for this exercise only</span>
    </button>
  )
}
