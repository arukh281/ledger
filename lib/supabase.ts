import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Trim and strip accidental wrapping quotes from .env values */
function normalizeEnv(value: string): string {
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function readSupabaseUrl(): string {
  let v = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  // Common .env mistake: pasting the whole line as the value, e.g.
  // NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_URL=https://...
  const dup = 'NEXT_PUBLIC_SUPABASE_URL=';
  if (v.startsWith(dup)) v = normalizeEnv(v.slice(dup.length));
  return v;
}

function readSupabaseAnonKey(): string {
  return normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '');
}

/**
 * Supabase JS client expects the **Project URL** (HTTPS), from Dashboard → Settings → API.
 * Do NOT use the Postgres connection string (`postgresql://...`) here.
 */
export function isValidSupabaseApiUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const supabaseUrl = readSupabaseUrl();
  const supabaseAnonKey = readSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'
    );
  }

  if (!isValidSupabaseApiUrl(supabaseUrl)) {
    const hint =
      supabaseUrl.toLowerCase().startsWith('postgresql') ||
      supabaseUrl.toLowerCase().startsWith('postgres')
        ? ' You pasted the database connection string; use the HTTPS "Project URL" instead (e.g. https://YOUR_REF.supabase.co).'
        : '';
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) API URL (Project URL from Supabase → Settings → API).${hint}`
    );
  }

  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();
  return Boolean(url && key && isValidSupabaseApiUrl(url));
}
