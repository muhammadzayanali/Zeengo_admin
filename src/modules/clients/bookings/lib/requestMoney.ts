export function formatRequestMoney(amount: number, currency = 'RUB') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString('en-US')} ${currency}`;
  }
}
