class RAM {
  private readonly SIZE = 64 * 1024;
  private memory: Uint8Array;

  constructor() {
    const buffer = new ArrayBuffer(this.SIZE);
    this.memory = new Uint8Array(buffer);
  }

  getMemorySize(): number {
    return this.SIZE;
  }

  getMemory(): Uint8Array {
    return this.memory;
  }

  getData(addr: number): number {
    return this.memory[addr];
  }

  setData(addr: number, data: number): void {
    this.memory[addr] = data;
  }
}

export default RAM;
