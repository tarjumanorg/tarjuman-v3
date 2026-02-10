<script lang="ts">
    import { MediaQuery } from "svelte/reactivity";
    import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
    } from "$lib/components/ui/dialog";
    import * as Drawer from "$lib/components/ui/drawer";
    import { Button } from "$lib/components/ui/button";
    import { Lock } from "lucide-svelte";

    let {
        isOpen = $bindable(false),
        onclose,
    }: {
        isOpen: boolean;
        onclose?: () => void;
    } = $props();

    const isDesktop = new MediaQuery("(min-width: 768px)");

    function close() {
        if (onclose) onclose();
        isOpen = false;
    }

    function loginWithGoogle() {
        window.location.href = `/api/auth/signin?redirect=/`;
    }
</script>

{#if isDesktop.current}
    <Dialog
        open={isOpen}
        onOpenChange={(open) => {
            if (!open) close();
        }}
    >
        <DialogContent class="sm:max-w-[400px]">
            <DialogHeader>
                <DialogTitle class="hidden">Login Required</DialogTitle>
            </DialogHeader>

            <div class="flex flex-col items-center text-center space-y-6 pt-4">
                <!-- Icon -->
                <div
                    class="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center p-4 ring-1 ring-primary/20"
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
                    <Button
                        variant="outline"
                        class="w-full h-12 gap-3"
                        onclick={loginWithGoogle}
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
                    </Button>

                    <a
                        href="/login?redirect=/"
                        class="block text-xs text-muted-foreground hover:text-primary underline"
                    >
                        Atau gunakan email manual
                    </a>
                </div>
            </div>
        </DialogContent>
    </Dialog>
{:else}
    <Drawer.Root
        open={isOpen}
        onOpenChange={(open) => {
            if (!open) close();
        }}
    >
        <Drawer.Content>
            <Drawer.Header class="text-center">
                <Drawer.Title class="hidden">Login Required</Drawer.Title>
            </Drawer.Header>

            <div class="flex flex-col items-center text-center space-y-6 px-4 pb-4">
                <!-- Icon -->
                <div
                    class="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center p-4 ring-1 ring-primary/20"
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
                    <Button
                        variant="outline"
                        class="w-full h-12 gap-3"
                        onclick={loginWithGoogle}
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
                    </Button>

                    <a
                        href="/login?redirect=/"
                        class="block text-xs text-muted-foreground hover:text-primary underline"
                    >
                        Atau gunakan email manual
                    </a>
                </div>
            </div>
        </Drawer.Content>
    </Drawer.Root>
{/if}
