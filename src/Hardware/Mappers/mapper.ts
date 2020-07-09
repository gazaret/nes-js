import IMapper, { OperationResult } from './iMapper';

class Mapper implements IMapper {
  protected programBanks = 0;
  protected characterBanks = 0;

  constructor(programBanks: number, characterBanks: number) {
    this.programBanks = programBanks;
    this.characterBanks = characterBanks;
  }

  cpuMapRead(addr: number): OperationResult {
    return { status: false, mappedAddress: 0x0000 };
  }

  cpuMapWrite(addr: number): OperationResult {
    return { status: false, mappedAddress: 0x0000 };
  }

  ppuMapRead(addr: number): OperationResult {
    return { status: false, mappedAddress: 0x0000 };
  }

  ppuMapWrite(addr: number): OperationResult {
    return { status: false, mappedAddress: 0x0000 };
  }
}

export default Mapper;
