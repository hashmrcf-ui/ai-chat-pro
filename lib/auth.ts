// Simple Authentication System for Local Storage
// Note: This is for development/personal use only. For production, use NextAuth.js or similar.

export interface User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: number;
    isAdmin: boolean;
    lastLogin?: number;
}

export interface AuthSession {
    userId: string;
    email: string;
    name: string;
    loginTime: number;
}

// Simple hash function (NOT cryptographically secure - for demo only)
// In production, use bcrypt or similar on the server side
async function simpleHash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_ai_chat_pro');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get all users from localStorage
function getUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const usersJson = localStorage.getItem('users');
    return usersJson ? JSON.parse(usersJson) : [];
}

// Save users to localStorage
function saveUsers(users: User[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('users', JSON.stringify(users));
}

// Create a new user
export async function createUser(name: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    // Validation
    if (!name || !email || !password) {
        return { success: false, error: 'All fields are required' };
    }

    if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' };
    }

    // Check if user already exists
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'Email already registered' };
    }

    // Create new user
    const passwordHash = await simpleHash(password);
    // Admin emails list
    const adminEmails = ['admin@aichatpro.com', 'youremail@example.com'];
    const isAdmin = adminEmails.includes(email.toLowerCase());
    const newUser: User = {
        id: Date.now().toString(),
        name,
        email: email.toLowerCase(),
        passwordHash,
        createdAt: Date.now(),
        isAdmin,
        lastLogin: Date.now()
    };

    users.push(newUser);
    saveUsers(users);

    return { success: true, user: newUser };
}

// Login user
export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        return { success: false, error: 'Invalid email or password' };
    }

    const passwordHash = await simpleHash(password);
    if (passwordHash !== user.passwordHash) {
        return { success: false, error: 'Invalid email or password' };
    }

    // Update last login
    user.lastLogin = Date.now();
    const allUsers = getUsers();
    const userIndex = allUsers.findIndex(u => u.id === user.id);
    if (userIndex >= 0) {
        allUsers[userIndex] = user;
        saveUsers(allUsers);
    }

    // Create session
    const session: AuthSession = {
        userId: user.id,
        email: user.email,
        name: user.name,
        loginTime: Date.now()
    };

    localStorage.setItem('authSession', JSON.stringify(session));

    return { success: true, session };
}

// Get current session
export function getCurrentSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    const sessionJson = localStorage.getItem('authSession');
    return sessionJson ? JSON.parse(sessionJson) : null;
}

// Check if user is logged in
export function isLoggedIn(): boolean {
    return getCurrentSession() !== null;
}

// Logout user
export function logoutUser(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authSession');
}

// Get current user details
export function getCurrentUser(): User | null {
    const session = getCurrentSession();
    if (!session) return null;

    const users = getUsers();
    return users.find(u => u.id === session.userId) || null;
}

// Check if current user is admin
export function isAdmin(): boolean {
    const user = getCurrentUser();
    return user?.isAdmin || false;
}

// Get all users (admin only)
export function getAllUsers(): User[] {
    if (!isAdmin()) return [];
    return getUsers();
}
