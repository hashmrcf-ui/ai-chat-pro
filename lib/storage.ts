
export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolInvocations?: any[];
    createdAt?: Date;
}

export interface Project {
    id: string;
    userId: string;
    name: string;
    icon?: string;
    createdAt: number;
}

export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    messages: Message[];
    date: number;
    model: string;
    projectId?: string; // Optional link to a project
}

const STORAGE_KEY_SESSIONS = 'ai-chat-pro-sessions';
const STORAGE_KEY_PROJECTS = 'ai-chat-pro-projects';

export const storage = {
    // === SESSIONS ===
    getSessions: (): ChatSession[] => {
        if (typeof window === 'undefined') return [];
        try {
            const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load sessions:', e);
            return [];
        }
    },

    saveSession: (session: ChatSession) => {
        if (typeof window === 'undefined') return;
        try {
            const sessions = storage.getSessions();
            const index = sessions.findIndex(s => s.id === session.id);

            if (index >= 0) {
                sessions[index] = session;
            } else {
                sessions.unshift(session);
            }

            localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
            // Dispatch event for specialized listeners
            window.dispatchEvent(new Event('storage-update'));
        } catch (e) {
            console.error('Failed to save session:', e);
        }
    },

    deleteSession: (id: string) => {
        if (typeof window === 'undefined') return;
        try {
            const sessions = storage.getSessions().filter(s => s.id !== id);
            localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
            window.dispatchEvent(new Event('storage-update'));
        } catch (e) {
            console.error('Failed to delete session:', e);
        }
    },

    getUserSessions: (userId: string): ChatSession[] => {
        if (typeof window === 'undefined') return [];
        const allSessions = storage.getSessions();
        return allSessions.filter(s => s.userId === userId);
    },

    // === PROJECTS ===
    getProjects: (): Project[] => {
        if (typeof window === 'undefined') return [];
        try {
            const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load projects:', e);
            return [];
        }
    },

    saveProject: (project: Project) => {
        if (typeof window === 'undefined') return;
        try {
            const projects = storage.getProjects();
            const index = projects.findIndex(p => p.id === project.id);

            if (index >= 0) {
                projects[index] = project;
            } else {
                projects.push(project);
            }

            localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
            window.dispatchEvent(new Event('project-update'));
        } catch (e) {
            console.error('Failed to save project:', e);
        }
    },

    deleteProject: (id: string) => {
        if (typeof window === 'undefined') return;
        try {
            const projects = storage.getProjects().filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));

            // Optional: Also delete or unlink sessions? 
            // For now, we'll keep sessions but remove their projectId
            const sessions = storage.getSessions();
            let sessionsChanged = false;
            sessions.forEach(s => {
                if (s.projectId === id) {
                    delete s.projectId;
                    sessionsChanged = true;
                }
            });
            if (sessionsChanged) {
                localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
            }

            window.dispatchEvent(new Event('project-update'));
        } catch (e) {
            console.error('Failed to delete project:', e);
        }
    }
};
