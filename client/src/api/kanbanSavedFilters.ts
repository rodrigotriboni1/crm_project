import type { SupabaseClient } from '@supabase/supabase-js'
import type { KanbanSavedFilterPayloadV1 } from '@/lib/kanbanSavedFilterPayload'

export type KanbanSavedFilterRow = {
  id: string
  organization_id: string
  created_by: string
  name: string
  is_shared: boolean
  filters: unknown
  created_at: string
  updated_at: string
}

export async function listKanbanSavedFilters(
  sb: SupabaseClient,
  organizationId: string
): Promise<KanbanSavedFilterRow[]> {
  const { data, error } = await sb
    .from('kanban_saved_filters')
    .select('id, organization_id, created_by, name, is_shared, filters, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as KanbanSavedFilterRow[]
}

export async function createKanbanSavedFilter(
  sb: SupabaseClient,
  organizationId: string,
  userId: string,
  input: { name: string; is_shared: boolean; filters: KanbanSavedFilterPayloadV1 }
): Promise<KanbanSavedFilterRow> {
  const name = input.name.trim()
  const { data, error } = await sb
    .from('kanban_saved_filters')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      name,
      is_shared: input.is_shared,
      filters: input.filters as unknown as Record<string, unknown>,
    })
    .select('id, organization_id, created_by, name, is_shared, filters, created_at, updated_at')
    .single()

  if (error) throw error
  return data as KanbanSavedFilterRow
}

export async function deleteKanbanSavedFilter(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from('kanban_saved_filters').delete().eq('id', id)
  if (error) throw error
}
