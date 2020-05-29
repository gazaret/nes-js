export const toStringWithBase = (
  num: number,
  radix: number,
  base: number,
): string => {
  const str = num.toString(radix);

  if (str.length === base) {
    return str;
  }

  if (str.length > base) {
    // eslint-disable-next-line no-console
    console.warn('toStringWithBase overflow!');
    return str.slice(0, base);
  }

  const remainChars = base - str.length;

  return '0'.repeat(remainChars) + str;
};
