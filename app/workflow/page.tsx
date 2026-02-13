'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    Connection,
    addEdge,
    useNodesState,
    useEdgesState,
    NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workflow, Download } from 'lucide-react';
import Link from 'next/link';
import Toolbar from '@/components/workflow/Toolbar';
import AINode from '@/components/workflow/AINode';
import TextNode from '@/components/workflow/TextNode';
import StageNode from '@/components/workflow/StageNode';

const nodeTypes: NodeTypes = {
    ai: AINode,
    text: TextNode,
    task: StageNode,
    approval: StageNode,
    default: StageNode,
};

const defaultNodes: Node[] = [
    {
        id: '1',
        type: 'ai',
        data: { label: 'AI Agent', prompt: '' },
        position: { x: 250, y: 100 },
    },
];

const defaultEdges: Edge[] = [];

function WorkflowContent() {
    const searchParams = useSearchParams();
    const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    const [workflowName, setWorkflowName] = useState('Untitled Workflow');

    // Load workflow from URL param if exists
    useEffect(() => {
        const loadId = searchParams.get('load');
        if (loadId) {
            const saved = localStorage.getItem(loadId);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    setWorkflowName(data.workflow?.name || 'Loaded Workflow');
                    if (data.workflow?.reactflow) {
                        setNodes(data.workflow.reactflow.nodes || []);
                        setEdges(data.workflow.reactflow.edges || []);
                    }
                } catch (err) {
                    console.error('Failed to load workflow:', err);
                }
            }
        }
    }, [searchParams, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onAddNode = useCallback(
        (type: string) => {
            const id = `${type}-${Date.now()}`;
            const newNode: Node = {
                id,
                type,
                data: { label: type },
                position: {
                    x: Math.random() * 500,
                    y: Math.random() * 500,
                },
            };
            setNodes((nds: Node[]) => [...nds, newNode]);
        },
        [setNodes]
    );

    const onSave = () => {
        const workflowData = {
            name: workflowName,
            nodes,
            edges,
            savedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workflowName}.json`;
        a.click();
    };

    return (
        <div className="w-full h-screen bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <Workflow className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-xl font-semibold text-white">{workflowName}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/workflow/generate"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Workflow className="w-4 h-4" />
                        <span>AI Generator</span>
                    </Link>
                    <button
                        onClick={onSave}
                        className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>حفظ</span>
                    </button>
                </div>
            </header>

            {/* Canvas Area */}
            <div className="flex-1 relative">
                <Toolbar onAddNode={onAddNode} />

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-[#0a0a0a]"
                >
                    <Background color="#27272a" gap={16} />
                    <Controls className="bg-[#18181b] border border-[#27272a]" />
                    <MiniMap
                        className="bg-[#18181b] border border-[#27272a]"
                        nodeColor="#4c1d95"
                        maskColor="rgba(0, 0, 0, 0.6)"
                    />
                </ReactFlow>
            </div>
        </div>
    );
}

export default function WorkflowPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">Loading Workflow...</div>}>
            <WorkflowContent />
        </Suspense>
    );
}
