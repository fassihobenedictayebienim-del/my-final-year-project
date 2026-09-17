const formatter = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  return `GH₵ ${formatter.format(Number(value) || 0)}`;
}

export function formatCurrencyValue(value) {
  return formatter.format(Number(value) || 0);
}
