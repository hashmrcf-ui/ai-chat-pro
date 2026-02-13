import { supabase } from './supabase';

export interface Chat {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

// CHATS
export async function createChat(userId: string, title: string = 'New Chat'): Promise<Chat | null> {
    const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: userId, title }])
        .select()
        .single();

    if (error) {
        console.error('Error creating chat:', error);
        return null;
    }
    return data as Chat;
}

export async function getUserChats(userId: string): Promise<Chat[]> {
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching chats:', error);
        return [];
    }
    return data as Chat[];
}

// MESSAGES
export async function saveMessage(chatId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Message | null> {
    const { data, error } = await supabase
        .from('messages')
        .insert([{ chat_id: chatId, role, content }])
        .select()
        .single();

    if (error) {
        console.error('Error saving message:', error);
        return null;
    }

    // Update chat timestamp
    await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

    return data as Message;
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
    return data as Message[];
}

// ADMIN FUNCTIONS
export async function getAllChatsAdmin(): Promise<any[]> {
    const { data, error } = await supabase
        .from('chats')
        .select(`
            *,
            users (email, full_name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all chats (admin):', error);
        return [];
    }
    return data;
}

export async function getStatsAdmin() {
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: chatCount } = await supabase.from('chats').select('*', { count: 'exact', head: true });
    const { count: messageCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

    return {
        users: userCount || 0,
        chats: chatCount || 0,
        messages: messageCount || 0
    };
}
