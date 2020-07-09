class CartridgeLoadTimeoutError extends Error {
  constructor() {
    super('Cartridge load timeout');
  }
}

export default CartridgeLoadTimeoutError;
