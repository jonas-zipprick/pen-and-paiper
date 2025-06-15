import React, { useState, useEffect, useRef } from 'react';
import type { SocketStatus } from '../types';

export const StreamerView = () => {
    const WEBSOCKET_URL = "wss://67934-3000.2.codesphere.com/assistant/ws";
    const [textChunk, setTextChunk] = useState<string>('Awaiting transmission from the ether...');
    const [status, setStatus] = useState<SocketStatus>('Connecting');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        ws.current = new WebSocket(WEBSOCKET_URL);
        ws.current.onopen = () => setStatus('Connected');
        ws.current.onclose = () => setStatus('Disconnected');
        ws.current.onerror = () => setStatus('Error');
        ws.current.onmessage = (event) => {
            setTextChunk(event.data);
        };
        
        return () => {
            ws.current?.close();
        };
    }, []);

    const getStatusIndicator = () => {
        switch (status) {
            case 'Connected': return { text: 'Scroll is Live', color: 'text-green-400' };
            case 'Connecting': return { text: 'Scrying...', color: 'text-yellow-400' };
            case 'Disconnected': return { text: 'Connection Severed', color: 'text-red-500' };
            case 'Error': return { text: 'A Magical Disturbance Occurred', color: 'text-red-500' };
            default: return { text: 'Unknown State', color: 'text-gray-400' };
        }
    };

    const { text, color } = getStatusIndicator();

    return (
        <div className="p-6 bg-stone-800/50 rounded-lg border-2 border-amber-900" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/old-paper.png')` }}>
            <div className="font-serif text-center mb-4">
                <h2 className={`text-2xl font-bold ${color}`}>{text}</h2>
                <p className="text-amber-900">Listening for whispers on the ethereal plane...</p>
            </div>
            <div className="bg-amber-50/80 border-4 border-amber-800 rounded-lg p-6 shadow-inner min-h-[400px] flex items-center justify-center">
                 <p className="font-serif text-amber-900 text-2xl leading-relaxed whitespace-pre-wrap text-center">
                    {textChunk}
                 </p>
            </div>
        </div>
    );
};