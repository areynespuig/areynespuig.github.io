import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE, supabaseConfigured } from '../config';

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase del editor. La sesión se guarda en sessionStorage: se cierra al cerrar
 * la pestaña y no queda en el almacenamiento permanente que comparten todas las páginas de
 * areynespuig.github.io.
 */
export function getSupabase(): SupabaseClient | null {
	if (!supabaseConfigured) return null;
	client ??= createClient(SUPABASE.url, SUPABASE.publishableKey, {
		auth: {
			storage: sessionStorage,
			storageKey: 'portfolio-admin-session',
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: false
		}
	});
	return client;
}
