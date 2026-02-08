<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    import { Lock } from "lucide-svelte";

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }

    function loginWithGoogle() {
        // Redirect to Google Auth
        // The redirects should be handled by the parent or here directly
        // Based on previous flow, we passed ?redirect=/
        // We can just go to the signin endpoint which handles the redirect param
        window.location.href = `/api/auth/signin?redirect=/`;
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
        transition:fade
        on:click={close}
    ></div>

    <!-- Modal / Bottom Sheet -->
    <div
        class="fixed bottom-0 left-0 right-0 sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2
               bg-background text-foreground rounded-t-2xl sm:rounded-2xl shadow-2xl z-[70]
               w-full sm:w-[400px] p-6 sm:p-8"
        transition:fly={{ y: 200, duration: 300 }}
    >
        <div class="flex flex-col items-center text-center space-y-6">
            <!-- Icon -->
            <div
                class="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center"
            >
                <Lock class="h-8 w-8 text-primary" />
            </div>

            <!-- Text -->
            <div class="space-y-2">
                <h2 class="text-xl font-bold font-serif">Simpan & Lanjutkan</h2>
                <p class="text-muted-foreground text-sm">
                    Masuk untuk menyimpan pesananmu. Kami menggunakan email
                    untuk mengirim hasil draft & final.
                </p>
            </div>

            <!-- Actions -->
            <div class="w-full space-y-3">
                <button
                    on:click={loginWithGoogle}
                    class="flex w-full items-center justify-center gap-3 rounded-full border border-input bg-white px-4 py-3 font-medium text-gray-700 shadow-sm transition-transform active:scale-95 hover:bg-gray-50"
                >
                    <svg class="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        ></path>
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        ></path>
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        ></path>
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        ></path>
                    </svg>
                    Lanjut dengan Google
                </button>

                <a
                    href="/login?redirect=/"
                    class="block text-xs text-muted-foreground hover:text-primary underline"
                >
                    Atau gunakan email manual
                </a>
            </div>
        </div>
    </div>
{/if}
