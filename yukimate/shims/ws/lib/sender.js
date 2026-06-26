// WebSocket Sender shim - not supported in React Native
module.exports = class Sender {
  constructor() {
    console.warn('WebSocket Sender is not supported in React Native');
  }
};
