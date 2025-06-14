import {Server as HTTPServer} from 'http';
import {WebSocketServer} from 'ws';

export const bindWss = (server: HTTPServer) => {
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        // This code runs every time a new frontend client connects
        console.log('✅ Frontend client connected');

        // Set up a listener for messages from the connected client
        ws.on('message', (message) => {
            // For now, we'll just log any message we receive.
            // Later, this will be the raw audio data.
            console.log('Received message from client:', message);
        });

        // Set up a listener for when the client disconnects
        ws.on('close', () => {
            console.log('❌ Frontend client disconnected');
        });

        // Handle any errors
        ws.on('error', (error) => {
            console.error('WebSocket Error:', error);
        });

        // You could optionally send a welcome message to the client
        ws.send('Welcome! You are connected to the backend.');
    });
}
