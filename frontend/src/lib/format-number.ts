export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n)
}

export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const absCount = Math.abs(count)
  const mod10 = absCount % 10
  const mod100 = absCount % 100

  if (mod100 >= 11 && mod100 <= 19) {
    return `${formatNumber(count)} ${many}`
  }

  if (mod10 === 1) {
    return `${formatNumber(count)} ${one}`
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return `${formatNumber(count)} ${few}`
  }

  return `${formatNumber(count)} ${many}`
}
