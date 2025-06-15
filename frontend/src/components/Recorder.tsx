import React, { useState, useRef } from 'react';
import { Mic, StopCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import type { RecordingStatus } from '../types';

// This sub-component is only used here, so it's fine to keep it in the same file.
const RecorderActionButton = ({ onClick, disabled, children, className = '' }: { onClick: () => void, disabled: boolean, children: React.ReactNode, className?: string }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-300 text-lg ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);


export const FloatingRecorderWidget = () => {
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

            setStatus('idle');
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

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
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