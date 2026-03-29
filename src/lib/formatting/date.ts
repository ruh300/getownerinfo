const dateFormatter = new Intl.DateTimeFormat("en-RW", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-RW", {
  dateStyle: "medium",
  timeStyle: "short",
});

function normalizeDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: string | Date) {
  return dateFormatter.format(normalizeDate(value));
}

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(normalizeDate(value));
}
