import { Node, Edge } from 'reactflow';

export interface WorkflowStage {
    id: string;
    name: string;
    department: string;
    owner_role: string;
    sla_hours: number;
    type: 'task' | 'approval' | 'condition';
    raci: {
        responsible: string[];
        approver: string[];
        consulted: string[];
        informed: string[];
    };
    inputs: string[];
    outputs: string[];
    ai_model?: string;
}

export interface WorkflowRisk {
    risk: string;
    impact: 'high' | 'medium' | 'low';
    control: string;
}

export interface WorkflowData {
    name: string;
    goal: string;
    deadline_days: number;
    departments: string[];
    assumptions: string[];
    stages: WorkflowStage[];
    reactflow: {
        nodes: Node[];
        edges: Edge[];
    };
    permissions: {
        admin: string[];
        manager: string[];
        employee: string[];
    };
    risks: WorkflowRisk[];
    integrations: string[];
}

export function parseWorkflowJSON(json: any): WorkflowData {
    // Validate required fields
    if (!json.workflow) {
        throw new Error('Invalid workflow JSON: missing workflow object');
    }

    const workflow = json.workflow;

    return {
        name: workflow.name || 'Untitled Workflow',
        goal: workflow.goal || '',
        deadline_days: workflow.deadline_days || 30,
        departments: workflow.departments || [],
        assumptions: workflow.assumptions || [],
        stages: workflow.stages || [],
        reactflow: workflow.reactflow || { nodes: [], edges: [] },
        permissions: workflow.permissions || {
            admin: [],
            manager: [],
            employee: [],
        },
        risks: workflow.risks || [],
        integrations: workflow.integrations || [],
    };
}
