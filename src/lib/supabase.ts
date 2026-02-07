import { createServerClient, createBrowserClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { APIContext } from 'astro'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// Client-side client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side client helper
export function createAstroSupabase(context: APIContext) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                const cookies = parseCookieHeader(context.request.headers.get('Cookie') ?? '')
                return cookies.map(c => ({ ...c, value: c.value ?? '' }))
            },
            setAll(cookiesToSet) {
                console.log("Setting cookies:", cookiesToSet.map(c => c.name));
                cookiesToSet.forEach(({ name, value, options }) => {
                    context.cookies.set(name, value, {
                        ...options,
                        path: '/',
                        // Secure should be false on localhost if not https
                        secure: import.meta.env.PROD || options.secure,
                    })
                })
            },
        },
    })
}
