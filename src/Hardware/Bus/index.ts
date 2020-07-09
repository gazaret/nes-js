import RAM from '../../Devices/RAM';
import Cartridge from '../../Devices/Cartridge';
import CPU from '../CPU';
import PPU from '../PPU';

type AvailableHardware = 'cpu' | 'ppu';

interface IRamPartial {
  start: number;
  end: number;
}

class Bus {
  readonly cpu: CPU;
  readonly ppu: PPU;
  private readonly cpuRam: RAM;
  private readonly ppuRam: RAM;
  private cartridge: Cartridge | null = null;
  private clockCounter = 0;

  constructor(cpu: CPU, cpuRam: RAM, ppu: PPU, ppuRam: RAM) {
    this.cpu = cpu;
    this.cpuRam = cpuRam;
    this.ppu = ppu;
    this.ppuRam = ppuRam;

    this.cpu.connectBus(this);
    this.ppu.connectMainBus(this);
  }

  private getRamPartial(hardware: AvailableHardware): IRamPartial {
    const partials = new Map([
      [
        'cpu',
        {
          start: 0x0000,
          end: 0x1fff,
        },
      ],
      [
        'ppu',
        {
          start: this.ppu.CpuRamStartRange,
          end: this.ppu.CpuRamEndRange,
        },
      ],
    ]);

    const partial = partials.get(hardware);

    if (!partial) {
      throw Error('Unknown hardware in main Bus');
    }

    return partial;
  }

  private isCorrectRamAddrRange(
    addr: number,
    hardware: AvailableHardware,
  ): boolean {
    const ramPartial = this.getRamPartial(hardware);

    return addr >= ramPartial.start && addr <= ramPartial.end;
  }

  private cpuWrite(addr: number, data: number): void {
    const ramSize = this.cpuRam.getMemorySize() - 1;
    const mirrorAddr = addr & ramSize;

    this.cpuRam.setData(mirrorAddr, data);
  }

  private cpuRead(addr: number, readOnly = false): number {
    const ramSize = this.cpuRam.getMemorySize() - 1;
    const mirrorAddr = addr & ramSize;

    return this.cpuRam.getData(mirrorAddr);
  }

  private ppuCpuWrite(addr: number, data: number): void {
    const ramSize = this.ppuRam.getMemorySize() - 1;
    const mirrorAddr = addr & ramSize;

    this.ppu.cpuWrite(mirrorAddr, data);
  }

  private ppuCpuRead(addr: number, readOnly = false): number {
    const ramSize = this.ppuRam.getMemorySize() - 1;
    const mirrorAddr = addr & ramSize;

    return this.ppu.cpuRead(mirrorAddr);
  }

  busWrite(addr: number, data: number): void {
    const isCartWriteAvailable = this.cartridge?.cpuWrite(addr, data);

    if (isCartWriteAvailable) {
      return;
    }

    if (this.isCorrectRamAddrRange(addr, 'cpu')) {
      return this.cpuWrite(addr, data);
    }

    if (this.isCorrectRamAddrRange(addr, 'ppu')) {
      return this.ppuCpuWrite(addr, data);
    }
  }

  busRead(addr: number, readOnly = false): number {
    const isCartReadAvailable = this.cartridge?.cpuRead(addr);

    if (isCartReadAvailable?.status) {
      return 0x00;
    }

    if (this.isCorrectRamAddrRange(addr, 'cpu')) {
      return this.cpuRead(addr, readOnly);
    }

    if (this.isCorrectRamAddrRange(addr, 'ppu')) {
      return this.ppuCpuRead(addr, readOnly);
    }

    return 0x00;
  }

  insertCartridge(cartridge: Cartridge): void {
    this.cartridge = cartridge;

    this.cartridge.connectMainBus(this);
    this.cartridge.connectPPUBus(this.ppu);

    this.ppu.connectCartridge(this.cartridge);
  }

  reset(): void {
    this.cpu.reset();
    this.clockCounter = 0;
  }

  clock(): void {
    this.ppu.clock();

    // cpu clocks slower than ppu clock
    if (this.clockCounter % 3 === 0) {
      this.cpu.clock();
    }

    this.clockCounter++;
  }
}

export default Bus;
