/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getSupabaseUrl(): string | undefined {
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    undefined
  );
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  );
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && url.length > 0 && key.length > 0);
}
