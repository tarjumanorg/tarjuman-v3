
import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, locals } = context;
    const url = new URL(request.url);

    // Maintenance Mode Check
    const isMaintenanceMode = import.meta.env.PUBLIC_MAINTENANCE_MODE === "true";
    const isAsset = url.pathname.includes(".") || url.pathname.startsWith("/@fs") || url.pathname.startsWith("/_astro");
    const isMaintenancePath = url.pathname === "/maintenance";
    const isLoginPath = url.pathname === "/login";
    const isAdminPath = url.pathname.startsWith("/admin");
    const isAdminApiPath = url.pathname.startsWith("/api/admin");
    const isAuthApi = url.pathname.startsWith("/api/auth");

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

    // Maintenance Redirection
    if (isMaintenanceMode && !isAsset && !isMaintenancePath && !isLoginPath && !isAdminPath && !isAdminApiPath && !isAuthApi) {
        // Allow admins to bypass maintenance
        let isAdmin = false;
        if (user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            isAdmin = profile?.role === "admin";
        }

        if (!isAdmin) {
            return context.redirect("/maintenance");
        }
    }

    // Protect /admin routes
    if (isAdminPath || isAdminApiPath) {
        if (!user) {
            if (isAdminApiPath) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }
            return context.redirect("/login");
        }

        // Check Role
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            if (isAdminApiPath) {
                return new Response(JSON.stringify({ error: "Forbidden" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
            }
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
