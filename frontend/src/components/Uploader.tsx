import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { UploadStatus } from '../types';

export const UploaderView = () => {
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
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
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