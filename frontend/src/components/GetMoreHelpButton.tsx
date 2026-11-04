interface GetMoreHelpButtonProps {
  disabled: boolean
  onRequest: () => void
}

export function GetMoreHelpButton({ disabled, onRequest }: GetMoreHelpButtonProps) {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={disabled}
      onClick={onRequest}
    >
      🛟 Get more help
      <span>More support for the rest of the session</span>
    </button>
  )
}
