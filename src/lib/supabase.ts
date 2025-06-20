import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Progress Sync Functions ---
export async function getUserProgress(moduleId: number, lessonId: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('user_progress')
    .select('progress_data')
    .eq('user_id', user.id)
    .eq('module_id', moduleId)
    .eq('lesson_id', lessonId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.progress_data : null;
}

export async function upsertUserProgress(moduleId: number, lessonId: number, progressData: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      module_id: moduleId,
      lesson_id: lessonId,
      progress_data: progressData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,module_id,lesson_id' });
  if (error) throw error;
}

// --- Chat Session Functions ---
export async function getChatSessions(agentType: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('agent_type', agentType)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createChatSession(agentType: string, title: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      agent_type: agentType,
      title,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Chat Message Functions ---
export async function getChatMessages(sessionId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addChatMessage(sessionId: string, sender: string, text: string) {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      sender,
      text,
      timestamp: new Date().toISOString(),
    });
  if (error) throw error;
} 