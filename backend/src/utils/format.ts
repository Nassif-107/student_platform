/**
 * Format a user's full name from the nested name object.
 * Handles optional patronymic.
 */
export function formatFullName(name: { first: string; last: string; patronymic?: string }): string {
  const parts = [name.first, name.last];
  if (name.patronymic) {
    parts.push(name.patronymic);
  }
  return parts.join(' ');
}
