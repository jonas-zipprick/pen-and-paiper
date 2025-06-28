import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, AlertTriangle } from 'lucide-react';
import {config} from '../config.ts';

// Define the type for recording status for clarity
type RecordingStatus = 'idle' | 'permission-pending' | 'recording' | 'stopped' | 'error';

const WEBSOCKET_URL = `wss://${location.host}/whisper/listen`;
const CHUNK_DURATION = 3000; // 3 seconds

type Transcription = {
    type: 'transcription';
    segments: [{
        text: string;
        words: [{
            word: string;
            start: number;
            end: number;
        }];
    }];
}

export const FloatingRecorderWidget = () => {
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioChunks = useRef<Blob[] | null>([])

    useEffect(() => {
        // Standard cleanup on component unmount
        return () => {
            stopRecording();
        };
    }, []);

    const toggleRecording = () => {
        if (status === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        setError(null);
        setStatus('permission-pending');
        socketRef.current = new WebSocket(WEBSOCKET_URL);
        console.log("Attempting to connect WebSocket...");
        socketRef.current.onopen = async () => {
            console.log("WebSocket connection OPENED. Requesting microphone permission...");
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStreamRef.current = stream;
                setStatus('recording');

                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                mediaRecorderRef.current.ondataavailable = async (event) => {
                    if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
                        audioChunks.current?.push(event.data);
                    }
                };

                mediaRecorderRef.current.onstop = () => {
                    console.log("MediaRecorder stopped.");
                };
                const interval = setInterval(() => {
                    console.log(`-> Sending audio chunk of size ${audioChunks.current!.length}`);
                    const audio = new Blob(audioChunks.current!, {type: 'audio/webm'});
                    socketRef?.current?.send(audio);
                    // audioChunks.current = [];
                }, 3000);
                mediaRecorderRef.current.start(CHUNK_DURATION);
            } catch (err) {
                console.error('Error getting microphone access:', err);
                setError("Microphone access was denied.");
                setStatus('error');
                socketRef.current?.close();
            }
        };
        socketRef.current.onmessage = async (event) => {
            console.log('<- Received message from server:', event.data);
            const trans = JSON.parse(event.data) as Transcription;
            await fetch(config.assistantWsUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trans.segments.map(t => t.text).join('')),
            });
        };
        socketRef.current.onerror = (event) => {
            console.error('WebSocket error:', event);
            setError('A connection error occurred.');
            setStatus('error');
            stopRecording();
        };
        socketRef.current.onclose = (event) => {
            console.log(`WebSocket connection closed. Code: ${event.code}, Clean: ${event.wasClean}`);
            if (status === 'recording' || status === 'permission-pending') {
               stopRecording();
            }
        };
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            // Wait for potential late responses.
            setTimeout(socketRef.current.close, 10_000);
        }

        mediaRecorderRef.current = null;
        audioStreamRef.current = null;
        socketRef.current = null;

        if (status !== 'error') {
            setStatus('idle');
        }
    };

    const getIcon = () => {
        switch (status) {
            case 'recording': return <StopCircle size={32} className="text-white animate-pulse" />;
            case 'permission-pending': return <Mic size={32} className="text-white animate-spin" />;
            case 'error': return <AlertTriangle size={32} className="text-white" />;
            default: return <Mic size={32} className="text-white" />;
        }
    };

    const getButtonClass = () => {
        switch (status) {
            case 'recording': return 'bg-red-600 hover:bg-red-500';
            case 'permission-pending': return 'bg-gray-500 cursor-not-allowed';
            case 'error': return 'bg-yellow-600 hover:bg-yellow-500';
            default: return 'bg-amber-500 hover:bg-amber-400';
        }
    }

    // Main component render
    return (
                <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
                 {error && (
                    <div className="w-64 p-3 bg-red-900/80 backdrop-blur-sm text-red-200 rounded-lg flex items-center gap-2 text-sm border border-red-700 shadow-lg">
                        <AlertTriangle size={18}/>
                        <span>{error}</span>
                    </div>
                )}
                <button
                    onClick={toggleRecording}
                    disabled={status === 'permission-pending'}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-stone-900 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-70 ${getButtonClass()}`}
                    aria-label={status === 'recording' ? "Stop recording" : "Start recording"}
                >
                    {getIcon()}
                </button>
        </div>
    );
};
