import { useState } from 'react';
import { Folder, FileCode, FileJson, ChevronRight, ChevronDown, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
    language?: string;
}

interface FileTreeProps {
    files: FileNode[];
    onSelectFile: (fileId: string) => void;
    selectedFileId?: string;
}

export function FileTree({ files, onSelectFile, selectedFileId }: FileTreeProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const renderNode = (node: FileNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.id);
        const isSelected = selectedFileId === node.id;

        const getIcon = () => {
            if (node.type === 'folder') return <Folder size={14} className={isExpanded ? "text-blue-500" : "text-gray-400"} />;
            if (node.name.endsWith('.tsx') || node.name.endsWith('.ts')) return <FileCode size={14} className="text-blue-400" />;
            if (node.name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
            if (node.name.endsWith('.css')) return <FileCode size={14} className="text-pink-400" />;
            return <File size={14} className="text-gray-400" />;
        };

        return (
            <div key={node.id}>
                <div
                    onClick={() => node.type === 'folder' ? toggleFolder(node.id) : onSelectFile(node.id)}
                    className={cn(
                        "flex items-center gap-1.5 py-1 px-2 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors rounded-sm",
                        isSelected && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                    )}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                >
                    <span className="shrink-0 opacity-50">
                        {node.type === 'folder' && (
                            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                        )}
                        {node.type === 'file' && <div className="w-3" />}
                    </span>
                    {getIcon()}
                    <span className="truncate">{node.name}</span>
                </div>

                {node.type === 'folder' && isExpanded && node.children && (
                    <div>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="font-mono text-xs select-none py-2">
            {files.map(node => renderNode(node))}
        </div>
    );
}
