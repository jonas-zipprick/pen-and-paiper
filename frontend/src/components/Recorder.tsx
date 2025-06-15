import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, AlertTriangle } from 'lucide-react';
import type { RecordingStatus } from '../types';

// The backend WebSocket URL from your HTML file
const WEBSOCKET_URL = 'ws://213.173.110.22:18984/listen';
// The duration of each audio chunk to be sent to the backend
const CHUNK_DURATION = 3000; // 3 seconds

export const FloatingRecorderWidget = () => {
    // 'status' tracks the current state of the recorder
    const [status, setStatus] = useState<RecordingStatus>('idle');
    // 'error' holds any error message to be displayed to the user
    const [error, setError] = useState<string | null>(null);

    // useRef is used to hold references to objects that don't need to trigger re-renders
    const socketRef = useRef<WebSocket | null>(null); // Holds the WebSocket connection
    const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Holds the main MediaRecorder instance
    const audioStreamRef = useRef<MediaStream | null>(null); // Holds the microphone audio stream
    const recordingIntervalRef = useRef<number | null>(null); // Holds the interval for sending chunks

    /**
     * This useEffect hook handles cleanup when the component unmounts.
     * It ensures that the recording is stopped, the microphone stream is released,
     * and the WebSocket connection is closed to prevent memory leaks.
     */
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    /**
     * Toggles the recording state.
     * If not recording, it starts. If recording, it stops.
     */
    const toggleRecording = () => {
        if (status === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };

    /**
     * Starts the recording process.
     * 1. Sets status to 'pending'
     * 2. Creates a new WebSocket connection.
     * 3. Sets up WebSocket event handlers (onopen, onclose, onerror).
     */
    const startRecording = () => {
        setError(null);
        setStatus('permission-pending');
        socketRef.current = new WebSocket(WEBSOCKET_URL);

        socketRef.current.onopen = async () => {
            console.log('WebSocket connection opened.');
            try {
                // Get microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStreamRef.current = stream;
                setStatus('recording');

                // Start sending audio chunks periodically
                recordingIntervalRef.current = setInterval(sendAudioChunk, CHUNK_DURATION);
                // Send the first chunk immediately
                sendAudioChunk(); 
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
            // If the connection closes unexpectedly, stop the recording
            if (status === 'recording') {
                stopRecording();
            }
        };

        socketRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('A connection error occurred. Please try again.');
            setStatus('error');
            if (status === 'recording') {
                stopRecording();
            }
        };
        
        // You can handle incoming messages from the server here if needed
        socketRef.current.onmessage = (event) => {
            console.log('Received message from server:', event.data);
            // Example: const data = JSON.parse(event.data);
            // Update your UI with the transcription data
        };
    };

    /**
     * Sends a chunk of audio data over the WebSocket connection.
     * This function is called periodically by setInterval.
     */
    const sendAudioChunk = () => {
        if (!audioStreamRef.current || socketRef.current?.readyState !== WebSocket.OPEN) {
            return;
        }
        
        // Use the single, continuous audio stream
        mediaRecorderRef.current = new MediaRecorder(audioStreamRef.current, { mimeType: 'audio/webm' });
        const audioChunks: Blob[] = [];

        mediaRecorderRef.current.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            if (audioBlob.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
                console.log(`Sending audio chunk of size ${audioBlob.size}`);
                socketRef.current.send(audioBlob);
            }
        };

        mediaRecorderRef.current.start();
        
        // Stop the recorder after the specified chunk duration to trigger onstop
        setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        }, CHUNK_DURATION);
    };

    /**
     * Stops the recording process.
     * 1. Clears the recording interval.
     * 2. Stops the MediaRecorder.
     * 3. Releases the microphone track.
     * 4. Closes the WebSocket connection.
     * 5. Resets the state to 'idle'.
     */
    const stopRecording = () => {
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.close();
        }
        
        setStatus('idle');
    };

    /**
     * Renders the correct icon based on the current recording status.
     */
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
    
     /**
     * Returns the appropriate button color based on the status.
     */
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

// You might need to define this type if it's not already in your project
// in a file like 'src/types.ts'
/*
export type RecordingStatus = 'idle' | 'permission-pending' | 'recording' | 'stopped' | 'error';
*/
