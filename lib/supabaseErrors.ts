/**
 * Turn common Supabase / PostgREST messages into actionable hints for the UI.
 */
export function formatSupabaseDbError(message: string): string {
  const m = message ?? '';

  if (
    m.includes('schema cache') ||
    m.includes("Could not find the table") ||
    m.includes('PGRST205')
  ) {
    return (
      'Supabase Data API cannot see your tables yet. In Supabase: open SQL Editor, run the full ' +
      'supabase/schema.sql script (or supabase/repair-api-access.sql), then wait a few seconds and retry. ' +
      `Details: ${m}`
    );
  }

  if (m.includes('permission denied') || m.includes('42501')) {
    return (
      'Database permission denied. In Supabase SQL Editor, run the GRANT section from ' +
      `supabase/schema.sql (or supabase/repair-api-access.sql). Details: ${m}`
    );
  }

  if (m.includes('row-level security') || m.toLowerCase().includes('rls')) {
    return (
      'Row-level security blocked this action. This app uses the Supabase anon key with no login. ' +
      'In Supabase → SQL Editor, run: ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY; ' +
      'and the same for public.ledger_entries (or run supabase/repair-api-access.sql). ' +
      `Details: ${m}`
    );
  }

  return `Database error: ${m}`;
}
