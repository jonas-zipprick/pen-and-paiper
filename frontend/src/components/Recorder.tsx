import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, AlertTriangle } from 'lucide-react';
import type { RecordingStatus } from '../types';

const WEBSOCKET_URL = 'wss://5jmyry5iz1jpar-8080.proxy.runpod.net/listen';
const CHUNK_DURATION = 3000; // 3 seconds

export const FloatingRecorderWidget = () => {
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    
    // Key Change: Removed recordingIntervalRef as it's no longer needed.

    useEffect(() => {
        // Cleanup function remains the same and is very important.
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

        socketRef.current.onopen = async () => {
            console.log('WebSocket connection opened.');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStreamRef.current = stream;
                setStatus('recording');

                // Key Change: Create the MediaRecorder once and set its event handlers.
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                // Key Change: This event handler is now the core of our sending logic.
                // It fires automatically every CHUNK_DURATION.
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
                        console.log(`Sending audio chunk of size ${event.data.size}`);
                        socketRef.current.send(event.data);
                    }
                };
                
                mediaRecorderRef.current.onstop = () => {
                    console.log("MediaRecorder stopped.");
                    // Clean up stream and socket in the main stopRecording function
                };

                // Key Change: Start the recorder with a timeslice.
                // This tells it to trigger 'ondataavailable' every 3000ms.
                mediaRecorderRef.current.start(CHUNK_DURATION);

            } catch (err) {
                console.error('Error getting microphone access:', err);
                setError("Microphone access was denied. Please enable it in your browser settings.");
                setStatus('error');
                if (socketRef.current) {
                    socketRef.current.close();
                }
            }
        };

        socketRef.current.onclose = () => {
            console.log('WebSocket connection closed.');
            // Ensure we transition state correctly if the connection closes unexpectedly.
            if (status === 'recording' || status === 'permission-pending') {
               stopRecording();
            }
        };

        socketRef.current.onerror = (event) => {
            console.error('WebSocket error:', event);
            setError('A connection error occurred. Please try again.');
            setStatus('error');
            stopRecording(); // Stop everything on error
        };
        
        socketRef.current.onmessage = (event) => {
            console.log('Received message from server:', event.data);
        };
    };

    // Key Change: The sendAudioChunk function is no longer needed.

    const stopRecording = () => {
        // Key Change: No interval to clear.
        
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop(); // This will trigger one last ondataavailable
        }
        mediaRecorderRef.current = null;

        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.close();
        }
        socketRef.current = null;
        
        // Only set status to idle if it's not already in an error state
        if (status !== 'error') {
            setStatus('idle');
        }
    };

    // --- No changes to UI rendering functions (getIcon, getButtonClass, return statement) ---
    const getIcon = () => {
        switch (status) {
            case 'recording':
                return <StopCircle size={32} className="text-white animate-pulse" />;
            case 'permission-pending':
                return <Mic size={32} className="text-white animate-spin" />;
            case 'error':
                 return <AlertTriangle size={32} className="text-white" />;
            case 'idle':
            default:
                return <Mic size={32} className="text-white" />;
        }
    };
    
    const getButtonClass = () => {
        switch (status) {
            case 'recording':
                return 'bg-red-600 hover:bg-red-500';
            case 'permission-pending':
                return 'bg-gray-500 cursor-not-allowed';
            case 'error':
                 return 'bg-yellow-600 hover:bg-yellow-500';
            case 'idle':
            default:
                return 'bg-amber-500 hover:bg-amber-400';
        }
    }

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