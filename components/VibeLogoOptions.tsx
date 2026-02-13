import React from 'react';

// 1. The Spark (Original Selected)
export const LogoSpark = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="#18181b" />
            <path d="M50 15 L58 38 L85 50 L58 62 L50 85 L42 62 L15 50 L42 38 Z" fill="url(#sparkGrad)" />
        </svg>
    </div>
);

// 2. Vibe Pulse
export const LogoPulse = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="#0f172a" />
            <path stroke="url(#pulseGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
                d="M20 50 L35 70 L50 20 L65 80 L80 50" />
        </svg>
    </div>
);

// 3. Neural Vertex
export const LogoVertex = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="50" fill="#000" />
            <g transform="translate(50, 50)" fill="none" stroke="#e2e8f0" strokeWidth="2">
                <path d="M0 -25 L22 12 L-22 12 Z" />
                <circle cx="0" cy="-25" r="4" fill="#fff" stroke="none" />
                <circle cx="22" cy="12" r="4" fill="#fff" stroke="none" />
                <circle cx="-22" cy="12" r="4" fill="#fff" stroke="none" />
            </g>
        </svg>
    </div>
);

// 4. Liquid Gold
export const LogoLiquid = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#18181b" />
            <path fill="url(#liquidGrad)"
                d="M50 85 C 30 85, 20 60, 20 40 C 20 25, 30 20, 30 20 C 30 20, 40 35, 50 60 C 60 35, 70 20, 70 20 C 70 20, 80 25, 80 40 C 80 60, 70 85, 50 85 Z" />
        </svg>
    </div>
);

// 5. Quantum Orbit
export const LogoQuantum = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="#0f172a" stroke="#1e293b" />
            <ellipse cx="50" cy="50" rx="35" ry="15" stroke="url(#orbitGrad)" strokeWidth="2" fill="none" transform="rotate(-45 50 50)" />
            <ellipse cx="50" cy="50" rx="35" ry="15" stroke="url(#orbitGrad)" strokeWidth="2" fill="none" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="6" fill="white" />
        </svg>
    </div>
);

// 6. Visionary Eye
export const LogoEye = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="50" fill="#000" />
            <path d="M20 50 Q 50 20, 80 50 Q 50 80, 20 50 Z" stroke="url(#eyeGrad)" strokeWidth="3" fill="none" />
            <circle cx="50" cy="50" r="10" fill="url(#eyeGrad)" />
        </svg>
    </div>
);

// 7. Infinity Flow
export const LogoInfinity = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#18181b" />
            <path d="M30 65 C 10 65, 10 35, 30 35 C 45 35, 55 65, 70 65 C 90 65, 90 35, 70 35 C 55 35, 45 65, 30 65 Z"
                stroke="url(#infGrad)" strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
    </div>
);

// 8. The Phoenix
export const LogoPhoenix = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="phoenixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff4d4d" />
                    <stop offset="100%" stopColor="#f9cb28" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#1c1917" />
            <path d="M20 40 Q 50 80, 80 40 L 50 15 Z" fill="url(#phoenixGrad)" opacity="0.9" />
            <path d="M50 25 L 70 45 L 50 75 L 30 45 Z" fill="#fff" />
        </svg>
    </div>
);

// 9. Digital Hexagon
export const LogoHexagon = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
            </defs>
            <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="url(#hexGrad)" strokeWidth="4" />
            <path d="M50 10 L50 50 L85 70" stroke="url(#hexGrad)" strokeWidth="2" opacity="0.5" fill="none" />
            <circle cx="50" cy="50" r="8" fill="#fff" />
        </svg>
    </div>
);

// 10. Zen Circle
export const LogoZen = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="zenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="50" fill="#0f172a" />
            <path d="M50 20 A 30 30 0 1 1 25 65" stroke="url(#zenGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="65" cy="65" r="6" fill="#fff" />
        </svg>
    </div>
);

// 14. The Jambiya Arc (Heritage & Strength)
export const LogoJambiya = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="jambiyaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" /> {/* Yemen Gold */}
                    <stop offset="100%" stopColor="#8b4513" /> {/* Leather/History */}
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#1c1917" />

            {/* The Curve */}
            <path d="M30 20 C 30 20, 35 60, 50 80 C 65 60, 85 30, 85 30"
                fill="none" stroke="url(#jambiyaGrad)" strokeWidth="8" strokeLinecap="round" />
            <path d="M50 80 L 50 20" stroke="#fff" strokeWidth="1" opacity="0.2" />
        </svg>
    </div>
);

// 15. Sheba's Geometry (History & Architecture)
export const LogoSheba = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shebaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" /> {/* Red Clay */}
                    <stop offset="100%" stopColor="#78350f" /> {/* Brick */}
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />

            {/* Step Pattern (Musnad/Architecture style) */}
            <path d="M20 80 L 20 50 L 35 50 L 35 35 L 65 35 L 65 50 L 80 50 L 80 80"
                fill="none" stroke="url(#shebaGrad)" strokeWidth="6" strokeLinejoin="round" />
            <circle cx="50" cy="65" r="6" fill="#000" />
        </svg>
    </div>
);

// 16. Mocca Mind (Origin & Growth)
export const LogoMocca = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="moccaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#166534" /> {/* Coffee Leaf Green */}
                    <stop offset="100%" stopColor="#14532d" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="50" fill="#fcfbf8" stroke="#d6d3d1" strokeWidth="1" />

            {/* Bean Shape split like a Brain */}
            <path d="M50 20 C 70 20, 80 40, 80 60 C 80 80, 60 90, 50 80 C 40 90, 20 80, 20 60 C 20 40, 30 20, 50 20 Z"
                fill="url(#moccaGrad)" opacity="0.9" />
            <path d="M50 25 C 50 25, 60 40, 50 55 C 40 70, 50 80, 50 80"
                stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
    </div>
);

// 17. Soqotra Tree (Unique & Network)
export const LogoSoqotra = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="soqotraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dc2626" /> {/* Dragon Blood Red */}
                    <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#18181b" />

            {/* Trunk */}
            <path d="M50 90 L 50 60" stroke="#a8a29e" strokeWidth="4" strokeLinecap="round" />

            {/* Canopy Network */}
            <path d="M20 50 Q 50 30, 80 50" stroke="url(#soqotraGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M25 55 Q 50 40, 75 55" stroke="url(#soqotraGrad)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
            <path d="M30 60 Q 50 50, 70 60" stroke="url(#soqotraGrad)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>
    </div>
);

// 11. The Prism (Transformation)
export const LogoPrism = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="#000" />

            {/* The Beam */}
            <path d="M0 50 L35 50" stroke="#fff" strokeWidth="2" opacity="0.3" />

            {/* The Triangle */}
            <path d="M35 80 L65 20 L95 80 Z" stroke="url(#prismGrad)" strokeWidth="2" fill="none" opacity="0.8" />

            {/* The Spectrum Output */}
            <path d="M60 45 L100 35" stroke="#ef4444" strokeWidth="2" opacity="0.8" /> {/* Red */}
            <path d="M62 50 L100 50" stroke="#22c55e" strokeWidth="2" opacity="0.8" /> {/* Green */}
            <path d="M60 55 L100 65" stroke="#3b82f6" strokeWidth="2" opacity="0.8" /> {/* Blue */}
        </svg>
    </div>
);

// 12. The Echo (Impact)
export const LogoEcho = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="echoGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="1" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" rx="50" fill="#0f172a" />

            {/* Center Drop */}
            <circle cx="50" cy="50" r="8" fill="#fff" />

            {/* Ripples */}
            <circle cx="50" cy="50" r="18" fill="none" stroke="#0ea5e9" strokeWidth="2" opacity="0.8" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.2" />
        </svg>
    </div>
);

// 13. The North Star (Guidance)
export const LogoNorthStar = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="16" fill="#1e293b" />

            {/* The Star */}
            <path d="M50 15 C 55 40, 60 45, 85 50 C 60 55, 55 60, 50 85 C 45 60, 40 55, 15 50 C 40 45, 45 40, 50 15 Z"
                fill="#fff" filter="drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))" />

            {/* Subtle Orbit */}
            <circle cx="50" cy="50" r="25" fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
    </div>
);

// 18. Musnad
export const LogoMusnad = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="musnadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c2d12" /> {/* Bronze/Clay */}
                    <stop offset="100%" stopColor="#451a03" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="1" />

            {/* Stylized Musnad Character (resembling V) */}
            <path d="M50 20 L 50 80 M 20 20 L 50 50 L 80 20"
                fill="none" stroke="url(#musnadGrad)" strokeWidth="8" strokeLinecap="square" strokeLinejoin="miter" />
            <circle cx="50" cy="80" r="4" fill="#7c2d12" />
        </svg>
    </div>
);

// 19. Shibam
export const LogoShibam = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shibamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d97706" /> {/* Mud Brick */}
                    <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#fff7ed" />

            {/* Skyscrapers */}
            <rect x="25" y="40" width="15" height="40" fill="url(#shibamGrad)" rx="2" />
            <rect x="42.5" y="20" width="15" height="60" fill="url(#shibamGrad)" rx="2" />
            <rect x="60" y="35" width="15" height="45" fill="url(#shibamGrad)" rx="2" />

            {/* Windows */}
            <path d="M30 50 h5 M47.5 30 h5 M47.5 45 h5 M65 45 h5" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
        </svg>
    </div>
);

// 20. Marib
export const LogoMarib = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="maribStone" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#57534e" /> {/* Ancient Stone */}
                    <stop offset="100%" stopColor="#292524" />
                </linearGradient>
                <linearGradient id="maribWater" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="30" fill="#1c1917" />

            {/* Dam Pillars */}
            <path d="M20 20 L35 20 L40 90 L15 90 Z" fill="url(#maribStone)" />
            <path d="M80 20 L65 20 L60 90 L85 90 Z" fill="url(#maribStone)" />

            {/* Water Flowing Through */}
            <path d="M40 55 C 40 55, 50 75, 60 55" stroke="url(#maribWater)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M35 70 C 40 90, 60 90, 65 70" stroke="url(#maribWater)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>
    </div>
);

// 21. Qamariya
export const LogoQamariya = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="50" fill="#18181b" stroke="#fbbf24" strokeWidth="2" />

            {/* Geometric Pattern */}
            <g transform="translate(50,50)">
                <circle r="40" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.5" />

                {/* Petals */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                    <g key={i} transform={`rotate(${deg})`}>
                        <ellipse cx="0" cy="-20" rx="10" ry="20" fill={i % 2 === 0 ? "#ef4444" : "#3b82f6"} opacity="0.8" />
                        <circle cx="0" cy="-35" r="4" fill="#fbbf24" />
                    </g>
                ))}

                <circle r="10" fill="#10b981" />
            </g>
        </svg>
    </div>
);

// 22. Aqeeq
export const LogoAqeeq = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="aqeeqGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7f1d1d" /> {/* Deep Red Carnelian */}
                    <stop offset="100%" stopColor="#450a0a" />
                </linearGradient>
                <radialGradient id="aqeeqShine" cx="30%" cy="30%" r="50%">
                    <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
            </defs>
            {/* Gem Shape */}
            <path d="M50 10 L 90 30 L 90 70 L 50 90 L 10 70 L 10 30 Z" fill="url(#aqeeqGrad)" stroke="#b91c1c" strokeWidth="1" />
            <path d="M50 10 L 90 30 L 90 70 L 50 90 L 10 70 L 10 30 Z" fill="url(#aqeeqShine)" />

            {/* Tech Circuit Inside */}
            <path d="M50 30 L 50 70 M 30 50 L 70 50 M 30 40 L 70 60"
                stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <circle cx="50" cy="50" r="4" fill="#fbbf24" />
            <circle cx="30" cy="50" r="2" fill="#fbbf24" />
            <circle cx="70" cy="50" r="2" fill="#fbbf24" />
        </svg>
    </div>
);

// 23. Kufic
export const LogoKufic = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="10" fill="#171717" />

            {/* Stylized Kufic 'V' / 'AI' */}
            <path d="M25 25 h15 v35 h20 v-35 h15 v50 h-50 Z"
                fill="none" stroke="#fff" strokeWidth="4" />

            {/* Dot (Nuqta) as Digital Light */}
            <rect x="42.5" y="45" width="15" height="15" fill="#22c55e" />
            <path d="M25 25 h-5 M80 25 h-5 M25 75 h-5 M80 75 h-5" stroke="#404040" strokeWidth="2" />
        </svg>
    </div>
);

// 24. Lattice
export const LogoLattice = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="latticePat" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M10 0 L 20 10 L 10 20 L 0 10 Z" fill="none" stroke="#ca8a04" strokeWidth="1" opacity="0.3" />
                </pattern>
            </defs>
            <rect width="100" height="100" rx="0" fill="#000" />
            <rect width="100" height="100" fill="url(#latticePat)" />

            {/* Central Node */}
            <path d="M50 20 L 80 50 L 50 80 L 20 50 Z" stroke="#fbbf24" strokeWidth="2" fill="none" />
            <circle cx="50" cy="20" r="3" fill="#fbbf24" />
            <circle cx="80" cy="50" r="3" fill="#fbbf24" />
            <circle cx="50" cy="80" r="3" fill="#fbbf24" />
            <circle cx="20" cy="50" r="3" fill="#fbbf24" />
            <circle cx="50" cy="50" r="6" fill="#fbbf24" />
        </svg>
    </div>
);

// 25. Oasis
export const LogoOasis = ({ className = "w-12 h-12" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="oasisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" /> {/* Emerald */}
                    <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="50" fill="#f0fdf4" stroke="#a7f3d0" strokeWidth="1" />

            {/* Abstract Palm/Water Core */}
            <path d="M50 80 C 30 80, 20 60, 50 30 C 80 60, 70 80, 50 80" fill="url(#oasisGrad)" />
            <path d="M50 30 L 50 15" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M50 50 C 50 50, 40 60, 60 60" stroke="#fff" strokeWidth="2" fill="none" opacity="0.5" />
        </svg>
    </div>
);


export const VibeLogoShowcase = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
            <div className="bg-[#111] border border-[#333] rounded-3xl p-8 max-w-7xl w-full text-center shadow-2xl relative my-10">
                <div className="absolute top-6 left-0 w-full text-center text-gray-400 text-sm uppercase tracking-widest font-bold">Choose Your Vibe</div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-12">

                    {/* 1. Spark */}
                    <LogoCard Component={LogoSpark} name="The Spark" desc="Gold • Luxury" />

                    {/* 2. Pulse */}
                    <LogoCard Component={LogoPulse} name="Vibe Pulse" desc="Energy • Sound" />

                    {/* 3. Vertex */}
                    <LogoCard Component={LogoVertex} name="Neural Vertex" desc="AI • Network" />

                    {/* 4. Liquid */}
                    <LogoCard Component={LogoLiquid} name="Liquid Gold" desc="Organic • Flow" />

                    {/* 5. Quantum */}
                    <LogoCard Component={LogoQuantum} name="Quantum" desc="Future • Science" />

                    {/* 6. Eye */}
                    <LogoCard Component={LogoEye} name="Visionary" desc="Focus • Insight" />

                    {/* 7. Infinity */}
                    <LogoCard Component={LogoInfinity} name="Infinity" desc="Limitless • Power" />

                    {/* 8. Phoenix */}
                    <LogoCard Component={LogoPhoenix} name="The Phoenix" desc="Rebirth • Fire" />

                    {/* 9. Hexagon */}
                    <LogoCard Component={LogoHexagon} name="Hexagon" desc="Tech • Structure" />

                    {/* 10. Zen */}
                    <LogoCard Component={LogoZen} name="Zen Circle" desc="Peace • Minimal" />

                    {/* 11. Prism */}
                    <LogoCard Component={LogoPrism} name="The Prism" desc="Transformation" />

                    {/* 12. Echo */}
                    <LogoCard Component={LogoEcho} name="The Echo" desc="Impact • Reach" />

                    {/* 13. North Star */}
                    <LogoCard Component={LogoNorthStar} name="North Star" desc="Guidance • Hope" />

                    {/* 14. Jambiya */}
                    <LogoCard Component={LogoJambiya} name="The Curved Blade" desc="Heritage • Strength" />

                    {/* 15. Sheba */}
                    <LogoCard Component={LogoSheba} name="Sheba's Throne" desc="History • Build" />

                    {/* 16. Mocca */}
                    <LogoCard Component={LogoMocca} name="Mocca Mind" desc="Origin • Growth" />

                    {/* 17. Soqotra */}
                    <LogoCard Component={LogoSoqotra} name="Soqotra Net" desc="Unique • Life" />

                    {/* 18. Musnad */}
                    <LogoCard Component={LogoMusnad} name="The Musnad V" desc="Ancient • Script" />

                    {/* 19. Shibam */}
                    <LogoCard Component={LogoShibam} name="Shibam Rise" desc="Desert • Build" />

                    {/* 20. Marib */}
                    <LogoCard Component={LogoMarib} name="Marib Flow" desc="Engineering • Power" />

                    {/* 21. Qamariya */}
                    <LogoCard Component={LogoQamariya} name="Qamariya Light" desc="Art • Vision" />

                    {/* 22. Aqeeq */}
                    <LogoCard Component={LogoAqeeq} name="Smart Aqeeq" desc="Gem • Tech" />

                    {/* 23. Kufic */}
                    <LogoCard Component={LogoKufic} name="Cyber Kufic" desc="Heritage • Logic" />

                    {/* 24. Lattice */}
                    <LogoCard Component={LogoLattice} name="Golden Lattice" desc="Network • Art" />

                    {/* 25. Oasis */}
                    <LogoCard Component={LogoOasis} name="Oasis Core" desc="Life • Source" />

                </div>
            </div>
        </div>
    );
};

const LogoCard = ({ Component, name, desc }: { Component: any, name: string, desc: string }) => (
    <div className="group flex flex-col items-center gap-4 p-6 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-transparent hover:border-white/20 transition-all cursor-pointer">
        <div className="transform group-hover:scale-110 transition-transform duration-300">
            <Component className="w-20 h-20" />
        </div>
        <div>
            <h3 className="font-bold text-white text-sm mb-1">{name}</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{desc}</p>
        </div>
    </div>
);
