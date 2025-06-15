import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Mic, StopCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';

// --- Types and Interfaces ---
type Tab = 'uploader' | 'streamer'; // 'recorder' tab removed
type UploadStatus = 'idle' | 'loading' | 'success' | 'error';
type SocketStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Error';
type RecordingStatus = 'idle' | 'permission-pending' | 'recording' | 'stopped' | 'error';

interface ApiResponse {
    chunks: string[];
}

// --- Main App Component ---
export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('uploader');

    return (
        <div className="bg-stone-800 text-stone-200 min-h-screen font-sans">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header & Tab Navigation */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-amber-400 tracking-wider">
                        Pen & P.A.I.per
                    </h1>
                    <p className="text-stone-400 mt-2">Your Digital Scribe for Adventures & Archives</p>
                    <nav className="mt-6 flex justify-center border-b border-stone-700">
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
                        {/* Recorder tab button removed */}
                    </nav>
                </header>

                <main>
                    {activeTab === 'uploader' && <UploaderView />}
                    {activeTab === 'streamer' && <StreamerView />}
                </main>
            </div>
            {/* The Recorder is now a floating widget, rendered outside the main content flow */}
            <FloatingRecorderWidget />
        </div>
    );
}

// --- Tab Button Component ---
const TabButton = ({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void; }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 -mb-px font-semibold text-lg border-b-4 transition-colors duration-300 ${
            isActive
                ? 'text-amber-400 border-amber-400'
                : 'text-stone-400 border-transparent hover:text-amber-300'
        }`}
    >
        {label}
    </button>
);


// --- Uploader View Component (Unchanged) ---
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
            // NOTE: This fetch call is for a local server. You will need a running backend for this to work.
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
        <div>
            <div
                {...getRootProps()}
                className={`border-4 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive ? 'border-amber-400 bg-stone-900' : 'border-stone-600 hover:border-amber-500 bg-stone-800'
                }`}
            >
                <input {...getInputProps()} />
                <p className="text-stone-300">
                    {isDragActive ? 'Drop the PDF here...' : "To add background information drag 'n' drop a PDF file here, or click to select"}
                </p>
                <p className="text-sm text-stone-500 mt-1">Maximum file size: 10MB</p>
            </div>
            <div className="mt-8">
                {status === 'loading' && <div className="text-center text-amber-400 p-4">Loading...</div>}
                {status === 'error' && <div className="p-4 bg-red-900/50 text-red-300 rounded-lg">{error}</div>}
                {status === 'success' && textChunks.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-stone-300">Extracted Text Chunks</h2>
                        {textChunks.map((chunk, index) => (
                            <div key={index} className="bg-stone-900 p-4 rounded-lg shadow-md relative">
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

// --- Streamer View Component (Unchanged) ---
const StreamerView = () => {
    // NOTE: This WebSocket URL is for demonstration. Replace with your actual server address.
    const WEBSOCKET_URL = "wss://echo.websocket.org/";
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

// --- NEW: Floating Audio Recorder Widget ---
const FloatingRecorderWidget = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const getMicrophonePermission = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Your browser does not support audio recording.");
            setStatus('error');
            return false;
        }
        try {
            setStatus('permission-pending');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioURL(audioUrl);
                audioChunksRef.current = [];
            };

            setStatus('idle'); // Permission granted, ready to record
            setError(null);
            return true;
        } catch (err) {
            setError("Microphone access was denied. Please enable it in your browser settings.");
            setStatus('error');
            return false;
        }
    };

    const startRecording = async () => {
        let hasPermission = !!mediaRecorderRef.current;
        if (!hasPermission) {
            hasPermission = await getMicrophonePermission();
        }
        
        if (hasPermission && mediaRecorderRef.current) {
            mediaRecorderRef.current.start();
            setStatus('recording');
            setAudioURL(null);
            setError(null);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            setStatus('stopped');
        }
    };

    const RecorderActionButton = ({ onClick, disabled, children, className = '' }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-300 text-lg ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
            {/* The widget panel */}
            <div className={`transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                 <div className="w-80 p-6 bg-stone-900 rounded-lg border-2 border-stone-700 shadow-xl flex flex-col items-center gap-6">
                    <h2 className="text-2xl font-bold text-amber-400">Audio Recorder</h2>
                    <div className="flex flex-col items-center gap-4 w-full">
                        {status !== 'recording' ? (
                             <RecorderActionButton 
                                onClick={startRecording} 
                                disabled={status === 'permission-pending'}
                                className="bg-green-600 hover:bg-green-500 text-white shadow-lg w-full"
                             >
                                <Mic size={24} /> 
                                {status === 'permission-pending' ? 'Waiting...' : 'Start'}
                            </RecorderActionButton>
                        ) : (
                            <RecorderActionButton 
                                onClick={stopRecording}
                                className="bg-red-600 hover:bg-red-500 text-white shadow-lg animate-pulse w-full"
                            >
                                <StopCircle size={24} /> Stop
                            </RecorderActionButton>
                        )}

                        {error && (
                            <div className="mt-2 p-3 bg-red-900/50 text-red-300 rounded-lg flex items-center gap-2 text-sm">
                                <AlertTriangle size={18}/>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {audioURL && status === 'stopped' && (
                        <div className="w-full p-4 bg-stone-800 rounded-lg flex flex-col items-center gap-3 border border-stone-700">
                             <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle />
                                <span className="font-semibold">Recording ready!</span>
                            </div>
                            <audio controls src={audioURL} className="w-full h-10">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                </div>
            </div>

            {/* The toggle button (FAB) */}
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110"
                aria-label={isVisible ? "Close recorder" : "Open recorder"}
            >
                {isVisible ? <X size={32} /> : <Mic size={32} />}
            </button>
        </div>
    );
};
