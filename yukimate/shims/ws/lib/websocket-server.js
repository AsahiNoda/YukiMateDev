// WebSocket Server shim - not supported in React Native
module.exports = class WebSocketServer {
  constructor() {
    console.warn('WebSocket Server is not supported in React Native');
  }
};
