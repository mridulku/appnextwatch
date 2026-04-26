import { getSupabaseClient } from '../integrations/supabase';

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }
  return client;
}

export async function listAiPromptConfigs({ scopeKey = 'gym' } = {}) {
  const client = requireClient();
  const { data, error } = await client
    .from('app_ai_prompt_configs')
    .select('*')
    .eq('scope_key', scopeKey)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load AI prompt configs.');
  }

  return Array.isArray(data) ? data : [];
}

export async function updateAiPromptConfig({ useCaseKey, patch }) {
  const client = requireClient();
  if (!useCaseKey) {
    throw new Error('useCaseKey is required.');
  }

  const { data, error } = await client
    .from('app_ai_prompt_configs')
    .update({ ...patch })
    .eq('use_case_key', useCaseKey)
    .select('*');

  if (error) {
    throw new Error(error.message || 'Failed to update AI prompt config.');
  }

  if (!Array.isArray(data) || !data.length) {
    throw new Error('AI prompt config was not updated.');
  }

  return data[0];
}
