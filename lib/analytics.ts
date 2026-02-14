
import { supabase } from './supabase';

export interface DailyMessageStat {
    day: string;
    count: number;
}

export interface TopUserStat {
    user_id: string;
    email: string;
    message_count: number;
}

export async function getDailyMessageCounts(days = 30): Promise<DailyMessageStat[]> {
    const { data, error } = await supabase
        .rpc('get_daily_message_counts', { days_count: days });

    if (error) {
        console.error('Error fetching daily message counts:', error);
        return [];
    }
    return data;
}

export async function getTopUsers(limit = 5): Promise<TopUserStat[]> {
    const { data, error } = await supabase
        .rpc('get_top_users', { limit_count: limit });

    if (error) {
        console.error('Error fetching top users:', error);
        return [];
    }
    return data;
}
