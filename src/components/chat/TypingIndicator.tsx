export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null

  const label = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing`
    : 'Several people are typing'

  return (
    <div className="flex items-center gap-2 px-4 py-1 animate-fade-in">
      <div className="flex items-center gap-1 bg-surface-2 rounded-2xl px-3 py-2">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-xs text-ink-subtle italic">{label}</span>
    </div>
  )
}
