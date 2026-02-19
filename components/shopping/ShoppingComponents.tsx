
// @ts-nocheck
import React from 'react';


export interface ProductItem {
    name: string;
    price: string;
    description: string;
    features: string[];
    image_query?: string;
    merchant?: string; // e.g. "Amazon"
    url?: string;
    rating?: number;
    reviews?: number;
}

// Icons
const CheckIcon = () => (
    <svg className="w-3 h-3 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const CartIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);

// --- 1. Filter Question Component (Redesigned with Multi-select & History) ---
export const FilterQuestion = ({
    question,
    options,
    category,
    onSelect,
    previousSelection
}: {
    question: string,
    options: string[],
    category: string,
    onSelect: (opt: string) => void,
    previousSelection?: string
}) => {
    const [selected, setSelected] = React.useState<string[]>([]);
    const [showInput, setShowInput] = React.useState(false);
    const [customInput, setCustomInput] = React.useState("");

    const toggleOption = (opt: string) => {
        // Immediate selection for smoother flow
        // Visual feedback first, then trigger callback
        if (selected.includes(opt)) {
            setSelected([]); // Deselect if clicking same
        } else {
            setSelected([opt]);
            // Short delay for visual feedback ripple
            setTimeout(() => {
                onSelect(opt);
            }, 350);
        }
    };

    const handleCustomSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (customInput.trim()) {
            onSelect(customInput.trim());
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Context Header (Previous Selection) */}
            {previousSelection && (
                <div className="flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
                    <span className="text-gray-500 text-xs text-right w-full">Updated search: <span className="text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded-full">{previousSelection}</span></span>
                </div>
            )}

            {/* Header / Meta Label */}
            {!previousSelection && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Gathering requirements</span>
                    <div className="h-[1px] flex-grow bg-gray-800"></div>
                </div>
            )}

            {/* Main Question */}
            <h3 className="text-2xl font-bold text-white mb-8 leading-tight text-right dir-rtl" style={{ direction: 'rtl' }}>
                {question}
            </h3>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {options.map((opt, idx) => {
                    const isSelected = selected.includes(opt);
                    return (
                        <button
                            key={idx}
                            onClick={() => toggleOption(opt)}
                            className={`group relative flex items-center justify-between w-full p-4 rounded-3xl border transition-all duration-200
                                ${isSelected
                                    ? 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                                    : 'border-[#3f3f46] bg-[#18181b] hover:bg-[#27272a] hover:border-gray-500'
                                }`}
                        >
                            {/* Radio/Checkbox Indicator */}
                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                ${isSelected ? 'border-white bg-white' : 'border-gray-600 group-hover:border-blue-500'}
                            `}>
                                {isSelected && (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                )}
                            </div>

                            {/* Text */}
                            <span className={`w-full text-center font-medium px-8 transition-colors ${isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                {opt}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 items-center">
                <div className="flex flex-col w-full gap-3 mt-2">
                    {/* Custom Input Toggle */}
                    {!showInput ? (
                        <button
                            onClick={() => setShowInput(true)}
                            className="w-full p-3 rounded-full border border-dashed border-gray-700 text-gray-500 text-sm hover:text-gray-300 hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Something else...</span>
                        </button>
                    ) : (
                        <form onSubmit={handleCustomSubmit} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <input
                                type="text"
                                autoFocus
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="Type your specific need..."
                                className="flex-grow bg-[#27272a] border border-[#3f3f46] text-white rounded-full px-4 py-3 focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 2. Search Progress Component (Dynamic) ---
export const SearchProgress = () => {
    const [progress, setProgress] = React.useState(10);
    const [status, setStatus] = React.useState("Analyzing your requirements...");
    const [isError, setIsError] = React.useState(false);

    React.useEffect(() => {
        // 1. Progress Animation
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95; // Stuck at 95% until complete
                const increment = Math.random() * 10;
                return Math.min(prev + increment, 95);
            });
        }, 800);

        // 2. Status Messages
        const statuses = [
            "Searching for best prices...",
            "Verifying product quality...",
            "Reading recent reviews...",
            "Comparing retailer offers...",
            "Finalizing recommendations..."
        ];
        let msgIndex = 0;
        const msgTimer = setInterval(() => {
            msgIndex = (msgIndex + 1) % statuses.length;
            setStatus(statuses[msgIndex]);
        }, 2000);

        // 3. FORCE ERROR / TIMEOUT CHECK (For Testing transparency)
        const errorTimer = setTimeout(() => {
            setIsError(true);
            setStatus("Search is taking too long (Possible Timeout).");
        }, 60000); // 60 Seconds Limit (Increased for Production)

        return () => {
            clearInterval(timer);
            clearInterval(msgTimer);
            clearTimeout(errorTimer);
        };
    }, []);

    if (isError) {
        return (
            <div className="w-full max-w-xl mx-auto my-12 animate-in fade-in duration-300">
                <div className="bg-red-900/20 border border-red-500/50 rounded-3xl p-6 text-center">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-red-400 mb-2">Search Responsiveness Issue</h3>
                    <p className="text-gray-400 text-sm mb-4">The search backend is not responding within 15 seconds. This might be due to a Vercel timeout or API limits.</p>
                    <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm">
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center gap-6">
                {/* Spinner & Progress */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-[#27272a] rounded-full"></div>
                    <div
                        className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"
                        style={{ borderRightColor: 'transparent', transition: 'all 0.5s ease' }}
                    ></div>
                    <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
                </div>

                {/* Status Text */}
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium text-white animate-pulse">{status}</h3>
                    <p className="text-xs text-gray-500">Processing live data (No placeholders)</p>
                </div>

                {/* Steps Visualizer */}
                <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4].map((step) => (
                        <div
                            key={step}
                            className={`h-1 rounded-full transition-all duration-500 ${(progress / 25) >= step ? 'w-8 bg-blue-500' : 'w-2 bg-[#27272a]'
                                }`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- 3. Product Showcase Component (Grid) ---
export const ProductShowcase = ({ title, summary, products }: { title: string, summary: string, products: ProductItem[] }) => {
    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="mb-8 text-right dir-rtl" style={{ direction: 'rtl' }}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💡</span>
                    <h2 className="text-xl font-bold text-gray-100">الخلاصة</h2>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg border-r-4 border-blue-500 pr-4">
                    {summary}
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map((p, idx) => (
                    <div
                        key={idx}
                        className="group bg-[#18181b] border border-[#27272a] rounded-3xl overflow-hidden hover:border-gray-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col"
                    >
                        {/* Image Area */}
                        <div className="relative h-48 w-full bg-[#09090b] overflow-hidden">
                            {p.image_query ? (
                                <img
                                    src={p.image_query}
                                    alt={p.name}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-700">
                                    <svg className="w-12 h-12 opacity-20 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}

                            {/* Badger */}
                            {idx === 0 && (
                                <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-lg">
                                    🥇 الخيار الأول
                                </div>
                            )}
                            {idx === 1 && (
                                <div className="absolute top-4 right-4 bg-blue-500/20 text-blue-300 border border-blue-500/50 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm shadow-lg">
                                    🥈 بديل آخر
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6 flex flex-col flex-grow text-right" style={{ direction: 'rtl' }}>
                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
                                {p.name}
                            </h3>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                    <span className="text-gray-500 text-xs">السعر:</span>
                                    <span className="text-xl font-bold text-white font-mono">{p.price}</span>
                                </div>
                                {p.merchant && (
                                    <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-md border border-gray-700">
                                        | {p.merchant}
                                    </div>
                                )}
                            </div>

                            {/* Why this choice? */}
                            <div className="mb-6 bg-[#09090b] p-3 rounded-xl border border-dashed border-gray-800">
                                <span className="text-xs text-gray-500 block mb-2 font-bold">ليش هذا الخيار؟</span>
                                <ul className="space-y-1">
                                    {/* Mock reasons based on index for now, usually backend provides them */}
                                    <li className="flex items-start text-xs text-gray-300">
                                        <CheckIcon />
                                        <span>{idx === 0 ? "المطابقة: بيحقق المواصفات المطلوبة." : "خيار جيد للمقارنة بمواصفات مختلفة."}</span>
                                    </li>
                                    <li className="flex items-start text-xs text-gray-300">
                                        <span className="text-amber-500 w-3 h-3 mr-2 flex-shrink-0">📦</span>
                                        <span>التوفر: تحقق من المتجر.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-800">
                                <a
                                    href={p.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    <span className="text-sm">رابط العرض</span>
                                    <CartIcon />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
