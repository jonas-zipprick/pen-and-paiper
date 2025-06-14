import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

// Define the structure of the API response
interface ApiResponse {
    chunks: string[];
}

// Define the application's state for async operations
type Status = 'idle' | 'loading' | 'success' | 'error';

export default function App() {
    const [textChunks, setTextChunks] = useState<string[]>([]);
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Callback function to handle file drops
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) {
            setError('No file selected or file type is not supported.');
            setStatus('error');
            return;
        }

        // Reset state before a new upload
        setStatus('loading');
        setError(null);
        setTextChunks([]);

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            // Send the file to the backend API
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
            console.error('Upload failed:', errorMessage);
            setError(`Upload failed: ${errorMessage}`);
            setStatus('error');
        }
    }, []);

    // Configure react-dropzone
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    // Function to handle copying text to clipboard
    const handleCopy = (text: string, index: number) => {
        // Using the deprecated execCommand for broader iframe compatibility
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-sky-400">PDF Text Extractor</h1>
                    <p className="text-slate-400 mt-2">Upload a PDF to split it into searchable text chunks.</p>
                </header>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`border-4 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                        isDragActive ? 'border-sky-400 bg-slate-800' : 'border-slate-600 hover:border-sky-500'
                    }`}
                >
                    <input {...getInputProps()} />
                    <p className="text-slate-300">
                        {isDragActive ? 'Drop the PDF here...' : "Drag 'n' drop a PDF file here, or click to select"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Maximum file size: 10MB</p>
                </div>

                {/* Status Display */}
                <div className="mt-8">
                    {status === 'loading' && (
                        <div className="flex items-center justify-center p-4 bg-slate-800 rounded-lg">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-lg">Processing your PDF...</p>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-center">
                            <p className="font-bold">An Error Occurred</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {status === 'success' && (
                         <div className="text-center p-4 bg-green-900/50 border border-green-500 text-green-300 rounded-lg">
                            <p className="font-bold">PDF processed successfully!</p>
                             <p>{textChunks.length} text chunks extracted.</p>
                        </div>
                    )}
                </div>


                {/* Results - Text Chunks */}
                {textChunks.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <h2 className="text-2xl font-bold text-slate-300">Extracted Text Chunks</h2>
                        {textChunks.map((chunk, index) => (
                            <div key={index} className="bg-slate-800 p-4 rounded-lg shadow-md relative">
                                <button 
                                    onClick={() => handleCopy(chunk, index)}
                                    className="absolute top-3 right-3 bg-slate-700 hover:bg-sky-500 text-white font-bold py-1 px-2 rounded-md text-xs transition-all"
                                >
                                    {copiedIndex === index ? 'Copied!' : 'Copy'}
                                </button>
                                <p className="text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed pr-16">
                                    {chunk}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
