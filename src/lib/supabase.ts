import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { APIContext } from 'astro'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// Client-side client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client helper
export function createAstroSupabase(context: APIContext) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return parseCookieHeader(context.request.headers.get('Cookie') ?? '')
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                    context.cookies.set(name, value, options)
                )
            },
        },
    })
}
