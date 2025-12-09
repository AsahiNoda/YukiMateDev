// WebSocket Receiver shim - not supported in React Native
module.exports = class Receiver {
  constructor() {
    console.warn('WebSocket Receiver is not supported in React Native');
  }
};
