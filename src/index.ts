import CPU from './Hardware/CPU';
import Bus from './Hardware/Bus';
import RAM from './Devices/RAM';
import Interface from './Interface';

const cpu = new CPU();
const ram = new RAM();

const bus = new Bus(cpu, ram);

const webInterface = new Interface(bus);

webInterface.renderTestScreen();
