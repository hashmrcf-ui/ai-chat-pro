import { supabase } from './supabase';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    is_admin: boolean;
    created_at: string;
}

export interface AuthSession {
    user: any;
    access_token: string;
}

// Create a new user (Signup)
export async function createUser(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            }
        }
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// Login user
export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// Logout user
export async function logoutUser(): Promise<void> {
    await supabase.auth.signOut();
}

// Get current user profile from public.users table
export async function getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data as UserProfile;
}

// Check if user is logged in
export async function isLoggedIn(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return user !== null;
}

// Check if current user is admin
export async function checkIsAdmin(): Promise<boolean> {
    const user = await getCurrentUser();
    return user?.is_admin || false;
}

// Get all users (admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return [];

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all users:', error);
        return [];
    }

    return data as UserProfile[];
}
