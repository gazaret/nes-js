class CartridgeReadError extends Error {
  constructor() {
    super('Cartridge read error');
  }
}

export default CartridgeReadError;
