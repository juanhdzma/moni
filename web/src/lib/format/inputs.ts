
interface MoneyInputLike {
  value: string
  selectionStart: number | null
  setSelectionRange(start: number, end: number): void
}

export function fmtMoneyInput(el: MoneyInputLike): void {
  const digitosAntes = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length

  let raw = el.value.replace(/[^\d,]/g, '')
  const parts = raw.split(',')
  if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('')
  el.value = (raw.split(',')[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  let pos = 0
  for (let vistos = 0; pos < el.value.length && vistos < digitosAntes; pos++) {
    const c = el.value.charAt(pos)
    if (c >= '0' && c <= '9') vistos++
  }
  el.setSelectionRange(pos, pos)
}

export function parseMoney(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

