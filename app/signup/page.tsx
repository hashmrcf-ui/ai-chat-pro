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

    useEffect(() => {
        // Check if registration is enabled
        const checkRegistration = async () => {
            const { getAppFeatures } = await import('@/lib/config');
            const features = await getAppFeatures();
            if (!features.registrationEnabled) {
                setIsRegistrationClosed(true);
            }
        };
        checkRegistration();
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
            setError('Registration is currently closed.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        const result = await createUser(name, email, password);

        if (result.success) {
            // Auto-login after signup
            router.push('/login');
        } else {
            setError(result.error || 'Signup failed');
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
