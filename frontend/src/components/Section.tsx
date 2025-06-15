import React from 'react';
import ReactMarkdown from 'react-markdown';

export const Section = ({ title, content }: { title: string; content: string }) => (
    <div className="flex flex-col">
        <SectionHeader title={title} />
        <div
            className="p-6 rounded-md shadow-inner border border-amber-800/50 bg-cover"
            style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/natural-paper.png")`,
                backgroundAttachment: 'local',
                backgroundColor: 'rgba(245, 245, 220, 0.8)',
            }}
        >
            <MarkdownDisplay markdownContent={content} />
        </div>
    </div>
);

// Helper component for thematic section headers
const SectionHeader = ({ title }: { title: string }) => (
    <div className="text-center my-4">
        <h3 className="text-3xl font-immortal text-amber-400 tracking-wider">{title}</h3>
    </div>
);

// Component to render styled Markdown
const MarkdownDisplay = ({ markdownContent }: { markdownContent: string }) => {
    return (
        <ReactMarkdown
            components={{
                p: ({ node, ...props }) => <p className="font-im-fell text-stone-700 text-xl leading-relaxed mb-4" {...props} />,
                h1: ({ node, ...props }) => <h1 className="font-immortal text-stone-700 text-3xl mb-3" {...props} />,
                h2: ({ node, ...props }) => <h2 className="font-immortal text-stone-700 text-2xl mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="font-immortal text-stone-700 text-xl mb-2" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside font-im-fell text-stone-700 text-lg mb-4 pl-4" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside font-im-fell text-stone-700 text-lg mb-4 pl-4" {...props} />,
                li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-amber-950" {...props} />,
                em: ({ node, ...props }) => <em className="italic" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-amber-800 pl-4 italic text-stone-700 my-4" {...props} />,
            }}
        >
            {markdownContent}
        </ReactMarkdown>
    );
};