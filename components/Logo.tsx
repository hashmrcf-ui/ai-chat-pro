import React from 'react';

export const Logo = ({
    className = "",
    iconSize = "w-8 h-8",
    showText = true,
    textSize = "text-xl"
}: {
    className?: string,
    iconSize?: string,
    showText?: boolean,
    textSize?: string
}) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`relative flex items-center justify-center shrink-0 ${iconSize}`}>
                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <rect width="100" height="100" rx="16" fill="#1e293b" />

                    {/* The Star */}
                    <path
                        d="M50 15 C 55 40, 60 45, 85 50 C 60 55, 55 60, 50 85 C 45 60, 40 55, 15 50 C 40 45, 45 40, 50 15 Z"
                        fill="#fff"
                        filter="drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))"
                    />

                    {/* Subtle Orbit */}
                    <circle
                        cx="50"
                        cy="50"
                        r="25"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="0.5"
                        strokeDasharray="4 4"
                    />
                </svg>
            </div>

            {showText && (
                <span className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-gray-300 ${textSize}`}>
                    Vibe AI
                </span>
            )}
        </div>
    );
};
