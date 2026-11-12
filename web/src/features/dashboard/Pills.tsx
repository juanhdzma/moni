export function Pills<T extends string>({
  id,
  options,
  value,
  onChange,
}: {
  id: string
  options: readonly T[]
  value: T
  onChange: (p: T) => void
}) {
  return (
    <div className="period-pills" id={id}>
      {options.map((p) => (
        <button key={p} type="button" className={'period-btn' + (p === value ? ' sel' : '')} data-period={p} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
    </div>
  )
}
