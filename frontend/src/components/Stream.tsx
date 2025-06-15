import React, { useState, useEffect, useRef } from 'react';
import type { SocketStatus } from '../types';
import { StatusIcon } from './StatusIcon';
import { Section } from './Section';


export const StreamerView = () => {
    const WEBSOCKET_URL = "wss://67934-3000.2.codesphere.com/assistant/ws";
    const [readNext, setReadNext] = useState<string>('The ether remains silent...');
    const [relatedRules, setRelatedRules] = useState<string>('No specific lore applies here...');
    const [happenNext, setHappenNext] = useState<string>('The threads of fate are unclear...');
    const [status, setStatus] = useState<SocketStatus>('connecting');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            ws.current = new WebSocket(WEBSOCKET_URL);
            ws.current.onopen = () => setStatus('connected');
            ws.current.onclose = () => {
                setStatus('disconnected');
                setTimeout(connect, 5000);
            };
            ws.current.onerror = () => setStatus('error');
            ws.current.onmessage = (event) => {
                try {
                    // 1. PARSE the incoming string data into a JavaScript object
                    const data = JSON.parse(event.data);

                    // 2. SET state using the properties of the new object
                    // (Added fallbacks to prevent crashes if a key is missing)
                    setReadNext(data.readThisTextToYourPlayers);
                    setRelatedRules(data.relatedGameRule);
                    setHappenNext(data.whatCouldHappenNext);

                } catch (error) {
                    console.error("Failed to parse incoming JSON:", error);
                    setReadNext("A garbled message was received from the beyond.");
                }
            };
        };

        connect();

        return () => {
            ws.current?.close();
        };
    }, []);

    const getStatusIndicator = () => {
        switch (status) {
            case 'connected': return { text: 'Scroll is Live', color: 'text-green-600' };
            case 'connecting': return { text: 'Scrying...', color: 'text-yellow-300' };
            case 'disconnected': return { text: 'Connection Severed', color: 'text-red-400' };
            case 'error': return { text: 'A Magical Disturbance', color: 'text-red-500' };
            default: return { text: 'Unknown State', color: 'text-gray-400' };
        }
    };

    const { text, color } = getStatusIndicator();

    return (
        <div className="min-h-full p-8 ">
            <div
                className="max-w-7xl mx-auto px-10 py-5 rounded-lg border-2 border-amber-400 shadow-2xl bg-stone-900/25 backdrop-blur-xl"
                style={{
                    boxShadow: '0 0 80px rgba(0,0,0,0.7) inset, 0 0 20px rgba(0,0,0,0.5)',
                    backgroundAttachment: 'local',
                }}
            >
                <header className="text-center mb-2 pb-4">
                    <div className={`mt-2 text-2xl font-immortal ${color}`}>
                        <StatusIcon status={status} /> {text} <StatusIcon status={status} />
                    </div>
                </header>

                <main className="flex flex-col gap-8">
                    <Section title="Whispers for the Party" content={readNext} />
                    <Section title="Forbidden Rules" content={relatedRules} />
                    <Section title="Threads of Fate" content={happenNext} />
                </main>

                <footer className="text-center mt-8 pt-4">
                    <p className="font-immortal text-amber-400">The All-Seeing Eye is watching...</p>
                </footer>
            </div>
        </div>
    );
};
