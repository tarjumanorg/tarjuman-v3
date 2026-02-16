import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { APIContext } from 'astro';
import type { Database } from '../types/supabase';

// Helper to create a client. 
// Pass `context` (APIContext) when using in Astro Server (pages/api).
// Pass nothing when using in Client (Svelte).
export const createClient = (context?: APIContext) => {
    // Server-side (Astro)
    if (context) {
        return createServerClient<Database>(
            import.meta.env.PUBLIC_SUPABASE_URL,
            import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return parseCookieHeader(context.request.headers.get('Cookie') ?? '').map((cookie) => ({
                            name: cookie.name,
                            value: cookie.value ?? '',
                        }));
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                context.cookies.set(name, value, options);
                            });
                        } catch (error) {
                            // Silence "ResponseSentError" if headers are already sent
                        }
                    },
                },
            }
        );
    }

    // Client-side (Browser)
    return createBrowserClient<Database>(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );
};
