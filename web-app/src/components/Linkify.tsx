import React from 'react';

// Regex to find URLs (http/https)
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface LinkifyProps {
    children: string;
}

export const Linkify: React.FC<LinkifyProps> = ({ children }) => {
    if (!children) return null;

    const parts = children.split(URL_REGEX);

    return (
        <>
            {parts.map((part, index) => {
                if (part.match(URL_REGEX)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chat-link"
                            onClick={(e) => e.stopPropagation()} // Prevent triggering message click
                            style={{ color: 'var(--brand)', textDecoration: 'underline' }}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
};
