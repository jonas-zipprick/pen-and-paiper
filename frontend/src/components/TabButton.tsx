import React from 'react';

interface TabButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

export const TabButton = ({ label, isActive, onClick }: TabButtonProps) => (
    <button
        onClick={onClick}
        className={`px-4 py-1 text-lg border-b-2 transition-colors duration-300 ${
            isActive
                ? 'text-amber-400 border-amber-400'
                : 'text-stone-300 border-transparent hover:text-amber-300'
        }`}
    >
        {label}
    </button>
);