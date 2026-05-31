/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from './supabaseConfig';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  if (!client) {
    client = createClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
  }
  return client;
}

/** @deprecated Use getSupabase() — kept for existing imports */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
      };
      trees: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
      };
      members: {
        Row: {
          tree_id: string;
          id: string;
          data: Record<string, unknown>;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          recently_visited: string[];
          blueprint_layout: string | null;
          geocode_cache: Record<string, { lat: number; lng: number }>;
        };
      };
    };
  };
};
