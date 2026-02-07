<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "../lib/supabase";
    import type { User } from "@supabase/supabase-js";

    export let initialUser: User | null = null;
    let user: User | null = initialUser;
    let isLoading = !user;

    onMount(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            user = session?.user ?? null;
            isLoading = false;
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            user = session?.user ?? null;
            isLoading = false;
        });

        return () => {
            subscription.unsubscribe();
        };
    });

    async function handleSignOut() {
        await fetch("/api/auth/signout", { method: "POST" });
        await supabase.auth.signOut();
        window.location.href = "/";
    }
</script>

<div class="flex items-center gap-4">
    {#if isLoading}
        <div class="h-8 w-20 animate-pulse rounded bg-muted"></div>
    {:else if user}
        <div class="hidden sm:block text-sm text-muted-foreground">
            {user.email}
        </div>
        <a
            href="/dashboard"
            class="text-sm font-medium hover:text-primary transition-colors"
        >
            Dashboard
        </a>
        <button
            on:click={handleSignOut}
            class="text-sm font-medium text-destructive hover:underline"
        >
            Keluar
        </button>
    {:else}
        <a
            href="/login"
            class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
            Login
        </a>
    {/if}
</div>
