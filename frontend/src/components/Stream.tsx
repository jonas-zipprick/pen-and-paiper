import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { SocketStatus } from '../types';

// Helper component for thematic section headers
const SectionHeader = ({ title }: { title: string }) => (
    <div className="text-center my-4">
        <h3 className="text-3xl font-mr-eaves text-amber-950 tracking-wider">{title}</h3>
        <div className="w-2/3 mx-auto my-2 border-t-2 border-amber-800/50"></div>
    </div>
);

// Component to render styled Markdown
const MarkdownDisplay = ({ markdownContent }: { markdownContent: string }) => {
    return (
        <ReactMarkdown
            components={{
                p: ({node, ...props}) => <p className="font-im-fell text-stone-900 text-xl leading-relaxed mb-4" {...props} />,
                h1: ({node, ...props}) => <h1 className="font-mr-eaves text-stone-900 text-3xl mb-3" {...props} />,
                h2: ({node, ...props}) => <h2 className="font-mr-eaves text-stone-900 text-2xl mb-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="font-mr-eaves text-stone-900 text-xl mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside font-im-fell text-stone-900 text-lg mb-4 pl-4" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside font-im-fell text-stone-900 text-lg mb-4 pl-4" {...props} />,
                li: ({node, ...props}) => <li className="mb-2" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-amber-950" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-amber-800 pl-4 italic text-stone-800 my-4" {...props} />,
            }}
        >
            {markdownContent}
        </ReactMarkdown>
    );
};


export const StreamerView = () => {
    const WEBSOCKET_URL = "wss://67934-3000.2.codesphere.com/assistant/ws";
    const [readNext, setReadNext] = useState<string>('Awaiting transmission from the ether...');
    const [relatedRules, setRelatedRules] = useState<string>('Awaiting transmission from the ether...');
    const [happenNext, setHappenNext] = useState<string>('Awaiting transmission from the ether...');
    const [status, setStatus] = useState<SocketStatus>('Connecting');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            ws.current = new WebSocket(WEBSOCKET_URL);
            ws.current.onopen = () => setStatus('Connected');
            ws.current.onclose = () => {
                setStatus('Disconnected');
                setTimeout(connect, 5000);
            };
            ws.current.onerror = () => setStatus('Error');
            ws.current.onmessage = (event) => {
                try {
                    // 1. PARSE the incoming string data into a JavaScript object
                    const data = JSON.parse(event.data);

                    // 2. SET state using the properties of the new object
                    // (Added fallbacks to prevent crashes if a key is missing)
                    setReadNext(data.readThisTextToYourPlayers || 'The ether remains silent...');
                    setRelatedRules(data.relatedGameRule || 'No specific lore applies here.');
                    setHappenNext(data.whatCouldHappenNext || 'The threads of fate are unclear...');

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
            case 'Connected': return { text: 'Scroll is Live', color: 'text-green-300', icon: '✨' };
            case 'Connecting': return { text: 'Scrying...', color: 'text-yellow-300', icon: '🔮' };
            case 'Disconnected': return { text: 'Connection Severed', color: 'text-red-400', icon: '🔗' };
            case 'Error': return { text: 'A Magical Disturbance', color: 'text-red-500', icon: '💥' };
            default: return { text: 'Unknown State', color: 'text-gray-400', icon: '❓' };
        }
    };

    const { text, color, icon } = getStatusIndicator();

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap');
                @import url('https://use.typekit.net/rbf0lki.css');
                .font-mr-eaves { font-family: "mr-eaves-xl-modern", sans-serif; font-weight: 400; font-style: normal; }
                .font-im-fell { font-family: 'IM Fell English', serif; }
            `}</style>
            <div 
                className="min-h-screen p-8" 
            >
                <div 
                    className="max-w-7xl mx-auto p-10 rounded-lg border-4 border-amber-950 shadow-2xl bg-cover"
                    style={{
                        backgroundImage: `url('https://www.transparenttextures.com/patterns/old-paper.png')`,
                        boxShadow: '0 0 80px rgba(0,0,0,0.7) inset, 0 0 20px rgba(0,0,0,0.5)',
                        backgroundAttachment: 'local'
                    }}
                >
                    <header className="text-center mb-6 border-b-4 border-amber-900/60 pb-4">
                        <h1 className="text-5xl font-mr-eaves text-amber-950 tracking-widest">Dungeon Master's Oracle</h1>
                        <div className={`mt-2 text-2xl font-mr-eaves ${color}`}>
                            {icon} {text} {icon}
                        </div>
                    </header>

                    <main className="grid grid-cols-1 md:grid-rows-3 gap-8">
                        {/* Column 1: Read to Players */}
                        <div className="flex flex-col">
                            <SectionHeader title="Whispers for the Party" />
                            <div className="bg-stone-200/70 p-6 rounded-md shadow-inner flex-grow border border-amber-800/50">
                                <MarkdownDisplay markdownContent={readNext} />
                            </div>
                        </div>

                        {/* Column 2: Related Rules */}
                        <div className="flex flex-col">
                            <SectionHeader title="Forbidden Rules" />
                            <div className="bg-stone-200/70 p-6 rounded-md shadow-inner flex-grow border border-amber-800/50">
                                <MarkdownDisplay markdownContent={relatedRules} />
                            </div>
                        </div>

                        {/* Column 3: What's Next */}
                        <div className="flex flex-col">
                            <SectionHeader title="Threads of Fate" />
                            <div className="bg-stone-200/70 p-6 rounded-md shadow-inner flex-grow border border-amber-800/50">
                                <MarkdownDisplay markdownContent={happenNext} />
                            </div>
                        </div>
                    </main>

                     <footer className="text-center mt-8 pt-4 border-t-4 border-amber-900/60">
                        <p className="font-mr-eaves text-amber-950">The All-Seeing Eye is watching...</p>
                    </footer>
                </div>
            </div>
        </>
    );
};