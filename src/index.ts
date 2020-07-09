import CPU from './Hardware/CPU';
import Bus from './Hardware/Bus';
import PPU from './Hardware/PPU';
import RAM from './Devices/RAM';
import Interface from './Interface';

const cpu = new CPU();
const cpuRam = new RAM(2048);

const ppu = new PPU();
const ppuRam = new RAM(8);

const bus = new Bus(cpu, cpuRam, ppu, ppuRam);

const webInterface = new Interface(bus);

webInterface.renderTestScreen();
