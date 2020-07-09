import Cartridge from '../../Devices/Cartridge';
import RAM from '../../Devices/RAM';
import Bus from '../Bus';

class PPU {
  private cycle = 0;
  private scanline = 0;
  private frameIsRendered = false;

  private mainBus: Bus | null = null;
  private cartridge: Cartridge | null = null;

  private readonly tableName: number = 0;
  private readonly tablePattern: number = 0;

  CpuRamStartRange = 0x2000;
  CpuRamEndRange = 0x3fff;

  connectMainBus(bus: Bus): void {
    this.mainBus = bus;
  }

  connectCartridge(cartridge: Cartridge): void {
    this.cartridge = cartridge;
  }

  cpuWrite(addr: number, data: number): void {}

  cpuRead(addr: number, readOnly = false): number {
    return 0x00;
  }

  ppuRead(addr: number): number {
    const data = 0x00;

    const mirrorAddr = addr & this.CpuRamEndRange;

    const cartPpuReadAvailable = this.cartridge?.ppuRead(mirrorAddr);

    if (cartPpuReadAvailable?.status) {
      // for cartridge mapping
      return 0x00;
    }

    return data;
  }

  ppuWrite(addr: number, data: number): void {
    const mirrorAddr = addr & this.CpuRamEndRange;

    const cartPpuReadAvailable = this.cartridge?.ppuWrite(mirrorAddr, data);

    if (cartPpuReadAvailable) {
      // for cartridge mapping
    }
  }

  clock(): void {
    this.cycle++;

    if (this.cycle >= 341) {
      this.cycle = 0;
      this.scanline++;

      if (this.scanline >= 261) {
        this.scanline = -1;

        this.frameIsRendered = true;
      }
    }
  }
}

export default PPU;
