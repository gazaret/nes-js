export type OperationResult = {
  status: boolean;
  mappedAddress: number;
};

interface IMapper {
  cpuMapRead(addr: number): OperationResult;
  cpuMapWrite(addr: number): OperationResult;
  ppuMapRead(addr: number): OperationResult;
  ppuMapWrite(addr: number): OperationResult;
}

export default IMapper;
