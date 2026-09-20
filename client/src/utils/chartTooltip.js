// Recharts defaults its tooltip text to dark colours.  Setting all three
// styles explicitly keeps the date and values legible in both app themes.
export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    boxShadow: 'var(--shadow)',
    color: 'var(--color-text)',
    fontSize: 12.5,
  },
  labelStyle: { color: 'var(--color-text)', fontWeight: 700 },
  itemStyle: { color: 'var(--color-text)' },
};
