import React, { useEffect, useState } from 'react';

type Status = 'connecting' | 'connected' | 'disconnected' | 'error';

interface StatusIconProps {
    status: Status;
}

const statusEmojis: Record<Status, string[]> = {
    connecting: ['🧙‍♂️', '🪄', '🔮', '🫧'],
    connected: ['🧙‍♂️', '✨', '🔮', '📜'],
    disconnected: ['🧙‍♂️', '🔗', '❌'],
    error: ['🧙‍♂️', '⚠️', '💥'],
};

export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
    const [emojiIndex, setEmojiIndex] = useState(0);
    const emojiSequence = statusEmojis[status];

    useEffect(() => {
        setEmojiIndex(0); // reset when status changes
        const interval = setInterval(() => {
            setEmojiIndex(prev => (prev + 1) % emojiSequence.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [status]);

    return (
        <span className="text-2xl animate-pulse transition duration-1000">
            {emojiSequence[emojiIndex]}
        </span>
    );
};
