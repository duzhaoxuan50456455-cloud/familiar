interface PolicyAnnouncementProps {
  reason: string
  onDismiss: () => void
}

export function PolicyAnnouncement({ reason, onDismiss }: PolicyAnnouncementProps) {
  return (
    <aside className="policy-announcement" role="status" aria-live="polite">
      <p>{reason}</p>
      <button type="button" className="btn btn-secondary" onClick={onDismiss}>Got it</button>
    </aside>
  )
}
