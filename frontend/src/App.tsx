import React, { useState } from 'react';

// Import Types
import type { Tab } from './types';

// Import Components
import { TabButton } from './components/TabButton';
import { UploaderView } from './components/Uploader';
import { StreamerView } from './components/Stream';
import { FloatingRecorderWidget } from './components/Recorder';

export default function App() {
    const [activeTab, setActiveTab] = useState<Tab>('streamer');

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
                            label="Live Assistant"
                            isActive={activeTab === 'streamer'}
                            onClick={() => setActiveTab('streamer')}
                        />
                        <TabButton
                            label="Admin Panel"
                            isActive={activeTab === 'uploader'}
                            onClick={() => setActiveTab('uploader')}
                        />
                    </nav>
                </header>

                <main>
                    {activeTab === 'streamer' && <StreamerView />}
                    {activeTab === 'uploader' && <UploaderView />}
                </main>
            </div>
            
            <FloatingRecorderWidget />
        </div>
    );
}