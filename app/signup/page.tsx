'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/lib/auth';
import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function SignupPage() {
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
    const [userIp, setUserIp] = useState('');

    useEffect(() => {
        // Check if registration is enabled
        const checkRegistration = async () => {
            const { getAppFeatures } = await import('@/lib/config');
            const features = await getAppFeatures();
            if (!features.registrationEnabled) {
                setIsRegistrationClosed(true);
            }
        };

        // Fetch User IP
        const fetchIp = async () => {
            try {
                const res = await fetch('/api/auth/ip');
                const data = await res.json();
                setUserIp(data.ip);
            } catch (err) {
                console.error('Failed to fetch IP:', err);
            }
        };

        checkRegistration();
        fetchIp();
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isRegistrationClosed) {
            setError('التسجيل مغلق حالياً من قبل المسؤول.');
            return;
        }

        if (password !== confirmPassword) {
            setError('كلمات المرور غير متطابقة');
            return;
        }

        setIsLoading(true);

        const result = await createUser(name, email, password, userIp);

        if (result.success) {
            // Auto-login after signup
            router.push('/login');
        } else {
            // Prominent error mapping for IP restriction
            if (result.error?.includes('unique_registration_ip') || result.error?.includes('last_ip')) {
                setError('هذا الجهاز مسجل به حساب آخر بالفعل. يُسمح بحساب واحد فقط لكل جهاز.');
            } else {
                setError(result.error || 'فشل عملية التسجيل');
            }
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#212121] transition-colors">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="fixed top-4 right-4 p-3 rounded-xl bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition-all"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {isDarkMode ? <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Moon className="w-5 h-5 text-gray-700" />}
            </button>

            <div className="w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="mb-4">
                        <Logo className="w-16 h-16" iconSize="w-16 h-16" showText={false} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
                    <p className="text-gray-600 dark:text-gray-400">Join Vibe AI today</p>
                </div>

                {/* Signup Form */}
                {isRegistrationClosed ? (
                    <div className="text-center p-8 bg-gray-50 dark:bg-[#2f2f2f] rounded-2xl border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Registration Closed</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            New account registration is currently disabled by the administrator. Please try again later.
                        </p>
                        <Link href="/login" className="px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {isLoading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-[#212121] text-gray-500">Or sign up with</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setIsLoading(true);
                                import('@/lib/auth').then((mod) => mod.loginWithGoogle());
                            }}
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#3f3f3f] transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Sign up with Google
                        </button>
                    </>
                )}

                {/* Login Link */}
                <div className="mt-6 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
