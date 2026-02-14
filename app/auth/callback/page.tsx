'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // The supabase client automatically handles the hash/code parsing validation
        // We just need to listen for the sign-in event or check session
        const handleAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session) {
                router.push('/');
            } else if (error) {
                console.error('Auth error:', error);
                router.push('/login?error=AuthFailed');
            } else {
                 // If no session & no error, it might be processing, or we can listen for the event
                 // But typically getSession handles the URL parsing immediately on load
                 
                 // Fallback listener
                 const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN') {
                        router.push('/');
                    }
                 });
                 return () => subscription.unsubscribe();
            }
        };

        handleAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#212121]">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Authenticating...</p>
            </div>
        </div>
    );
}
