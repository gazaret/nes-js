import Bus from '../../Hardware/Bus';
import { IFlag } from '../../Hardware/CPU';
import Cartridge from '../../Devices/Cartridge';
import { toStringWithBase } from '../../utils/string';

class TestScreen {
  private readonly bus: Bus;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly fontSize: number = 14;
  private dissasmCode: string[] = [];

  constructor(bus: Bus) {
    this.bus = bus;

    const canvas = document.querySelector('#main-screen') as HTMLCanvasElement;

    if (!canvas) {
      throw Error('canvas not found');
    }

    this.canvas = canvas;
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;

    this.canvasWidth = this.canvas.width;
    this.canvasHeight = this.canvas.height;

    const cartridgeUpload = document.querySelector(
      '#cartridge',
    ) as HTMLInputElement;

    cartridgeUpload.addEventListener('change', this.handleCartridgeUpload);

    this.fontSetup();

    this.handleControl();
  }

  fontSetup(): void {
    this.context.font = `${this.fontSize}px Arial`;
    this.context.textBaseline = 'top';
  }

  handleCartridgeUpload = async (e: any): Promise<void> => {
    const file: File = e.target?.files[0];

    if (!file) {
      return;
    }

    const cartridge = new Cartridge();

    await cartridge.loadCartridge(file);

    this.bus.insertCartridge(cartridge);

    this.loadProgram();
  };

  loadProgram(): void {
    // reset vectors
    this.bus.busWrite(0xfffc, 0x00);
    this.bus.busWrite(0xfffd, 0x80);

    this.dissasmCode = this.bus.cpu.disassemble(0x0000, 0xffff);

    console.info(this.dissasmCode);

    this.bus.reset();

    this.render();
  }

  handleControl(): void {
    window.addEventListener('keypress', e => {
      if (e.code === 'Space') {
        return this.handleNextInstruction();
      }

      if (e.code === 'KeyR') {
        return this.handleReset();
      }
    });
  }

  handleNextInstruction(): void {
    do {
      this.bus.clock();
    } while (!this.bus.cpu.isCompleteCycle);

    this.render();

    // eslint-disable-next-line no-console
    console.info('Next Instruction!');
  }
  handleReset(): void {
    this.bus.cpu.reset();

    this.render();

    // eslint-disable-next-line no-console
    console.info('Reset!');
  }

  drawRAM(
    x: number,
    y: number,
    startAddr: number,
    rows: number,
    columns: number,
  ): void {
    let addr = startAddr;
    this.context.fillStyle = '#fff';

    for (let row = 0; row < rows; row++) {
      let ramRow = `$${toStringWithBase(addr, 16, 4)}:`;

      for (let column = 0; column < columns; column++) {
        const columnAddr = this.bus.busRead(addr, true);
        ramRow += ` ${toStringWithBase(columnAddr, 16, 2).toUpperCase()}`;
        addr++;
      }

      const nextY = y + this.fontSize * row;
      this.context.fillText(ramRow, x, nextY);
    }
  }

  drawFlags(x: number, y: number): void {
    const cpu = this.bus.cpu;

    const flags: IFlag[] = ['C', 'Z', 'I', 'D', 'B', 'U', 'V', 'N'];

    flags.forEach((flag, idx) => {
      const nextY = y + this.fontSize * idx;
      const isFlagOn = cpu.getFlag(flag);

      this.context.fillText(`${flag} - ${isFlagOn}`, x, nextY);
    });
  }

  drawRegisters(x: number, y: number): void {
    const cpu = this.bus.cpu;
    let nextY = y;

    const programCounter = toStringWithBase(
      cpu.programCounter,
      16,
      4,
    ).toUpperCase();
    const accumulator = toStringWithBase(cpu.accumulator, 16, 2).toUpperCase();
    const xRegister = toStringWithBase(cpu.xRegister, 16, 2).toUpperCase();
    const yRegister = toStringWithBase(cpu.yRegister, 16, 2).toUpperCase();
    const statusRegister = toStringWithBase(
      cpu.statusRegister,
      16,
      2,
    ).toUpperCase();
    const stackPointer = toStringWithBase(
      cpu.stackPointer,
      16,
      4,
    ).toUpperCase();

    this.context.fillText(`Program Counter - 0x${programCounter}`, x, nextY);
    nextY += this.fontSize;
    this.context.fillText(
      `Accumuator - 0x${accumulator} (${cpu.accumulator})`,
      x,
      nextY,
    );
    nextY += this.fontSize;
    this.context.fillText(
      `X Register - 0x${xRegister} (${cpu.xRegister})`,
      x,
      nextY,
    );
    nextY += this.fontSize;
    this.context.fillText(
      `Y Register - 0x${yRegister} (${cpu.yRegister})`,
      x,
      nextY,
    );
    nextY += this.fontSize;
    this.context.fillText(
      `Status Register - 0x${statusRegister} (${cpu.statusRegister})`,
      x,
      nextY,
    );
    nextY += this.fontSize;
    this.context.fillText(`Stack Pointer - 0x${stackPointer}`, x, nextY);
  }

  drawAsmCode(x: number, y: number): void {
    const cpu = this.bus.cpu;

    const lineCount = 25;

    const offsetFromIdx = this.dissasmCode.findIndex(line =>
      line.includes(`$${toStringWithBase(cpu.programCounter, 16, 4)}`),
    );
    const offsetFrom = offsetFromIdx < 2 ? offsetFromIdx : offsetFromIdx - 2;
    const offsetTo = offsetFrom + lineCount;

    const partOfCode = this.dissasmCode.slice(offsetFrom, offsetTo);

    partOfCode.forEach((line, idx) => {
      const isCurrentIndex = line.startsWith(
        `$${toStringWithBase(cpu.programCounter, 16, 4)}:`,
      );

      if (isCurrentIndex) {
        this.context.fillStyle = '#00ff00';
      }

      const nextY = y + this.fontSize * idx;
      this.context.fillText(line, x, nextY);
      this.context.fillStyle = '#fff';
    });
  }

  drawControl(x: number, y: number): void {
    this.context.fillText('Control keys:', x, y);
    this.context.fillText('Next Instruction: SPACE', x, y + this.fontSize);
    this.context.fillText('Reset: R', x, y + this.fontSize * 2);
  }

  render(): void {
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.context.fillStyle = '#000';
    this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawRAM(2, 2, 0xbff4, 16, 16);
    this.drawRAM(2, 16 * this.fontSize + 30, 0x8000, 16, 16);

    this.drawControl(2, 32 * this.fontSize + 60);

    this.drawFlags(400, 2);
    this.drawRegisters(450, 2);

    this.drawAsmCode(400, 130);
  }
}

export default TestScreen;
