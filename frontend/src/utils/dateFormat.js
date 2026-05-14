function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  if (!text) return null;

  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (ymd) {
    const [, year, month, day] = ymd;
    const timePart = text.includes('T') ? text.split('T')[1] : '';
    if (timePart) {
      const parsed = new Date(text);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dmy = text.match(/^(\d{2})-(\d{2})-(\d{4})(?:$|[T\s])/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function two(value) {
  return String(value).padStart(2, '0');
}

export function formatDate(value, fallback = '-') {
  const date = toDate(value);
  if (!date) return fallback;
  return `${two(date.getDate())}-${two(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function formatTime(value, fallback = '-') {
  const date = toDate(value);
  if (!date) return fallback;
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}

export function formatDateTime(value, fallback = '-') {
  const date = toDate(value);
  if (!date) return fallback;
  return `${formatDate(date, fallback)} ${formatTime(date, fallback)}`;
}
