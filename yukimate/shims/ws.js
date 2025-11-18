// Minimal stub for the `ws` package so Metro can bundle
// @supabase/realtime-js in React Native / Expo without
// trying to use Node's networking modules.

function WSWebSocketDummy() {
  // In React Native, @supabase/realtime-js should use the
  // global WebSocket implementation, so this stub should
  // never actually be constructed. If it is, just warn.
  console.warn(
    '[ws shim] The "ws" package was constructed in React Native. ' +
      'Realtime features may not work as expected.',
  );
}

module.exports = WSWebSocketDummy;
module.exports.default = WSWebSocketDummy;

