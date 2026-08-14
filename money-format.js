const formatMoneyValue = (value, { prefix = '$ ', suffix = '', forceDecimals = true } = {}) => {
  const normalized = String(value ?? '').replace(/[^\d.]/g, '');
  const [integerFragment = '', ...decimalFragments] = normalized.split('.');
  const integerDigits = (integerFragment.replace(/^0+(?=\d)/, '') || '0').replace(/\D/g, '');
  const groupedInteger = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let decimalDigits = decimalFragments.join('').replace(/\D/g, '').slice(0, 2);

  if (forceDecimals) decimalDigits = decimalDigits.padEnd(2, '0');
  const decimalPart = forceDecimals || normalized.includes('.') ? `.${decimalDigits}` : '';
  return `${prefix}${groupedInteger}${decimalPart}${suffix}`;
};

export { formatMoneyValue };
