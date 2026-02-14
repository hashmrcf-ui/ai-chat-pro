
import { supabase } from './supabase';

export interface AIModel {
    id: string;
    model_id: string;
    name: string;
    provider: string;
    is_active: boolean;
    is_default: boolean;
}

export async function getActiveModels(): Promise<AIModel[]> {
    const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

    if (error) {
        console.error('Error fetching active models:', error);
        return [];
    }
    return data as AIModel[];
}

export async function getAllModelsAdmin(): Promise<AIModel[]> {
    const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching all models:', error);
        return [];
    }
    return data as AIModel[];
}

export async function toggleModelActive(id: string, status: boolean): Promise<boolean> {
    const { error } = await supabase
        .from('ai_models')
        .update({ is_active: status })
        .eq('id', id);

    if (error) return false;
    return true;
}

export async function setModelDefault(id: string): Promise<boolean> {
    // 1. Set all to false
    await supabase.from('ai_models').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000'); // hacky way to select all, or iterate?
    // Better: Update all where is_default = true
    await supabase.from('ai_models').update({ is_default: false }).eq('is_default', true);

    // 2. Set target to true
    const { error } = await supabase
        .from('ai_models')
        .update({ is_default: true })
        .eq('id', id);

    if (error) return false;
    return true;
}

export async function addNewModel(model_id: string, name: string, provider: string): Promise<boolean> {
    const { error } = await supabase
        .from('ai_models')
        .insert([{ model_id, name, provider }]);

    if (error) return false;
    return true;
}
