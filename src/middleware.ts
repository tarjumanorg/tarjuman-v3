
import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, locals } = context;
    const url = new URL(request.url);

    // create supabase client
    const supabase = createServerClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return parseCookieHeader(request.headers.get("Cookie") ?? "").map((cookie) => ({
                        name: cookie.name,
                        value: cookie.value ?? "",
                    }));
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        context.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // set locals
    locals.supabase = supabase;

    // fetch user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    locals.user = user;

    // Protect /admin routes
    if (url.pathname.startsWith("/admin")) {
        if (!user) {
            return context.redirect("/login");
        }

        // Check Role
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            // Redirect non-admins to home or dashboard
            return context.redirect("/dashboard");
        }
    }

    // Protect /dashboard routes (optional, but good practice)
    if (url.pathname.startsWith("/dashboard")) {
        if (!user) {
            return context.redirect("/login");
        }
    }

    return next();
});
