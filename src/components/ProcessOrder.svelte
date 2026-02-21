<script lang="ts">
    import { onMount, tick } from "svelte";
    import { get } from "svelte/store";
    import { orderStore, totalPrice } from "../stores/orderStore";
    import { createClient } from "../lib/supabase";
    import { restoreOrderState, clearOrderState } from "../lib/storage";
    import { Loader2, AlertCircle } from "lucide-svelte";
    import { Button } from "../lib/components/ui/button";

    let state: "restoring" | "uploading" | "creating" | "error" = "restoring";
    let errorMessage = "";

    onMount(async () => {
        try {
            const hasState = await restoreOrderState();
            const pendingOrder = localStorage.getItem("pendingOrder");

            // Allow stores to update from storage restoration
            await tick();

            const currentOrder = get(orderStore);

            if (
                !hasState ||
                pendingOrder !== "true" ||
                currentOrder.files.length === 0
            ) {
                // Not a valid pending order resume, maybe they visited directly
                window.location.href = "/";
                return;
            }

            // We are valid and have files.
            localStorage.removeItem("pendingOrder");
            await processOrder();
        } catch (error) {
            console.error(error);
            state = "error";
            errorMessage =
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan sistem.";
        }
    });

    async function processOrder() {
        const supabase = createClient();

        // 1. Verify Auth again just in case
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            window.location.href = "/login?redirect=/checkout/process";
            return;
        }

        const currentOrder = get(orderStore);
        const currentTotal = get(totalPrice);

        state = "uploading";
        const files = currentOrder.files;
        const uploadedFiles = [];

        // 2. Upload Files
        for (const fileItem of files) {
            const path = `${user.id}/${crypto.randomUUID()}/${fileItem.file.name}`;
            const { error: uploadError } = await supabase.storage
                .from("uploads")
                .upload(path, fileItem.file);

            if (uploadError) throw uploadError;

            uploadedFiles.push({
                name: fileItem.file.name,
                size: fileItem.file.size,
                pageCount: fileItem.pageCount,
                path: path,
            });
        }

        state = "creating";
        // 3. Create Order via API
        const response = await fetch("/api/orders/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                files: uploadedFiles,
                urgencyDays: currentOrder.urgencyDays,
                hardCopy: currentOrder.hardCopy,
                hardCopyAddress: currentOrder.hardCopyAddress,
                totalPrice: currentTotal,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal membuat pesanan");
        }

        const { order } = await response.json();

        // 4. Success -> Clear state and redirect
        await clearOrderState();
        window.location.href = `/payment/${order.id}`;
    }

    function retry() {
        // Just reload the page, onMount will try again if state isn't cleared
        // But we removed pendingOrder, so we should set it again so it tries
        localStorage.setItem("pendingOrder", "true");
        window.location.reload();
    }
</script>

<div
    class="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500"
>
    {#if state === "error"}
        <div
            class="h-20 w-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-6"
        >
            <AlertCircle class="h-10 w-10" />
        </div>
        <h1 class="text-2xl font-bold font-serif text-foreground">
            Oops, Terjadi Kesalahan
        </h1>
        <p class="text-muted-foreground">
            {errorMessage}
        </p>
        <div class="pt-6 flex gap-3 justify-center">
            <Button variant="outline" href="/">Kembali ke Beranda</Button>
            <Button onclick={retry}>Coba Lagi</Button>
        </div>
    {:else}
        <div
            class="h-20 w-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 ring-4 ring-primary/20"
        >
            <Loader2 class="h-10 w-10 animate-spin" />
        </div>

        <h1 class="text-2xl font-bold font-serif text-foreground">
            Sedang Memproses Pesanan
        </h1>

        <div class="text-muted-foreground space-y-2">
            {#if state === "restoring"}
                <p class="animate-pulse">Menyiapkan dokumen Anda...</p>
            {:else if state === "uploading"}
                <p class="animate-pulse">
                    Mengamankan dokumen Anda ke server...
                </p>
            {:else if state === "creating"}
                <p class="animate-pulse">Membuat invoice pembayaran...</p>
            {/if}
            <p class="text-xs opacity-70 mt-4">
                Mohon jangan tutup halaman ini.
            </p>
        </div>
    {/if}
</div>
