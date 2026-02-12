'use client';

import { useState, useEffect } from 'react';
import {
    MessageSquare, Plus, Trash2, X, Menu, Bot,
    Search, Library, FolderPlus, Settings,
    Moon, Sun, ChevronRight, ChevronDown,
    LayoutGrid, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatSession, Project, storage } from '@/lib/storage';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    currentSessionId: string | null;
    onSelectSession: (session: ChatSession) => void;
    onNewChat: (projectId?: string) => void;
    activeTool: string | null;
    onSelectTool: (tool: string | null) => void;
}

export function Sidebar({
    isCollapsed,
    setIsCollapsed,
    currentSessionId,
    onSelectSession,
    onNewChat,
    activeTool,
    onSelectTool
}: SidebarProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [isAllTasksExpanded, setIsAllTasksExpanded] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Initial load and listeners
    useEffect(() => {
        const loadData = () => {
            setSessions(storage.getSessions());
            setProjects(storage.getProjects());
        };

        loadData();

        const handleUpdate = () => loadData();
        window.addEventListener('storage-update', handleUpdate);
        window.addEventListener('project-update', handleUpdate);

        // Theme check
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark));

        return () => {
            window.removeEventListener('storage-update', handleUpdate);
            window.removeEventListener('project-update', handleUpdate);
        };
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const handleCreateProject = () => {
        const name = prompt('اسم المشروع الجديد:');
        if (name) {
            const newProject: Project = {
                id: Date.now().toString(),
                userId: 'user', // Default
                name,
                createdAt: Date.now()
            };
            storage.saveProject(newProject);
            // Auto expand the new project
            setExpandedProjects(prev => new Set([...prev, newProject.id]));
        }
    };

    const toggleProjectExpand = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId);
            else next.add(projectId);
            return next;
        });
    };

    const handleDeleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
            storage.deleteSession(id);
            if (currentSessionId === id) {
                onNewChat();
            }
        }
    };

    // Group sessions by project
    const getProjectSessions = (projectId: string) => sessions.filter(s => s.projectId === projectId);
    const getUncategorizedSessions = () => sessions.filter(s => !s.projectId);

    return (
        <motion.div
            animate={{ width: isCollapsed ? 64 : 280 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full bg-[#FAFAFA] dark:bg-[#18181b] border-r border-gray-200 dark:border-zinc-800 flex flex-col shrink-0 overflow-hidden relative"
        >
            {/* 1. Header */}
            <div className="h-14 flex items-center justify-between px-3 border-b border-gray-100 dark:border-zinc-800/50">
                {!isCollapsed && (
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100 opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs">AI</div>
                        <span>Vibe AI</span>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 transition-colors",
                        isCollapsed ? "mx-auto" : ""
                    )}
                >
                    {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            {/* 2. Primary Actions */}
            <div className="p-2 space-y-1">
                <NavItem
                    icon={<Plus size={18} />}
                    label="مهمة جديدة"
                    collapsed={isCollapsed}
                    onClick={() => onNewChat()}
                    active={false}
                />
                <NavItem
                    icon={<Search size={18} />}
                    label="بحث"
                    collapsed={isCollapsed}
                    onClick={() => { }}
                />
            </div>

            {/* 3. Library & Projects */}
            <div className="flex-1 overflow-y-auto px-2 space-y-4 mt-2 scrollbar-hide">

                {/* Library Header */}
                {!isCollapsed && (
                    <div className="px-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Library size={12} />
                        <span>المكتبة</span>
                    </div>
                )}

                {/* Projects Section */}
                <div className="space-y-1">
                    <NavItem
                        icon={<FolderPlus size={18} />}
                        label="مشروع جديد"
                        collapsed={isCollapsed}
                        onClick={handleCreateProject}
                        highlight
                    />

                    {/* Project List */}
                    {projects.map(project => (
                        <div key={project.id} className="space-y-1">
                            <NavItem
                                icon={expandedProjects.has(project.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                label={project.name}
                                collapsed={isCollapsed}
                                onClick={() => toggleProjectExpand(project.id)}
                            />
                            {/* Project Items (Nested) */}
                            <AnimatePresence>
                                {!isCollapsed && expandedProjects.has(project.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="ml-6 space-y-0.5 border-l-2 border-gray-100 dark:border-zinc-800 pl-2"
                                    >
                                        <button
                                            onClick={() => onNewChat(project.id)}
                                            className="w-full text-right text-xs text-blue-500 hover:text-blue-600 py-1 px-2 flex items-center gap-1"
                                        >
                                            <Plus size={12} /> محادثة جديدة
                                        </button>
                                        {getProjectSessions(project.id).map(session => (
                                            <SessionItem
                                                key={session.id}
                                                session={session}
                                                isActive={currentSessionId === session.id}
                                                onClick={() => onSelectSession(session)}
                                                onDelete={(e) => handleDeleteSession(session.id, e)}
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* Uncategorized / Recent Tasks */}
                <div className="mt-4">
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsAllTasksExpanded(!isAllTasksExpanded)}
                            className="w-full flex items-center gap-1 px-2 text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            {isAllTasksExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span>كل المهام</span>
                        </button>
                    )}
                    <AnimatePresence>
                        {(isAllTasksExpanded || isCollapsed) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-0.5"
                            >
                                {getUncategorizedSessions().map(session => (
                                    <NavItem
                                        key={session.id}
                                        icon={<MessageSquare size={16} />}
                                        label={session.title}
                                        collapsed={isCollapsed}
                                        onClick={() => onSelectSession(session)}
                                        active={currentSessionId === session.id}
                                        onDelete={(e) => handleDeleteSession(session.id, e)}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Specialized Tools Links */}
                <div className="mt-4 border-t border-gray-100 dark:border-zinc-800 pt-2">
                    {!isCollapsed && (
                        <div className="px-2 text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
                            أدوات إبداعية
                        </div>
                    )}
                    <NavItem
                        icon={<LayoutGrid size={18} />}
                        label="بناء موقع"
                        collapsed={isCollapsed}
                        onClick={() => onSelectTool('website')}
                        active={activeTool === 'website'}
                    />
                    <NavItem
                        icon={<LayoutGrid size={18} />}
                        label="بناء عرض تقديمي"
                        collapsed={isCollapsed}
                        onClick={() => onSelectTool('presentation')}
                        active={activeTool === 'presentation'}
                    />
                </div>
            </div >

            {/* 4. Footer */}
            < div className="p-2 border-t border-gray-200 dark:border-zinc-800 space-y-1" >
                <NavItem
                    icon={isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    label="المظهر"
                    collapsed={isCollapsed}
                    onClick={toggleTheme}
                />
                <NavItem
                    icon={<Settings size={18} />}
                    label="الإعدادات"
                    collapsed={isCollapsed}
                    onClick={() => { }}
                />
            </div >
        </motion.div >
    );
}

// Helper Components
function NavItem({
    icon, label, collapsed, onClick, active, highlight, onDelete
}: {
    icon: React.ReactNode, label: string, collapsed: boolean, onClick: () => void, active?: boolean, highlight?: boolean, onDelete?: (e: React.MouseEvent) => void
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg transition-all group relative",
                collapsed ? "justify-center" : "justify-start text-left",
                active
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-zinc-700"
                    : highlight
                        ? "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
            title={collapsed ? label : undefined}
        >
            <span className="shrink-0">{icon}</span>
            {!collapsed && (
                <span className="truncate text-sm font-medium flex-1 text-right dir-rtl">{label}</span>
            )}

            {/* Delete Button (Only for tasks) */}
            {!collapsed && onDelete && (
                <div
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-opacity"
                >
                    <Trash2 size={12} />
                </div>
            )}
        </button>
    );
}

function SessionItem({ session, isActive, onClick, onDelete }: { session: ChatSession, isActive: boolean, onClick: () => void, onDelete: (e: React.MouseEvent) => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between p-1.5 rounded-md text-xs transition-all group",
                isActive
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
            )}
        >
            <span className="truncate max-w-[140px]">{session.title}</span>
            <div
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500"
            >
                <X size={10} />
            </div>
        </button>
    );
}
