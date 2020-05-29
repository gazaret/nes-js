import RAM from '../../Devices/RAM';
import CPU from '../CPU';

class Bus {
  readonly cpu: CPU;
  private readonly ram: RAM;

  constructor(cpu: CPU, ram: RAM) {
    this.cpu = cpu;
    this.ram = ram;

    this.cpu.connectBus(this);
  }

  private isCorrectAddrRange(addr: number): boolean {
    return addr >= 0 && addr <= this.ram.getMemorySize();
  }

  write(addr: number, data: number): void {
    const isCorrectAddrRange = this.isCorrectAddrRange(addr);

    if (isCorrectAddrRange) {
      this.ram.setData(addr, data);
    }
  }

  read(addr: number, readOnly = false): number {
    const isCorrectAddrRange = this.isCorrectAddrRange(addr);

    if (isCorrectAddrRange) {
      return this.ram.getData(addr);
    }

    return 0;
  }
}

export default Bus;
