import React from 'react';

export const NanoBananaLogo = ({ className = "w-32 h-32" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="nanoBananaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#facc15" /> {/* Yellow-400 */}
                    <stop offset="100%" stopColor="#eab308" /> {/* Yellow-500 */}
                </linearGradient>
                <linearGradient id="techDark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#18181b" /> {/* Zinc-900 */}
                    <stop offset="100%" stopColor="#27272a" /> {/* Zinc-800 */}
                </linearGradient>
                <filter id="glowBanana">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background Chip/Plate */}
            <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#techDark)" stroke="#3f3f46" strokeWidth="1" />

            {/* Nano Circuit Lines Background */}
            <path d="M20 50 L40 50 L45 40 L55 40 M70 80 L70 60 L80 60" stroke="#333" strokeWidth="2" fill="none" />
            <circle cx="20" cy="50" r="2" fill="#444" />
            <circle cx="80" cy="60" r="2" fill="#444" />

            {/* The Cyber Banana Shape */}
            <path
                d="M30 70 Q 20 60, 25 40 Q 30 20, 60 25 Q 80 30, 85 50 Q 90 70, 60 80 Q 40 85, 30 70 Z"
                fill="none"
                stroke="url(#nanoBananaGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowBanana)"
            />

            {/* Tech details on the banana */}
            <path d="M35 65 Q 30 55, 35 45" stroke="#facc15" strokeWidth="2" opacity="0.5" fill="none" />
            <path d="M50 75 Q 45 65, 50 55" stroke="#facc15" strokeWidth="2" opacity="0.5" fill="none" />
            <circle cx="70" cy="40" r="3" fill="#facc15" />

            {/* Nano Nodes */}
            <circle cx="60" cy="25" r="4" fill="#fff" stroke="#eab308" strokeWidth="2" />
        </svg>
    </div>
);
