
// Core Memory Types - Protocol Definitions
export type MemoryType = 'fact' | 'preference' | 'constraint' | 'decision';

export interface UserMemoryProfile {
    // Fast-access JSON blob
    facts: string[];         // e.g. "User is a Software Engineer"
    preferences: Record<string, any>; // e.g. { "language": "ar", "tone": "formal" }
    constraints: string[];   // e.g. "Don't use emojis"
    decisions: string[];     // Key project decisions made
}

export interface ConversationSummary {
    id: string;
    conversation_id: string;
    summary_text: string;
    created_at: string;
    relevance?: number; // Runtime only (similarity score)
}

export interface MemoryItem {
    id: string;
    type: MemoryType;
    text: string;
    weight: number;
    created_at: string;
    relevance?: number;
}

export interface MemoryContext {
    // What gets injected into the LLM
    profile: UserMemoryProfile;
    relevantSummaries: ConversationSummary[];
    relevantItems: MemoryItem[];
    recentMessages: { role: string; content: string }[];
}
