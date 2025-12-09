// Main WebSocket shim for React Native
'use strict';

// Use React Native's built-in WebSocket
const WebSocket = global.WebSocket || class { };

// Provide stub implementations for Node.js server-side modules
// These are not needed in React Native (client-only)
WebSocket.createWebSocketStream = () => {
    throw new Error('WebSocket.createWebSocketStream is not supported in React Native');
};

WebSocket.Server = class {
    constructor() {
        throw new Error('WebSocket.Server is not supported in React Native');
    }
};

WebSocket.Receiver = class { };
WebSocket.Sender = class { };

WebSocket.WebSocket = WebSocket;
WebSocket.WebSocketServer = WebSocket.Server;

module.exports = WebSocket;
