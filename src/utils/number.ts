// 16 bits number - 00000000 00000000
//                  ^ HIGHT  ^ LOWER
export const HIGH_8_BIT = 0xff00;
export const LOWER_8_BIT = 0x00ff;

export const create16Number = (hi: number, lo: number): number =>
  (hi << 8) | lo;

export const getUnsigned16Number = (num: number): number => num & 0xffff;

// unsigned 8 bits number range -> 0 - 255
// signed 8 bits number range -> -128 - 128
const SIGNED_8_BIT = 0x80; // 128

export const isNegative8Number = (num: number): boolean =>
  Boolean(num & SIGNED_8_BIT);

export const transferToNegative8Number = (num: number): number =>
  ~num ^ LOWER_8_BIT;

export const getSigned8Number = (num: number): number => {
  const absNum = Math.abs(num);

  const bits = Math.abs(num).toString(2);

  if (bits.length > 8) {
    throw Error('number is not 8 bits size');
  }

  // check is negative number
  if (bits.startsWith('1') && bits.length === 8) {
    // return negative number
    return transferToNegative8Number(absNum);
  }

  return absNum;
};
