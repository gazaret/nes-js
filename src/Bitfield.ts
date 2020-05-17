// n/a  sw2  sw1  state  value
// 0    0    0    00     000

class Bitfield {
  private readonly SW2_OFFSET = 1;
  private readonly SW1_OFFSET = 2;
  private readonly STATE_OFFSET = 3;
  private readonly VALUE_OFFSET = 5;

  private char: Uint8Array;

  constructor(char: number) {
    const charBit = this.getBitValueByMask(char.toString(2), '00000000');

    const buffer = new ArrayBuffer(8);
    const source = charBit.length ? charBit : buffer;
    this.char = new Uint8Array(source);
  }

  private getBitValueByMask(bit: string, mask: string): number[] {
    const maskedBit = mask.concat(bit);
    const bitStrArray = maskedBit
      .slice(maskedBit.length - mask.length)
      .split('');

    return bitStrArray.map(bitStr => parseInt(bitStr));
  }

  getChar(): number {
    const bit = this.char.join('');

    return parseInt(bit, 2);
  }

  set sw2(sw2: number) {
    this.char[this.SW2_OFFSET] = sw2;
  }

  get sw2(): number {
    return this.char[this.SW2_OFFSET];
  }

  set sw1(sw1: number) {
    this.char[this.SW1_OFFSET] = sw1;
  }

  get sw1(): number {
    return this.char[this.SW1_OFFSET];
  }

  set state(state: number) {
    const stateBit = this.getBitValueByMask(state.toString(2), '00');

    stateBit.forEach((bit, idx) => (this.char[idx + this.STATE_OFFSET] = bit));
  }

  get state(): number {
    const stateBit = this.char.subarray(this.STATE_OFFSET, this.VALUE_OFFSET);

    return parseInt(stateBit.join(''), 2);
  }

  set value(value: number) {
    const valueBit = this.getBitValueByMask(value.toString(2), '000');

    valueBit.forEach((bit, idx) => (this.char[idx + this.VALUE_OFFSET] = bit));
  }

  get value(): number {
    const valueBit = this.char.subarray(this.VALUE_OFFSET, this.char.length);

    return parseInt(valueBit.join(''), 2);
  }
}

export default Bitfield;
