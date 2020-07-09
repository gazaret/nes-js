import Mapper from '../mapper';
import { OperationResult } from '../iMapper';

// https://wiki.nesdev.com/w/index.php/INES_Mapper_000
class Mapper000 extends Mapper {
  cpuRamRangeStart = 0x8000;
  cpuRamRangeEnd = 0xffff;
  ppuRamRangeStart = 0x0000;
  ppuRamRangeEnd = 0x1fff;

  private cpuReadWrite(addr: number): OperationResult {
    // if PRGROM is 16KB
    //     CPU Address Bus          PRG ROM
    //     0x8000 -> 0xBFFF: Map    0x0000 -> 0x3FFF
    //     0xC000 -> 0xFFFF: Mirror 0x0000 -> 0x3FFF
    // if PRGROM is 32KB
    //     CPU Address Bus          PRG ROM
    //     0x8000 -> 0xFFFF: Map    0x0000 -> 0x7FFF
    if (addr >= this.cpuRamRangeStart && addr <= this.cpuRamRangeEnd) {
      const mappedAddress = addr & (this.programBanks > 1 ? 0x7fff : 0x3fff);

      return { status: true, mappedAddress };
    }

    return { status: false, mappedAddress: 0x0000 };
  }

  cpuMapRead(addr: number): OperationResult {
    return this.cpuReadWrite(addr);
  }

  cpuMapWrite(addr: number): OperationResult {
    return this.cpuReadWrite(addr);
  }

  ppuMapRead(addr: number): OperationResult {
    if (addr >= this.ppuRamRangeStart && addr <= this.ppuRamRangeEnd) {
      return { status: true, mappedAddress: addr };
    }

    return { status: false, mappedAddress: 0x0000 };
  }

  ppuMapWrite(addr: number): OperationResult {
    if (
      addr >= this.ppuRamRangeStart &&
      addr <= this.ppuRamRangeEnd &&
      this.characterBanks === 0
    ) {
      return { status: true, mappedAddress: addr };
    }

    return { status: false, mappedAddress: 0x0000 };
  }
}

export default Mapper000;
