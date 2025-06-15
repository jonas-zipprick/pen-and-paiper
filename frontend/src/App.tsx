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

    const CONTENT_WIDTH = 1024; // Tailwind's max-w-4xl

    return (
        <div className="relative bg-slate-950 text-stone-200 min-h-screen font-immortal overflow-hidden"
             style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/leather.png')` }}>

            {/* Dragon Layer */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                {/* Left Dragon */}
                <img
                    src="/dragon.png"
                    alt="Left Dragon"
                    className="hidden md:block absolute object-contain -mb-4"
                    style={{
                        left: '35%',
                        transform: `translateX(calc(-50% - ${CONTENT_WIDTH / 2}px)) scaleX(-100%)`,
                    }}
                />
                {/* Right Dragon */}
                <img
                    src="/dragon.png"
                    alt="Right Dragon"
                    className="hidden md:block absolute object-contain -mb-4"
                    style={{
                        left: '65%',
                        transform: `translateX(calc(-50% + ${CONTENT_WIDTH / 2}px))`,
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl text-amber-400 tracking-wider">
                        Pen & P.
                        <i className="not-italic drop-shadow-[0_0_4px_rgba(252,211,77,0.4)]">
                            A.I.
                        </i>
                        per
                    </h1>
                    <p className="text-stone-300 mt-2 font-immortal">
                        Your Digital Scribe for Adventures & Archives
                    </p>
                    <nav className="mt-6 flex justify-center">
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
