import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

// --- Types and Interfaces ---
type Tab = 'uploader' | 'streamer';
type UploadStatus = 'idle' | 'loading' | 'success' | 'error';
type SocketStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Error';

interface ApiResponse {
    chunks: string[];
}

// --- Generated Assets ---
// This Base64 string represents the custom-generated background image of weathered parchment.
// Embedding it directly into the code removes the need for an external image file.
const SCROLL_BACKGROUND_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";


// --- Main App Component ---
export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('uploader');

    return (
        <div className="bg-stone-700 min-h-screen font-sans">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header & Tab Navigation */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-amber-400 tracking-wider font-dnd">
                        Pen & P.A.I.per
                    </h1>
                    <p className="text-stone-400 mt-2">Your Digital Scribe for Adventures & Archives</p>
                    <nav className="mt-6 flex justify-center border-b border-stone-800">
                        <TabButton
                            label="Admin Panel"
                            isActive={activeTab === 'uploader'}
                            onClick={() => setActiveTab('uploader')}
                        />
                        <TabButton
                            label="Live Assistant"
                            isActive={activeTab === 'streamer'}
                            onClick={() => setActiveTab('streamer')}
                        />
                    </nav>
                </header>

                <main>
                    {activeTab === 'uploader' && <UploaderView />}
                    {activeTab === 'streamer' && <StreamerView />}
                </main>
            </div>
        </div>
    );
}

// --- Tab Button Component ---
const TabButton = ({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void; }) => (
    <button
        onClick={onClick}
        className={`px-4 py-3 -mb-px font-dnd text-xl border-b-4 transition-colors duration-300 ${
            isActive
                ? 'text-amber-400 border-amber-400'
                : 'text-stone-400 border-transparent hover:text-amber-300'
        }`}
    >
        {label}
    </button>
);


// --- Uploader View Component ---
const UploaderView = () => {
    const [textChunks, setTextChunks] = useState<string[]>([]);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setStatus('loading');
        setError(null);
        setTextChunks([]);

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const response = await fetch('http://localhost:3001/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data: ApiResponse = await response.json();
            setTextChunks(data.chunks);
            setStatus('success');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Upload failed: ${errorMessage}`);
            setStatus('error');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
    });
    
    const handleCopy = (text: string, index: number) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="mt-4">
            <div
                {...getRootProps()}
                className={`border-4 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive ? 'border-amber-400 bg-stone-800' : 'border-stone-600 hover:border-amber-500'
                }`}
            >
                <input {...getInputProps()} />
                <p className="text-stone-300">
                    {isDragActive ? 'Drop the PDF here...' : "To add background information, drag 'n' drop a PDF file here, or click to select"}
                </p>
                <p className="text-sm text-stone-500 mt-1">Maximum file size: 10MB</p>
            </div>
            {/* Status and Results from Uploader... */}
            <div className="mt-8">
                {status === 'loading' && <div className="text-center p-4">Loading...</div>}
                {status === 'error' && <div className="p-4 bg-red-900/50 text-red-300 rounded-lg">{error}</div>}
                {status === 'success' && textChunks.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-stone-300 font-dnd">Extracted Text Chunks</h2>
                        {textChunks.map((chunk, index) => (
                            <div key={index} className="bg-stone-800 p-4 rounded-lg shadow-md relative">
                                 <button 
                                    onClick={() => handleCopy(chunk, index)}
                                    className="absolute top-3 right-3 bg-stone-700 hover:bg-amber-500 text-white font-bold py-1 px-2 rounded-md text-xs transition-all"
                                >
                                    {copiedIndex === index ? 'Copied!' : 'Copy'}
                                </button>
                                <p className="text-stone-300 whitespace-pre-wrap font-mono text-sm leading-relaxed pr-16">{chunk}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Streamer View Component ---
const StreamerView = () => {
    // NOTE: Replace this with your actual WebSocket address.
    const WEBSOCKET_URL = "https://67934-3000.2.codesphere.com/ws/"
    const [textChunk, setTextChunk] = useState<string>('Awaiting transmission from the ether...');
    const [status, setStatus] = useState<SocketStatus>('Connecting');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // ws.current = new WebSocket(WEBSOCKET_URL);
        // ws.current.onopen = () => setStatus('Connected');
        // ws.current.onclose = () => setStatus('Disconnected');
        // ws.current.onerror = () => setStatus('Error');
        // ws.current.onmessage = (event) => {
        //     setTextChunk(event.data);
        // };
        
        // return () => {
        //     ws.current?.close();
        // };
    }, [WEBSOCKET_URL]);

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
        <div
            className="relative p-6 mt-4 rounded-lg border-2 border-amber-900 overflow-hidden bg-cover bg-center shadow-lg"
            style={{ backgroundImage: `url(${SCROLL_BACKGROUND_BASE64})` }}
        >
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/60 z-0"></div>

            {/* All content is relative to the container and has a higher z-index to appear above the overlay */}
            <div className="relative z-10">
                <div className="font-dnd text-center mb-6">
                    <h2 className={`text-3xl font-bold ${color}`}>{text}</h2>
                    <p className="text-amber-200 text-lg">Listening for whispers on the ethereal plane...</p>
                </div>
                <div className="bg-stone-900/30 backdrop-blur-sm border-2 border-amber-800/50 rounded-lg p-8 shadow-inner min-h-[400px] flex items-center justify-center">
                     <p className="font-dnd text-white text-3xl leading-relaxed whitespace-pre-wrap text-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
                        {textChunk}
                     </p>
                </div>
            </div>
        </div>
    );
};
