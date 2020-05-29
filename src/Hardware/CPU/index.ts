// Implementation 6502 CPU

import {
  LOWER_8_BIT,
  HIGH_8_BIT,
  getSigned8Number,
  isNegative8Number,
  create16Number,
  getUnsigned16Number,
} from '../../utils/number';
import { toStringWithBase } from '../../utils/string';
import Bus from '../Bus';

export type IFlag = 'C' | 'Z' | 'I' | 'D' | 'B' | 'U' | 'V' | 'N';
export interface IFlags {
  C: number;
  Z: number;
  I: number;
  D: number;
  B: number;
  U: number;
  V: number;
  N: number;
}

interface IInstruction {
  name: string;
  opcode: Function;
  addrMode: Function;
  cycles: number;
}

type IOpcodeMatrix = IInstruction[];

const STACK_START_RANGE = 0x0100;

class CPU {
  accumulator = 0x00;
  xRegister = 0x00;
  yRegister = 0x00;
  stackPointer = 0x00;
  programCounter = 0x0000;
  statusRegister = 0x00;
  isCompleteCycle = false;

  private bus: Bus | null = null;

  private readonly FLAGS: IFlags = {
    C: 1 << 0, // Carry Bit
    Z: 1 << 1, // Zero
    I: 1 << 2, // Disable Interrupts
    D: 1 << 3, // Decimal Mode
    B: 1 << 4, // Break
    U: 1 << 5, // Unused
    V: 1 << 6, // Overflow
    N: 1 << 7, // Negative
  };

  private fetched = 0x00;
  private addrAbs = 0x0000;
  private addrRel = 0x0000;
  private opcode = 0x00; // instruction bit
  private cycles = 0; // cycles count

  /* eslint-disable */
  /* prettier-ignore */
  private readonly opcodeMatrix: IOpcodeMatrix = [
    { name: 'BRK', opcode: this.BRK, addrMode: this.IMP, cycles: 7 }, { name: 'ORA', opcode: this.ORA, addrMode: this.IZX, cycles: 6 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'SLO', opcode: this.SLO, addrMode: this.IZX, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZP0, cycles: 3 }, { name: 'ORA', opcode: this.ORA, addrMode: this.ZP0, cycles: 3 }, { name: 'ASL', opcode: this.ASL, addrMode: this.ZP0, cycles: 5 }, { name: 'SLO', opcode: this.SLO, addrMode: this.ZP0, cycles: 5 }, { name: 'PHP', opcode: this.PHP, addrMode: this.IMP, cycles: 3 }, { name: 'ORA', opcode: this.ORA, addrMode: this.IMM, cycles: 2 }, { name: 'ASL', opcode: this.ASL, addrMode: this.IMP, cycles: 2 }, { name: 'ANC', opcode: this.ANC, addrMode: this.IMM, cycles: 2 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ABS, cycles: 4 }, { name: 'ORA', opcode: this.ORA, addrMode: this.ABS, cycles: 4 }, { name: 'ASL', opcode: this.ASL, addrMode: this.ABS, cycles: 6 }, { name: 'SLO', opcode: this.SLO, addrMode: this.ABS, cycles: 6 },
    { name: 'BPL', opcode: this.BPL, addrMode: this.REL, cycles: 2 }, { name: 'ORA', opcode: this.ORA, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'SLO', opcode: this.SLO, addrMode: this.IZY, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZPX, cycles: 4 }, { name: 'ORA', opcode: this.ORA, addrMode: this.ZPX, cycles: 4 }, { name: 'ASL', opcode: this.ASL, addrMode: this.ZPX, cycles: 6 }, { name: 'SLO', opcode: this.SLO, addrMode: this.ZPX, cycles: 6 }, { name: 'CLC', opcode: this.CLC, addrMode: this.IMP, cycles: 2 }, { name: 'ORA', opcode: this.ORA, addrMode: this.ABY, cycles: 4 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'SLO', opcode: this.SLO, addrMode: this.ABY, cycles: 7 }, { name: 'BRK', opcode: this.NOP, addrMode: this.ABX, cycles: 4 }, { name: 'ORA', opcode: this.ORA, addrMode: this.ABX, cycles: 4 }, { name: 'ASL', opcode: this.ASL, addrMode: this.ABX, cycles: 7 }, { name: 'SLO', opcode: this.SLO, addrMode: this.ABX, cycles: 7 },
    { name: 'JSR', opcode: this.JSR, addrMode: this.ABS, cycles: 6 }, { name: 'AND', opcode: this.AND, addrMode: this.IZX, cycles: 6 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'RLA', opcode: this.RLA, addrMode: this.IZX, cycles: 8 }, { name: 'BIT', opcode: this.BIT, addrMode: this.ZP0, cycles: 3 }, { name: 'AND', opcode: this.AND, addrMode: this.ZP0, cycles: 3 }, { name: 'ROL', opcode: this.ROL, addrMode: this.ZP0, cycles: 5 }, { name: 'RLA', opcode: this.RLA, addrMode: this.ZP0, cycles: 5 }, { name: 'PLP', opcode: this.PLP, addrMode: this.IMP, cycles: 4 }, { name: 'AND', opcode: this.AND, addrMode: this.IMM, cycles: 2 }, { name: 'ROL', opcode: this.ROL, addrMode: this.IMP, cycles: 2 }, { name: 'ANC', opcode: this.ANC, addrMode: this.IMM, cycles: 2 }, { name: 'BIT', opcode: this.BIT, addrMode: this.ABS, cycles: 4 }, { name: 'AND', opcode: this.AND, addrMode: this.ABS, cycles: 4 }, { name: 'ROL', opcode: this.ROL, addrMode: this.ABS, cycles: 6 }, { name: 'RLA', opcode: this.RLA, addrMode: this.ABS, cycles: 6 },
    { name: 'BMI', opcode: this.BMI, addrMode: this.REL, cycles: 2 }, { name: 'AND', opcode: this.AND, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'RLA', opcode: this.RLA, addrMode: this.IZY, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZPX, cycles: 4 }, { name: 'AND', opcode: this.AND, addrMode: this.ZPX, cycles: 4 }, { name: 'ROL', opcode: this.ROL, addrMode: this.ZPX, cycles: 6 }, { name: 'RLA', opcode: this.RLA, addrMode: this.ZPX, cycles: 6 }, { name: 'SEC', opcode: this.SEC, addrMode: this.IMP, cycles: 2 }, { name: 'AND', opcode: this.AND, addrMode: this.ABY, cycles: 4 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'RLA', opcode: this.RLA, addrMode: this.ABY, cycles: 7 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ABX, cycles: 4 }, { name: 'AND', opcode: this.AND, addrMode: this.ABX, cycles: 4 }, { name: 'ROL', opcode: this.ROL, addrMode: this.ABX, cycles: 7 }, { name: 'RLA', opcode: this.RLA, addrMode: this.ABX, cycles: 7 },
    { name: 'RTI', opcode: this.RTI, addrMode: this.IMP, cycles: 6 }, { name: 'EOR', opcode: this.EOR, addrMode: this.IZX, cycles: 6 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'SRE', opcode: this.SRE, addrMode: this.IZX, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZP0, cycles: 3 }, { name: 'EOR', opcode: this.EOR, addrMode: this.ZP0, cycles: 3 }, { name: 'LSR', opcode: this.LSR, addrMode: this.ZP0, cycles: 5 }, { name: 'SRE', opcode: this.SRE, addrMode: this.ZP0, cycles: 5 }, { name: 'PHA', opcode: this.PHA, addrMode: this.IMP, cycles: 3 }, { name: 'EOR', opcode: this.EOR, addrMode: this.IMM, cycles: 2 }, { name: 'LSR', opcode: this.LSR, addrMode: this.IMP, cycles: 2 }, { name: 'ALR', opcode: this.ALR, addrMode: this.IMM, cycles: 2 }, { name: 'JMP', opcode: this.JMP, addrMode: this.ABS, cycles: 3 }, { name: 'EOR', opcode: this.EOR, addrMode: this.ABS, cycles: 4 }, { name: 'LSR', opcode: this.LSR, addrMode: this.ABS, cycles: 6 }, { name: 'SRE', opcode: this.SRE, addrMode: this.ABS, cycles: 6 },
    { name: 'BVC', opcode: this.BVC, addrMode: this.REL, cycles: 2 }, { name: 'EOR', opcode: this.EOR, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'SRE', opcode: this.SRE, addrMode: this.IZY, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZPX, cycles: 4 }, { name: 'EOR', opcode: this.EOR, addrMode: this.ZPX, cycles: 4 }, { name: 'LSR', opcode: this.LSR, addrMode: this.ZPX, cycles: 6 }, { name: 'SRE', opcode: this.SRE, addrMode: this.ZPX, cycles: 6 }, { name: 'CLI', opcode: this.CLI, addrMode: this.IMP, cycles: 2 }, { name: 'EOR', opcode: this.EOR, addrMode: this.ABY, cycles: 4 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'SRE', opcode: this.SRE, addrMode: this.ABY, cycles: 7 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ABX, cycles: 4 }, { name: 'EOR', opcode: this.EOR, addrMode: this.ABX, cycles: 4 }, { name: 'LSR', opcode: this.LSR, addrMode: this.ABX, cycles: 7 }, { name: 'SRE', opcode: this.SRE, addrMode: this.ABX, cycles: 7 },
    { name: 'RTS', opcode: this.RTS, addrMode: this.IMP, cycles: 6 }, { name: 'ADC', opcode: this.ADC, addrMode: this.IZX, cycles: 6 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'RRA', opcode: this.RRA, addrMode: this.IZX, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZP0, cycles: 3 }, { name: 'ADC', opcode: this.ADC, addrMode: this.ZP0, cycles: 3 }, { name: 'ROR', opcode: this.ROR, addrMode: this.ZP0, cycles: 5 }, { name: 'RRA', opcode: this.RRA, addrMode: this.ZP0, cycles: 5 }, { name: 'PLA', opcode: this.PLA, addrMode: this.IMP, cycles: 4 }, { name: 'ADC', opcode: this.ADC, addrMode: this.IMM, cycles: 2 }, { name: 'ROR', opcode: this.ROR, addrMode: this.IMP, cycles: 2 }, { name: 'ARR', opcode: this.ARR, addrMode: this.IMM, cycles: 2 }, { name: 'JMP', opcode: this.JMP, addrMode: this.IND, cycles: 5 }, { name: 'ADC', opcode: this.ADC, addrMode: this.ABS, cycles: 4 }, { name: 'ROR', opcode: this.ROR, addrMode: this.ABS, cycles: 6 }, { name: 'RRA', opcode: this.RRA, addrMode: this.ABS, cycles: 6 },
    { name: 'BVS', opcode: this.BVS, addrMode: this.REL, cycles: 2 }, { name: 'ADC', opcode: this.ADC, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'RRA', opcode: this.RRA, addrMode: this.IZY, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZPX, cycles: 4 }, { name: 'ADC', opcode: this.ADC, addrMode: this.ZPX, cycles: 4 }, { name: 'ROR', opcode: this.ROR, addrMode: this.ZPX, cycles: 6 }, { name: 'RRA', opcode: this.RRA, addrMode: this.ZPX, cycles: 6 }, { name: 'SEI', opcode: this.SEI, addrMode: this.IMP, cycles: 2 }, { name: 'ADC', opcode: this.ADC, addrMode: this.ABY, cycles: 4 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'RRA', opcode: this.RRA, addrMode: this.ABY, cycles: 7 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ABX, cycles: 4 }, { name: 'ADC', opcode: this.ADC, addrMode: this.ABX, cycles: 4 }, { name: 'ROR', opcode: this.ROR, addrMode: this.ABX, cycles: 7 }, { name: 'RRA', opcode: this.RRA, addrMode: this.ABX, cycles: 7 },
    { name: 'NOP', opcode: this.NOP, addrMode: this.IMM, cycles: 2 }, { name: 'STA', opcode: this.STA, addrMode: this.IZX, cycles: 6 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMM, cycles: 2 }, { name: 'SAX', opcode: this.SAX, addrMode: this.IZX, cycles: 6 }, { name: 'STY', opcode: this.STY, addrMode: this.ZP0, cycles: 3 }, { name: 'STA', opcode: this.STA, addrMode: this.ZP0, cycles: 3 }, { name: 'STX', opcode: this.STX, addrMode: this.ZP0, cycles: 3 }, { name: 'SAX', opcode: this.SAX, addrMode: this.ZP0, cycles: 3 }, { name: 'DEY', opcode: this.DEY, addrMode: this.IMP, cycles: 2 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMM, cycles: 2 }, { name: 'TXA', opcode: this.TXA, addrMode: this.IMP, cycles: 2 }, { name: 'XAA', opcode: this.XAA2, addrMode: this.IMM, cycles: 2 }, { name: 'STY', opcode: this.STY, addrMode: this.ABS, cycles: 4 }, { name: 'STA', opcode: this.STA, addrMode: this.ABS, cycles: 4 }, { name: 'STX', opcode: this.STX, addrMode: this.ABS, cycles: 4 }, { name: 'SAX', opcode: this.SAX, addrMode: this.ABS, cycles: 4 },
    { name: 'BCC', opcode: this.BCC, addrMode: this.REL, cycles: 2 }, { name: 'STA', opcode: this.STA, addrMode: this.IZY, cycles: 6 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'AHX', opcode: this.AHX1, addrMode: this.IZY, cycles: 6 }, { name: 'STY', opcode: this.STY, addrMode: this.ZPX, cycles: 4 }, { name: 'STA', opcode: this.STA, addrMode: this.ZPX, cycles: 4 }, { name: 'STX', opcode: this.STX, addrMode: this.ZPY, cycles: 4 }, { name: 'SAX', opcode: this.SAX, addrMode: this.ZPY, cycles: 4 }, { name: 'TYA', opcode: this.TYA, addrMode: this.IMP, cycles: 2 }, { name: 'STA', opcode: this.STA, addrMode: this.ABY, cycles: 5 }, { name: 'TXS', opcode: this.TXS, addrMode: this.IMP, cycles: 2 }, { name: 'TAS', opcode: this.TAS1, addrMode: this.ABY, cycles: 5 }, { name: 'SHY', opcode: this.SHY1, addrMode: this.ABX, cycles: 5 }, { name: 'STA', opcode: this.STA, addrMode: this.ABX, cycles: 5 }, { name: 'SHX', opcode: this.SHX1, addrMode: this.ABY, cycles: 5 }, { name: 'AHX', opcode: this.AHX1, addrMode: this.ABY, cycles: 5 },
    { name: 'LDY', opcode: this.LDY, addrMode: this.IMM, cycles: 2 }, { name: 'LDA', opcode: this.LDA, addrMode: this.IZX, cycles: 6 }, { name: 'LDX', opcode: this.LDX, addrMode: this.IMM, cycles: 2 }, { name: 'LAX', opcode: this.LAX, addrMode: this.IZX, cycles: 6 }, { name: 'LDY', opcode: this.LDY, addrMode: this.ZP0, cycles: 3 }, { name: 'LDA', opcode: this.LDA, addrMode: this.ZP0, cycles: 3 }, { name: 'LDX', opcode: this.LDX, addrMode: this.ZP0, cycles: 3 }, { name: 'LAX', opcode: this.LAX, addrMode: this.ZP0, cycles: 3 }, { name: 'TAY', opcode: this.TAY, addrMode: this.IMP, cycles: 2 }, { name: 'LDA', opcode: this.LDA, addrMode: this.IMM, cycles: 2 }, { name: 'TAX', opcode: this.TAX, addrMode: this.IMP, cycles: 2 }, { name: 'LAX', opcode: this.LAX2, addrMode: this.IMM, cycles: 2 }, { name: 'LDY', opcode: this.LDY, addrMode: this.ABS, cycles: 4 }, { name: 'LDA', opcode: this.LDA, addrMode: this.ABS, cycles: 4 }, { name: 'LDX', opcode: this.LDX, addrMode: this.ABS, cycles: 4 }, { name: 'LAX', opcode: this.LAX, addrMode: this.ABS, cycles: 4 },
    { name: 'BCS', opcode: this.BCS, addrMode: this.REL, cycles: 2 }, { name: 'LDA', opcode: this.LDA, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'LAX', opcode: this.LAX, addrMode: this.IZY, cycles: 5 }, { name: 'LDY', opcode: this.LDY, addrMode: this.ZPX, cycles: 4 }, { name: 'LDA', opcode: this.LDA, addrMode: this.ZPX, cycles: 4 }, { name: 'LDX', opcode: this.LDX, addrMode: this.ZPY, cycles: 4 }, { name: 'LAX', opcode: this.LAX, addrMode: this.ZPY, cycles: 4 }, { name: 'CLV', opcode: this.CLV, addrMode: this.IMP, cycles: 2 }, { name: 'LDA', opcode: this.LDA, addrMode: this.ABY, cycles: 4 }, { name: 'TSX', opcode: this.TSX, addrMode: this.IMP, cycles: 2 }, { name: 'LAS', opcode: this.LAS, addrMode: this.ABY, cycles: 4 }, { name: 'LDY', opcode: this.LDY, addrMode: this.ABX, cycles: 4 }, { name: 'LDA', opcode: this.LDA, addrMode: this.ABX, cycles: 4 }, { name: 'LDX', opcode: this.LDA, addrMode: this.ABX, cycles: 4 }, { name: 'LAX', opcode: this.LAX, addrMode: this.ABY, cycles: 4 },
    { name: 'CPY', opcode: this.CPY, addrMode: this.IMM, cycles: 2 }, { name: 'CMP', opcode: this.CMP, addrMode: this.IZX, cycles: 6 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMM, cycles: 2 }, { name: 'DCP', opcode: this.DCP, addrMode: this.IZX, cycles: 8 }, { name: 'CPY', opcode: this.CPY, addrMode: this.ZP0, cycles: 3 }, { name: 'CMP', opcode: this.CMP, addrMode: this.ZP0, cycles: 3 }, { name: 'DEC', opcode: this.DEC, addrMode: this.ZP0, cycles: 5 }, { name: 'DCP', opcode: this.DCP, addrMode: this.ZP0, cycles: 5 }, { name: 'INY', opcode: this.INY, addrMode: this.IMP, cycles: 2 }, { name: 'CMP', opcode: this.CMP, addrMode: this.IMM, cycles: 2 }, { name: 'DEX', opcode: this.DEX, addrMode: this.IMP, cycles: 2 }, { name: 'AXS', opcode: this.AXS, addrMode: this.IMM, cycles: 2 }, { name: 'CPY', opcode: this.CPY, addrMode: this.ABS, cycles: 4 }, { name: 'CMP', opcode: this.CMP, addrMode: this.ABS, cycles: 4 }, { name: 'DEC', opcode: this.DEC, addrMode: this.ABS, cycles: 6 }, { name: 'DCP', opcode: this.DCP, addrMode: this.ABS, cycles: 6 },
    { name: 'BNE', opcode: this.BNE, addrMode: this.REL, cycles: 2 }, { name: 'CMP', opcode: this.CMP, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'DCP', opcode: this.DCP, addrMode: this.IZY, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZPX, cycles: 4 }, { name: 'CMP', opcode: this.CMP, addrMode: this.ZPX, cycles: 4 }, { name: 'DEC', opcode: this.DEC, addrMode: this.ZPX, cycles: 6 }, { name: 'DCP', opcode: this.DCP, addrMode: this.ZPX, cycles: 6 }, { name: 'CLD', opcode: this.CLD, addrMode: this.IMP, cycles: 2 }, { name: 'CMP', opcode: this.CMP, addrMode: this.ABY, cycles: 4 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'DCP', opcode: this.DCP, addrMode: this.ABY, cycles: 7 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ABX, cycles: 4 }, { name: 'CMP', opcode: this.CMP, addrMode: this.ABX, cycles: 4 }, { name: 'DEC', opcode: this.DEC, addrMode: this.ABX, cycles: 7 }, { name: 'DCP', opcode: this.DCP, addrMode: this.ABX, cycles: 7 },
    { name: 'CPX', opcode: this.CPX, addrMode: this.IMM, cycles: 2 }, { name: 'SBC', opcode: this.SBC, addrMode: this.IZX, cycles: 6 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMM, cycles: 2 }, { name: 'ISC', opcode: this.ISC, addrMode: this.IZX, cycles: 8 }, { name: 'CPX', opcode: this.CPX, addrMode: this.ZP0, cycles: 3 }, { name: 'SBC', opcode: this.SBC, addrMode: this.ZP0, cycles: 3 }, { name: 'INC', opcode: this.INC, addrMode: this.ZP0, cycles: 5 }, { name: 'ISC', opcode: this.ISC, addrMode: this.ZP0, cycles: 5 }, { name: 'INX', opcode: this.INX, addrMode: this.IMP, cycles: 2 }, { name: 'SBC', opcode: this.SBC, addrMode: this.IMM, cycles: 2 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'SBC', opcode: this.SBC, addrMode: this.IMM, cycles: 2 }, { name: 'CPX', opcode: this.CPX, addrMode: this.ABS, cycles: 4 }, { name: 'SBC', opcode: this.SBC, addrMode: this.ABS, cycles: 4 }, { name: 'INC', opcode: this.INC, addrMode: this.ABS, cycles: 6 }, { name: 'ISC', opcode: this.ISC, addrMode: this.ABS, cycles: 6 },
    { name: 'BEQ', opcode: this.BEQ, addrMode: this.REL, cycles: 2 }, { name: 'SBC', opcode: this.SBC, addrMode: this.IZY, cycles: 5 }, { name: 'KIL', opcode: this.KIL, addrMode: this.IMP, cycles: 2 }, { name: 'ISC', opcode: this.ISC, addrMode: this.IZY, cycles: 8 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ZPX, cycles: 4 }, { name: 'SBC', opcode: this.SBC, addrMode: this.ZPX, cycles: 4 }, { name: 'INC', opcode: this.INC, addrMode: this.ZPX, cycles: 6 }, { name: 'ISC', opcode: this.ISC, addrMode: this.ZPX, cycles: 6 }, { name: 'SED', opcode: this.SED, addrMode: this.IMP, cycles: 2 }, { name: 'SBC', opcode: this.SBC, addrMode: this.ABY, cycles: 4 }, { name: 'NOP', opcode: this.NOP, addrMode: this.IMP, cycles: 2 }, { name: 'ISC', opcode: this.ISC, addrMode: this.ABY, cycles: 7 }, { name: 'NOP', opcode: this.NOP, addrMode: this.ABX, cycles: 4 }, { name: 'SBC', opcode: this.SBC, addrMode: this.ABX, cycles: 4 }, { name: 'INC', opcode: this.INC, addrMode: this.ABX, cycles: 7 }, { name: 'ISC', opcode: this.ISC, addrMode: this.ABX, cycles: 7 },
  ];
  /* eslint-enable */

  disassemble(start16n: number, stop16n: number): string[] {
    if (!this.bus) {
      throw Error('BUS is not connected');
    }

    let addr = start16n;

    const instructions = [];

    while (addr <= stop16n) {
      const lineAddr = addr;

      const opcodeIdx = this.bus.read(addr, true);

      const currentOpcode = this.opcodeMatrix[opcodeIdx];

      let instruction = `$${toStringWithBase(addr, 16, 4)}: ${
        currentOpcode.name
      } `;
      addr++;

      switch (currentOpcode.addrMode.name) {
        case 'IMP': {
          instruction += '{IMP}';
          break;
        }
        case 'IMM': {
          const value = this.bus.read(addr, true);
          addr++;
          const strValue = toStringWithBase(value, 16, 2).toUpperCase();

          instruction += `#$${strValue} {IMM}`;
          break;
        }
        case 'ZP0': {
          const lo = this.bus.read(addr, true);
          addr++;
          const strValue = toStringWithBase(lo, 16, 2).toUpperCase();

          instruction += `$${strValue} {ZP0}`;
          break;
        }
        case 'ZPX': {
          const lo = this.bus.read(addr, true);
          addr++;
          const strValue = toStringWithBase(lo, 16, 2).toUpperCase();

          instruction += `$${strValue}, X {ZPX}`;
          break;
        }
        case 'ZPY': {
          const lo = this.bus.read(addr, true);
          addr++;
          const strValue = toStringWithBase(lo, 16, 2).toUpperCase();

          instruction += `$${strValue}, Y {ZPY}`;
          break;
        }
        case 'IZX': {
          const lo = this.bus.read(addr, true);
          addr++;
          const strValue = toStringWithBase(lo, 16, 2).toUpperCase();

          instruction += `($${strValue}, X) {IZX}`;
          break;
        }
        case 'IZY': {
          const lo = this.bus.read(addr, true);
          addr++;
          const strValue = toStringWithBase(lo, 16, 2).toUpperCase();

          instruction += `($${strValue}, Y) {IZY}`;
          break;
        }
        case 'ABS': {
          const lo = this.bus.read(addr, true);
          addr++;
          const hi = this.bus.read(addr, true);
          addr++;

          const n16 = create16Number(hi, lo);
          const strValue = toStringWithBase(n16, 16, 4).toUpperCase();

          instruction += `$${strValue} {ABS}`;
          break;
        }
        case 'ABX': {
          const lo = this.bus.read(addr, true);
          addr++;
          const hi = this.bus.read(addr, true);
          addr++;

          const n16 = create16Number(hi, lo);
          const strValue = toStringWithBase(n16, 16, 4).toUpperCase();

          instruction += `$${strValue}, X {ABX}`;
          break;
        }
        case 'ABY': {
          const lo = this.bus.read(addr, true);
          addr++;
          const hi = this.bus.read(addr, true);
          addr++;

          const n16 = create16Number(hi, lo);
          const strValue = toStringWithBase(n16, 16, 4).toUpperCase();

          instruction += `$${strValue}, Y {ABY}`;
          break;
        }
        case 'IND': {
          const lo = this.bus.read(addr, true);
          addr++;
          const hi = this.bus.read(addr, true);
          addr++;

          const n16 = create16Number(hi, lo);
          const strValue = toStringWithBase(n16, 16, 4).toUpperCase();

          instruction += `($${strValue}) {IND}`;
          break;
        }
        case 'REL': {
          const value = this.bus.read(addr, true);
          addr++;

          const value16n = value | HIGH_8_BIT;
          const result16n = getUnsigned16Number(addr + value16n);

          const strValue = toStringWithBase(value, 16, 2).toUpperCase();
          const strAddr = toStringWithBase(result16n, 16, 4).toUpperCase();

          instruction += `$${strValue} [$${strAddr}] {REL}`;
          break;
        }
      }

      instructions[lineAddr] = instruction;
    }

    return instructions.filter(line => line);
  }

  connectBus(bus: Bus): void {
    this.bus = bus;
  }

  // I/O
  write(addr: number, data: number): void {
    if (this.bus) {
      this.bus.write(addr, data);
    }
  }
  read(addr: number): number {
    if (this.bus) {
      return this.bus.read(addr, false);
    }

    return 0;
  }

  // Flags
  // get secific bit of statusRegister
  getFlag(flagKey: keyof IFlags): number {
    const flag = this.FLAGS[flagKey];

    return (this.statusRegister & flag) > 0 ? 1 : 0;
  }
  // set secific bit of statusRegister
  setFlag(flagKey: keyof IFlags, value: boolean): void {
    const flag = this.FLAGS[flagKey];

    if (value) {
      this.statusRegister |= flag;
    } else {
      this.statusRegister &= ~flag;
    }
  }

  // Addressing Modes
  IMP(): number {
    this.fetched = this.accumulator;

    return 0;
  }
  ZP0(): number {
    this.addrAbs = this.read(this.programCounter);
    this.programCounter++;
    this.addrAbs &= LOWER_8_BIT;

    return 0;
  }
  ZPX(): number {
    const xCounter = this.programCounter + this.xRegister;
    this.addrAbs = this.read(xCounter);
    this.programCounter++;
    this.addrAbs &= LOWER_8_BIT;

    return 0;
  }
  ZPY(): number {
    const yCounter = this.programCounter + this.yRegister;
    this.addrAbs = this.read(yCounter);
    this.programCounter++;
    this.addrAbs &= LOWER_8_BIT;

    return 0;
  }
  ABS(): number {
    const lo = this.read(this.programCounter);
    this.programCounter++;

    const hi = this.read(this.programCounter);
    this.programCounter++;

    this.addrAbs = create16Number(hi, lo);

    return 0;
  }
  ABX(): number {
    const lo = this.read(this.programCounter);
    this.programCounter++;

    const hi = this.read(this.programCounter);
    this.programCounter++;

    this.addrAbs = create16Number(hi, lo);
    this.addrAbs += this.xRegister;

    if ((this.addrAbs & HIGH_8_BIT) !== hi << 8) {
      return 1;
    }

    return 0;
  }
  ABY(): number {
    const lo = this.read(this.programCounter);
    this.programCounter++;

    const hi = this.read(this.programCounter);
    this.programCounter++;

    this.addrAbs = create16Number(hi, lo);
    this.addrAbs += this.yRegister;

    // page boundary
    if ((this.addrAbs & HIGH_8_BIT) !== hi << 8) {
      return 1;
    }

    return 0;
  }
  IMM(): number {
    this.addrAbs = this.programCounter++;

    return 0;
  }
  REL(): number {
    this.addrRel = this.read(this.programCounter);
    this.programCounter++;

    if (isNegative8Number(this.addrRel)) {
      this.addrRel |= HIGH_8_BIT;
    }

    return 0;
  }
  IND(): number {
    const ptrHi = this.read(this.programCounter);
    this.programCounter++;

    const ptrLo = this.read(this.programCounter);
    this.programCounter++;

    const ptr = create16Number(ptrHi, ptrLo);

    const addrHi = this.read(ptr + 1) << 8;
    const addrLo = this.read(ptr);

    // its hardware bug in 6502 CPU
    if (ptrLo === LOWER_8_BIT) {
      this.addrAbs = create16Number(this.read(ptr & HIGH_8_BIT), addrLo);

      return 0;
    }

    this.addrAbs = addrHi | addrLo;

    return 0;
  }
  IZX(): number {
    const zeroPageOffset = this.read(this.programCounter);
    this.programCounter++;

    const addrHiOffset = zeroPageOffset + this.xRegister + 1;
    const addrLoOffset = zeroPageOffset + this.xRegister + 1;

    const addrHi = this.read(addrHiOffset & LOWER_8_BIT);
    const addrLo = this.read(addrLoOffset & LOWER_8_BIT);

    this.addrAbs = create16Number(addrHi, addrLo);

    return 0;
  }
  IZY(): number {
    const zeroPageOffset = this.read(this.programCounter);
    this.programCounter++;

    const addrHi = this.read((zeroPageOffset + 1) & LOWER_8_BIT);
    const addrLo = this.read(zeroPageOffset & LOWER_8_BIT);

    const addr = create16Number(addrHi, addrLo);

    this.addrAbs = addr + this.yRegister;

    // page boundary
    if ((this.addrAbs & HIGH_8_BIT) !== addrHi << 8) {
      return 1;
    }

    return 0;
  }

  // Opcodes:
  // Logical and arithmetic commands:
  ORA(): number {
    const fetched = this.fetch();

    this.accumulator = this.accumulator | fetched;

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 1;
  }
  AND(): number {
    const fetched = this.fetch();

    this.accumulator = this.accumulator & fetched;

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 1;
  }
  EOR(): number {
    const fetched = this.fetch();

    this.accumulator = this.accumulator ^ fetched;

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 1;
  }
  ADC(): number {
    const fetched = this.fetch();
    const cFlag = this.getFlag('C');

    const sum = this.accumulator + fetched + cFlag;

    this.setFlag('C', Boolean(sum & HIGH_8_BIT));
    this.setFlag('Z', (sum & LOWER_8_BIT) === 0);
    this.setFlag('N', isNegative8Number(sum));

    const signedFetchedNumber = getSigned8Number(fetched);
    const signedAccNumber = getSigned8Number(this.accumulator);
    const signedSum = getSigned8Number(sum);

    let isOverflow = false;

    // Overflow set in 2 cases:
    // 1. postive acc and fetching, but negative result
    if (signedFetchedNumber > 0 && signedAccNumber > 0 && signedSum < 0) {
      isOverflow = true;
    }
    // 2. negative acc and fetching, but positive result
    if (signedFetchedNumber < 0 && signedAccNumber < 0 && signedSum > 0) {
      isOverflow = true;
    }

    this.setFlag('V', isOverflow);

    this.accumulator = sum & LOWER_8_BIT;

    return 1;
  }
  SBC(): number {
    const fetched = this.fetch();
    const negativeFetched = fetched ^ LOWER_8_BIT;

    const cFlag = this.getFlag('C');

    const sum = this.accumulator + negativeFetched + cFlag;

    this.setFlag('C', Boolean(sum & HIGH_8_BIT));
    this.setFlag('Z', (sum & LOWER_8_BIT) === 0);
    this.setFlag('N', isNegative8Number(sum));

    const isOverflow = Boolean(
      (sum ^ this.accumulator) & (sum ^ negativeFetched) & 0x0080,
    );

    this.setFlag('V', isOverflow);

    this.accumulator = sum & LOWER_8_BIT;

    return 1;
  }
  CMP(): number {
    const fetched = this.fetch();

    const result16n = this.accumulator - fetched;
    const result8n = result16n & LOWER_8_BIT;

    this.setFlag('C', this.accumulator >= fetched);
    this.setFlag('Z', result8n === 0x00);
    this.setFlag('N', isNegative8Number(result8n));

    return 1;
  }
  CPX(): number {
    const fetched = this.fetch();

    const result16n = this.xRegister - fetched;
    const result8n = result16n & LOWER_8_BIT;

    this.setFlag('C', this.xRegister >= fetched);
    this.setFlag('Z', result8n === 0x00);
    this.setFlag('N', isNegative8Number(result8n));

    return 0;
  }
  CPY(): number {
    const fetched = this.fetch();

    const result16n = this.yRegister - fetched;
    const result8n = result16n & LOWER_8_BIT;

    this.setFlag('C', this.yRegister >= fetched);
    this.setFlag('Z', result8n === 0x00);
    this.setFlag('N', isNegative8Number(result8n));

    return 0;
  }
  DEC(): number {
    const fetched = this.fetch();

    const dec16n = fetched - 1;
    const dec8n = dec16n && LOWER_8_BIT;

    this.write(this.addrAbs, dec8n);

    this.setFlag('Z', dec8n === 0x00);
    this.setFlag('N', isNegative8Number(dec8n));

    return 0;
  }
  DEX(): number {
    this.xRegister--;

    this.setFlag('Z', this.xRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.xRegister));

    return 0;
  }
  DEY(): number {
    this.yRegister--;

    this.setFlag('Z', this.yRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.yRegister));

    return 0;
  }
  INC(): number {
    const fetched = this.fetch();
    const result16n = fetched + 1;
    const result8n = result16n & LOWER_8_BIT;

    this.write(this.addrAbs, result8n);

    this.setFlag('Z', result8n === 0x00);
    this.setFlag('N', isNegative8Number(result8n));

    return 0;
  }
  INX(): number {
    this.xRegister = this.xRegister + 1;

    this.setFlag('Z', this.xRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.xRegister));

    return 0;
  }
  INY(): number {
    this.yRegister = this.yRegister + 1;

    this.setFlag('Z', this.yRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.yRegister));

    return 0;
  }
  ASL(): number {
    const fetched = this.fetch();
    const result16n = fetched << 1;
    const resultHi8n = result16n & HIGH_8_BIT;
    const resultLo8n = result16n & LOWER_8_BIT;

    this.setFlag('C', resultHi8n > 0);
    this.setFlag('Z', resultLo8n === 0x00);
    this.setFlag('N', isNegative8Number(resultLo8n));

    const currentInstruction = this.opcodeMatrix[this.opcode];

    if (currentInstruction.addrMode.name === 'IMP') {
      this.accumulator = resultLo8n;
      return 0;
    }

    this.write(this.addrAbs, resultLo8n);

    return 0;
  }
  LSR(): number {
    const fetched = this.fetch();
    const result16n = fetched >> 1;
    const resultLo8n = result16n & LOWER_8_BIT;

    this.setFlag('C', Boolean(fetched & 0x0001));
    this.setFlag('Z', resultLo8n === 0x00);
    this.setFlag('N', isNegative8Number(resultLo8n));

    const currentInstruction = this.opcodeMatrix[this.opcode];

    if (currentInstruction.addrMode.name === 'IMP') {
      this.accumulator = resultLo8n;
      return 0;
    }

    this.write(this.addrAbs, resultLo8n);

    return 0;
  }
  ROL(): number {
    const fetched = this.fetch();
    const result16n = (fetched << 1) | this.getFlag('C');
    const resultHi8n = result16n & HIGH_8_BIT;
    const resultLo8n = result16n & LOWER_8_BIT;

    this.setFlag('C', resultHi8n > 0);
    this.setFlag('Z', resultLo8n === 0x00);
    this.setFlag('N', isNegative8Number(resultLo8n));

    const currentInstruction = this.opcodeMatrix[this.opcode];

    if (currentInstruction.addrMode.name === 'IMP') {
      this.accumulator = resultLo8n;
      return 0;
    }

    this.write(this.addrAbs, resultLo8n);

    return 0;
  }
  ROR(): number {
    const fetched = this.fetch();
    const result16n = (this.getFlag('C') << 7) | (fetched >> 1);
    const resultLo8n = result16n & LOWER_8_BIT;

    this.setFlag('C', Boolean(fetched & 0x0001));
    this.setFlag('Z', resultLo8n === 0x00);
    this.setFlag('N', isNegative8Number(resultLo8n));

    const currentInstruction = this.opcodeMatrix[this.opcode];

    if (currentInstruction.addrMode.name === 'IMP') {
      this.accumulator = resultLo8n;
      return 0;
    }

    this.write(this.addrAbs, resultLo8n);

    return 0;
  }
  // Move commands:
  LDA(): number {
    const fetched = this.fetch();

    this.accumulator = fetched;

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 1;
  }
  STA(): number {
    const fetched = this.fetch();

    this.write(fetched, this.accumulator);

    return 0;
  }
  LDX(): number {
    const fetched = this.fetch();

    this.xRegister = fetched;

    this.setFlag('Z', this.xRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.xRegister));

    return 1;
  }
  LDY(): number {
    const fetched = this.fetch();

    this.yRegister = fetched;

    this.setFlag('Z', this.yRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.yRegister));

    return 1;
  }
  STX(): number {
    this.write(this.addrAbs, this.xRegister);

    return 0;
  }
  STY(): number {
    this.write(this.addrAbs, this.yRegister);

    return 0;
  }
  TAX(): number {
    this.xRegister = this.accumulator;

    this.setFlag('Z', this.xRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.xRegister));

    return 0;
  }
  TAY(): number {
    this.yRegister = this.accumulator;

    this.setFlag('Z', this.yRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.yRegister));

    return 0;
  }
  TXA(): number {
    this.accumulator = this.xRegister;

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 0;
  }
  TYA(): number {
    this.accumulator = this.yRegister;

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 0;
  }
  TSX(): number {
    this.xRegister = this.stackPointer;

    this.setFlag('Z', this.xRegister === 0x00);
    this.setFlag('N', isNegative8Number(this.xRegister));

    return 0;
  }
  TXS(): number {
    this.stackPointer = this.xRegister;

    return 0;
  }
  PLA(): number {
    this.stackPointer++;
    this.accumulator = this.read(STACK_START_RANGE + this.stackPointer);

    this.setFlag('Z', this.accumulator === 0x00);
    this.setFlag('N', isNegative8Number(this.accumulator));

    return 0;
  }
  PHA(): number {
    this.write(STACK_START_RANGE + this.stackPointer, this.accumulator);

    this.stackPointer--;

    return 0;
  }
  PLP(): number {
    this.stackPointer++;
    this.statusRegister = this.read(STACK_START_RANGE + this.stackPointer);

    this.setFlag('U', true);

    return 0;
  }
  PHP(): number {
    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.statusRegister | this.FLAGS['B'] | this.FLAGS['U'],
    );

    this.setFlag('B', false);
    this.setFlag('U', false);

    return 0;
  }
  // Jump/Flag commands:
  BVC(): number {
    const vFlag = this.getFlag('V');

    // check overflow bit
    if (vFlag === 0) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BVS(): number {
    const vFlag = this.getFlag('V');

    // check overflow bit
    if (vFlag === 1) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BCC(): number {
    const cFlag = this.getFlag('C');

    // check carry bit
    if (cFlag === 0) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BCS(): number {
    const cFlag = this.getFlag('C');

    // check carry bit
    if (cFlag === 1) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BEQ(): number {
    const zFlag = this.getFlag('Z');

    if (zFlag === 1) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BMI(): number {
    const nFlag = this.getFlag('N');

    if (nFlag === 1) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BPL(): number {
    const nFlag = this.getFlag('N');

    if (nFlag === 0) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BNE(): number {
    const zFlag = this.getFlag('Z');

    if (zFlag === 0) {
      this.cycles++;

      this.addrAbs = getUnsigned16Number(this.programCounter + this.addrRel);

      // page boundary
      if ((this.addrAbs & HIGH_8_BIT) !== (this.programCounter & HIGH_8_BIT)) {
        this.cycles++;
      }

      this.programCounter = this.addrAbs;
    }

    return 0;
  }
  BRK(): number {
    this.programCounter++;

    this.setFlag('I', true);

    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.programCounter & HIGH_8_BIT,
    );
    this.stackPointer--;
    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.programCounter & LOWER_8_BIT,
    );
    this.stackPointer--;

    this.setFlag('B', true);

    this.write(STACK_START_RANGE + this.stackPointer, this.statusRegister);
    this.stackPointer--;

    this.setFlag('B', false);

    this.programCounter = this.read(0xfffe) | (this.read(0xffff) << 8);

    return 0;
  }
  RTI(): number {
    this.stackPointer++;
    this.statusRegister = this.read(STACK_START_RANGE + this.statusRegister);
    this.statusRegister &= ~this.FLAGS['B'];
    this.statusRegister &= ~this.FLAGS['U'];

    this.stackPointer++;
    this.programCounter = this.read(STACK_START_RANGE + this.statusRegister);
    this.stackPointer++;
    this.programCounter |=
      this.read(STACK_START_RANGE + this.statusRegister) << 8;

    return 0;
  }
  JSR(): number {
    this.programCounter--;

    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.programCounter & HIGH_8_BIT,
    );
    this.stackPointer--;

    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.programCounter & LOWER_8_BIT,
    );
    this.stackPointer--;

    this.programCounter = this.addrAbs;

    return 0;
  }
  RTS(): number {
    this.stackPointer++;
    const pcLo = this.read(STACK_START_RANGE + this.stackPointer);

    this.stackPointer++;
    const pcHi = this.read(STACK_START_RANGE + this.stackPointer);

    this.programCounter = create16Number(pcLo, pcHi) + 1;

    return 0;
  }
  JMP(): number {
    this.programCounter = this.addrAbs;

    return 0;
  }
  BIT(): number {
    const fetched = this.fetch();

    const result = this.accumulator & fetched;

    const bit7 = 1 << 7;
    const bit6 = 1 << 6;

    this.setFlag('Z', Boolean(result & LOWER_8_BIT));
    this.setFlag('N', Boolean(fetched & bit7));
    this.setFlag('V', Boolean(fetched & bit6));

    return 0;
  }
  SEC(): number {
    this.setFlag('C', true);

    return 0;
  }
  SED(): number {
    this.setFlag('D', true);

    return 0;
  }
  SEI(): number {
    this.setFlag('I', true);

    return 0;
  }
  NOP(): number {
    return 0;
  }
  CLC(): number {
    this.setFlag('C', false);

    return 0;
  }
  CLD(): number {
    this.setFlag('D', false);

    return 0;
  }
  CLI(): number {
    this.setFlag('I', false);

    return 0;
  }
  CLV(): number {
    this.setFlag('V', false);

    return 0;
  }
  // Illegal opcodes:
  SLO(): number {
    return 1;
  }
  RLA(): number {
    return 1;
  }
  SRE(): number {
    return 1;
  }
  RRA(): number {
    return 1;
  }
  SAX(): number {
    return 1;
  }
  LAX(): number {
    return 1;
  }
  DCP(): number {
    return 1;
  }
  ISC(): number {
    return 1;
  }
  ANC(): number {
    return 1;
  }
  ANC2(): number {
    return 1;
  }
  ALR(): number {
    return 1;
  }
  ARR(): number {
    return 1;
  }
  XAA2(): number {
    return 1;
  }
  LAX2(): number {
    return 1;
  }
  AXS(): number {
    return 1;
  }
  SBC2(): number {
    return 1;
  }
  AHX1(): number {
    return 1;
  }
  SHY1(): number {
    return 1;
  }
  SHX1(): number {
    return 1;
  }
  TAS1(): number {
    return 1;
  }
  LAS(): number {
    return 1;
  }
  KIL(): number {
    return 1;
  }

  clock(): void {
    this.isCompleteCycle = false;

    if (this.cycles === 0) {
      this.opcode = this.read(this.programCounter);

      this.setFlag('U', true);

      // inc counter
      this.programCounter++;

      const currentInstruction = this.opcodeMatrix[this.opcode];

      const additionalCycleAddrMode = currentInstruction.addrMode.call(this);
      const additionalCycleOpcode = currentInstruction.opcode.call(this);

      const totalCycles =
        currentInstruction.cycles +
        (additionalCycleAddrMode & additionalCycleOpcode);

      this.cycles = totalCycles;

      this.setFlag('U', true);

      this.isCompleteCycle = true;
      return;
    }

    // cycle tick
    this.cycles--;
  }
  reset(): void {
    this.accumulator = 0;
    this.xRegister = 0;
    this.yRegister = 0;
    this.stackPointer = 0xfd;
    this.statusRegister = 0 | this.FLAGS['U'];

    // address with information about default programCounter state
    this.addrAbs = 0xfffc;

    const hiBits = this.read(this.addrAbs + 1);
    const loBits = this.read(this.addrAbs + 0);

    // fill 16 bits number
    this.programCounter = create16Number(hiBits, loBits);

    this.addrAbs = 0x0000;
    this.addrRel = 0x0000;
    this.fetched = 0x00;

    // need 8 cycles for reset
    this.cycles = 8;
  }
  // Interrupt request
  irq(): void {
    const iFlag = this.getFlag('I');

    if (iFlag === 1) {
      return;
    }

    const HiToLoPcBits = (this.programCounter >> 8) & LOWER_8_BIT;
    this.write(STACK_START_RANGE + this.stackPointer, HiToLoPcBits);
    this.stackPointer--;

    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.programCounter & 0x00ff,
    );
    this.stackPointer--;

    this.setFlag('B', false);
    this.setFlag('U', true);
    this.setFlag('I', true);

    this.write(STACK_START_RANGE + this.stackPointer, this.statusRegister);
    this.stackPointer--;

    // address with information about default programCounter state
    this.addrAbs = 0xfffc;

    const hiBits = this.read(this.addrAbs + 1);
    const loBits = this.read(this.addrAbs + 0);

    // fill 16 bits number
    this.programCounter = create16Number(hiBits, loBits);

    // need 7 cycles for intterupt
    this.cycles = 7;
  }
  // Non maskable interrupt request
  nmi(): void {
    const HiToLoPcBits = (this.programCounter >> 8) & LOWER_8_BIT;
    this.write(STACK_START_RANGE + this.stackPointer, HiToLoPcBits);
    this.stackPointer--;

    this.write(
      STACK_START_RANGE + this.stackPointer,
      this.programCounter & 0x00ff,
    );
    this.stackPointer--;

    this.setFlag('B', false);
    this.setFlag('U', true);
    this.setFlag('I', true);

    this.write(STACK_START_RANGE + this.stackPointer, this.statusRegister);
    this.stackPointer--;

    // address with information about default programCounter state
    this.addrAbs = 0xfffa;

    const hiBits = this.read(this.addrAbs + 1);
    const loBits = this.read(this.addrAbs + 0);

    // fill 16 bits number
    this.programCounter = create16Number(hiBits, loBits);

    // need 8 cycles for non maskable interrupt
    this.cycles = 8;
  }

  fetch(): number {
    const currentInstruction = this.opcodeMatrix[this.opcode];

    if (currentInstruction.addrMode.name !== 'IMP') {
      this.fetched = this.read(this.addrAbs);
    }

    return this.fetched;
  }
}

export default CPU;
