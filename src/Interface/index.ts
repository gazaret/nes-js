import Bus from '../Hardware/Bus';
import TestScreen from './TestScreen';

import './css/common.css';

class Interface {
  private readonly bus: Bus;

  constructor(bus: Bus) {
    this.bus = bus;
  }

  renderTestScreen(): void {
    const testScreen = new TestScreen(this.bus);
    testScreen.render();
  }
}

export default Interface;
