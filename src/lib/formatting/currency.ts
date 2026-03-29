const rwfFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatRwf(value: number) {
  return `${rwfFormatter.format(value)} Rwf`;
}

