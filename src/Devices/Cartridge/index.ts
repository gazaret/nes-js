import Mapper000 from '../../Hardware/Mappers/list/mapper000';
import IMapper from '../../Hardware/Mappers/iMapper';
import Bus from '../../Hardware/Bus';
import PPU from '../../Hardware/PPU';
import BufferReader from '../../utils/buffer-reader';
import { getStringFromBytes } from '../../utils/string';
import MapperIsNotAvailable from './errors/mapper-is-not-available';
import CartridgeReadError from './errors/cartridge-read-error';
import CartridgeLoadTimeoutError from './errors/cartridge-load-timeout';

interface IHeader {
  name: string;
  prgRomChunks: number;
  chrRomChunks: number;
  mapperOne: number;
  mapperTwo: number;
  prgRamSize: number;
  tvSystemOne: number;
  tvSystemTwo: number;
  unused: string;
}

type RamReadResult = {
  status: boolean;
  data: number;
};

class Cartridge {
  private programMemory = new Uint8Array();
  private characterMemory = new Uint8Array();
  private mainBus: Bus | null = null;
  private ppuBus: PPU | null = null;

  private programBanks = 0;
  private characterBanks = 0;

  private mapper: IMapper | null = null;

  private readCartridge(fileBuffer: ArrayBuffer): void {
    if (!fileBuffer) {
      return;
    }

    const bufferReader = new BufferReader(fileBuffer);

    const headerBytes = bufferReader.getBufferPart(0, 16);

    const header: IHeader = {
      name: getStringFromBytes(headerBytes.slice(0, 3)),
      prgRomChunks: headerBytes[5],
      chrRomChunks: headerBytes[6],
      mapperOne: headerBytes[7],
      mapperTwo: headerBytes[8],
      prgRamSize: headerBytes[9],
      tvSystemOne: headerBytes[10],
      tvSystemTwo: headerBytes[11],
      unused: '',
    };

    if (header.mapperOne & 0x04) {
      // skip junk memory
      bufferReader.setPointer(512);
    }

    /**
     * Determinate mapper id
     * 8bit number
     * Mapper Two for high bits
     * Mapper One for low bits
     */
    const mapperId = ((header.mapperTwo >> 4) << 4) | (header.mapperOne >> 4);

    this.programBanks = header.prgRomChunks;
    const programBankSize = 16384; // 16kb
    const programMemorySize = this.programBanks * programBankSize;

    this.programMemory = bufferReader.getBufferPart(
      bufferReader.getPointer(),
      programMemorySize + bufferReader.getPointer(),
    );

    this.characterBanks = header.chrRomChunks;
    const characterBankSize = 8192; // 8kb
    const characterMemorySize = this.characterBanks * characterBankSize;

    this.characterMemory = bufferReader.getBufferPart(
      bufferReader.getPointer(),
      characterMemorySize + bufferReader.getPointer(),
    );

    this.mapper = this.getMapperById(mapperId);

    console.log('header', header);
    console.log('mapper id', mapperId);
    console.info(this);
  }

  private getMapperById(mapperId: number): IMapper | null {
    const mappers = new Map([
      [0, new Mapper000(this.programBanks, this.characterBanks)],
    ]);

    return mappers.get(mapperId) || null;
  }

  async loadCartridge(cartridge: File): Promise<void> {
    return new Promise(resolve => {
      const reader = new FileReader();

      reader.readAsArrayBuffer(cartridge);

      reader.onerror = () => {
        throw new CartridgeReadError();
      };

      reader.onload = () => {
        const fileBuffer = reader.result as ArrayBuffer;

        this.readCartridge(fileBuffer);

        resolve();
      };
    });
  }

  connectMainBus(bus: Bus): void {
    this.mainBus = bus;
  }

  connectPPUBus(ppu: PPU): void {
    this.ppuBus = ppu;
  }

  cpuRead(addr: number): RamReadResult {
    if (!this.mapper) {
      throw new MapperIsNotAvailable();
    }

    const mapperOperationResult = this.mapper.cpuMapRead(addr);

    if (mapperOperationResult.status) {
      return {
        status: true,
        data: this.programMemory[mapperOperationResult.mappedAddress],
      };
    }

    return { status: false, data: 0 };
  }

  cpuWrite(addr: number, data: number): boolean {
    if (!this.mapper) {
      throw new MapperIsNotAvailable();
    }

    const mapperOperationResult = this.mapper.cpuMapWrite(addr);

    if (mapperOperationResult.status) {
      this.programMemory[mapperOperationResult.mappedAddress] = data;

      return true;
    }

    return false;
  }

  ppuRead(addr: number): RamReadResult {
    if (!this.mapper) {
      throw new MapperIsNotAvailable();
    }

    const mapperOperationResult = this.mapper.ppuMapRead(addr);

    if (mapperOperationResult.status) {
      return {
        status: true,
        data: this.characterMemory[mapperOperationResult.mappedAddress],
      };
    }

    return { status: false, data: 0 };
  }

  ppuWrite(addr: number, data: number): boolean {
    if (!this.mapper) {
      throw new MapperIsNotAvailable();
    }

    const mapperOperationResult = this.mapper.ppuMapWrite(addr);

    if (mapperOperationResult.status) {
      this.characterMemory[mapperOperationResult.mappedAddress] = data;

      return true;
    }

    return false;
  }
}

export default Cartridge;
