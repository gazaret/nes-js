class BufferReader {
  private pointer = 0;
  private readonly buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
  }

  getPointer(): number {
    return this.pointer;
  }

  setPointer(pointer: number): void {
    this.pointer = pointer;
  }

  getBufferPart(from: number, to: number): Uint8Array {
    const bufferPart = new Uint8Array(this.buffer.slice(from, to));

    this.setPointer(to + 1);

    return bufferPart;
  }
}

export default BufferReader;
