import RAM from '../../Devices/RAM';
import CPU from '../CPU';
import PPU from '../PPU';

class Bus {
  readonly cpu: CPU;
  readonly ppu: PPU;
  private readonly cpuRam: RAM;

  constructor(cpu: CPU, cpuRam: RAM, ppu: PPU) {
    this.cpu = cpu;
    this.cpuRam = cpuRam;
    this.ppu = ppu;

    this.cpu.connectBus(this);
  }

  private isCorrectCpuAddrRange(addr: number): boolean {
    const cpuAddrStart = 0x0000;
    const cpuAddrEnd = 0x1fff;

    return addr >= cpuAddrStart && addr <= cpuAddrEnd;
  }

  cpuWrite(addr: number, data: number): void {
    const isCorrectAddrRange = this.isCorrectCpuAddrRange(addr);
    const ramSize = this.cpuRam.getMemorySize() - 1;
    const mirrorAddr = addr & ramSize;

    if (isCorrectAddrRange) {
      this.cpuRam.setData(mirrorAddr, data);
    }
  }

  cpuRead(addr: number, readOnly = false): number {
    const isCorrectAddrRange = this.isCorrectCpuAddrRange(addr);
    const ramSize = this.cpuRam.getMemorySize() - 1;
    const mirrorAddr = addr & ramSize;

    if (isCorrectAddrRange) {
      return this.cpuRam.getData(mirrorAddr);
    }

    return 0x00;
  }
}

export default Bus;
