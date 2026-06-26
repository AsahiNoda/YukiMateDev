// Stream shim - not supported in React Native
module.exports = function createWebSocketStream() {
  console.warn('createWebSocketStream is not supported in React Native');
  return null;
};
