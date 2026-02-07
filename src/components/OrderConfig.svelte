<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "../lib/supabase";
    import {
        saveOrderState,
        restoreOrderState,
        clearOrderState,
    } from "../utils/persistence";
    import {
        orderStore,
        totalPrice,
        removeFile,
        updatePageCount,
        setUrgency,
        toggleHardCopy,
        setAddress,
    } from "../stores/orderStore";
    import { Trash2, FileText, MapPin, Loader2 } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";

    let isLoading = false;
    let isResuming = false;
    // Check immediately if we are in the "returning" state to show overlay
    let isReturning = false;
    if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        isReturning = params.get("checkout_return") === "true";
    }

    onMount(async () => {
        try {
            console.log("OrderConfig mounted. Checking for saved state...");
            const savedState = await restoreOrderState();

            if (savedState && savedState.files.length > 0) {
                console.log("Restoring saved order state", savedState);
                orderStore.set(savedState);
                // DO NOT clear state here. Only clear on success.

                // Check if user is now logged in
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (isReturning) {
                    if (user) {
                        console.log("Auto-resuming checkout for user", user.id);

                        // Clean the URL immediately
                        window.history.replaceState({}, document.title, "/");

                        isLoading = true;
                        // Short delay to ensure state is settled and UI is ready
                        setTimeout(() => {
                            handleCheckout();
                        }, 500);
                    } else {
                        console.warn(
                            "Returned from checkout but no user found (auth failed?). Resetting UI.",
                        );
                        // Fail safe: Stop the overlay if auth failed
                        isReturning = false;
                        window.history.replaceState({}, document.title, "/");
                    }
                }
            } else {
                console.log("No saved state found.");
                if (isReturning) {
                    console.warn(
                        "Returned from checkout but no saved state found. Resetting UI.",
                    );
                    // Fail safe: Stop the overlay if state validation failed
                    isReturning = false;
                    window.history.replaceState({}, document.title, "/");
                }
            }
        } catch (e) {
            console.error("Failed to restore state", e);
            // Fail safe for error
            if (isReturning) {
                isReturning = false;
                window.history.replaceState({}, document.title, "/");
            }
        }
    });

    async function handleCheckout() {
        if ($orderStore.files.length === 0) return;
        isLoading = true;

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                console.log(
                    "User not logged in, saving state and redirecting to login...",
                );
                await saveOrderState($orderStore);
                // Add checkout_return param to know we came from here
                const returnUrl = encodeURIComponent("/?checkout_return=true");
                window.location.href = `/login?next=${returnUrl}`;
                return;
            }

            console.log("Creating order for user:", user.id);

            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .insert({
                    user_id: user.id,
                    status: "pending_verification",
                    original_price: $totalPrice, // Use as estimate
                    urgency_days: $orderStore.urgencyDays,
                    physical_copy: $orderStore.hardCopy,
                    hard_copy_address: $orderStore.hardCopyAddress,
                    page_count_estimated: $orderStore.files.reduce(
                        (acc, f) => acc + f.pageCount,
                        0,
                    ),
                })
                .select()
                .single();

            if (orderError) throw orderError;
            console.log("Order created:", order.id);

            // 2. Upload Files & Create Order Records
            for (const fileItem of $orderStore.files) {
                // Sanitize filename but keep extension
                const safeName = fileItem.file.name.replace(
                    /[^a-zA-Z0-9.]/g,
                    "_",
                );
                const filePath = `${user.id}/${order.id}/${safeName}`;
                console.log("Uploading file:", filePath);

                const { error: uploadError } = await supabase.storage
                    .from("orders")
                    .upload(filePath, fileItem.file);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    // Alert but continue? Or throw?
                    // Throwing ensures we don't proceed to success page with missing files
                    throw new Error(
                        `Failed to upload ${fileItem.name}: ${uploadError.message}`,
                    );
                }

                await supabase.from("order_files").insert({
                    order_id: order.id,
                    file_path: filePath,
                    file_type: "source",
                    page_count: fileItem.pageCount,
                });
            }

            // 3. Success
            console.log("Checkout complete. Clearing state.");
            await clearOrderState();
            orderStore.setKey("files", []);

            // Redirect to Dashboard
            window.location.href = "/dashboard";
        } catch (e: any) {
            console.error("Checkout error:", e);
            alert("Terjadi kesalahan saat memproses pesanan: " + e.message);
        } finally {
            isLoading = false;
        }
    }

    function formatPrice(price: number) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    }
</script>

{#if isReturning || isLoading}
    <!-- Full Screen Overlay for Processing -->
    <div
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
        transition:fade
    >
        <div
            class="flex flex-col items-center gap-4 p-8 text-center animate-in zoom-in-95 duration-300"
        >
            <Loader2 class="h-16 w-16 animate-spin text-primary" />
            <div class="space-y-2">
                <h3 class="text-2xl font-bold tracking-tight">
                    Memproses Pesanan...
                </h3>
                <p class="text-muted-foreground">
                    Mohon jangan tutup halaman ini.
                </p>
            </div>
        </div>
    </div>
{/if}

<div class="p-6 sm:p-8 space-y-8">
    <!-- File List -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Dokumen Anda</h3>
            <label
                class="cursor-pointer inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
                <span class="text-lg leading-none">+</span> Tambah File
                <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    class="hidden"
                    on:change={async (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files) {
                            const { countPdfPages } = await import(
                                "../utils/pdf"
                            );
                            const { addFile } = await import(
                                "../stores/orderStore"
                            );

                            for (const file of Array.from(target.files)) {
                                let pageCount = 1;
                                let previewUrl = undefined;

                                if (file.type === "application/pdf") {
                                    pageCount = await countPdfPages(file);
                                } else if (file.type.startsWith("image/")) {
                                    previewUrl = URL.createObjectURL(file);
                                }

                                addFile({
                                    id: crypto.randomUUID(),
                                    file,
                                    name: file.name,
                                    pageCount,
                                    previewUrl,
                                });
                            }
                            target.value = "";
                        }
                    }}
                />
            </label>
        </div>
        {#each $orderStore.files as file (file.id)}
            <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm"
                transition:slide
            >
                <div class="flex items-center gap-4">
                    {#if file.previewUrl}
                        <img
                            src={file.previewUrl}
                            alt="Preview"
                            class="h-12 w-12 rounded object-cover border"
                        />
                    {:else}
                        <div
                            class="flex h-12 w-12 items-center justify-center rounded bg-muted"
                        >
                            <FileText class="h-6 w-6 text-muted-foreground" />
                        </div>
                    {/if}
                    <div class="flex-1 min-w-0">
                        <p
                            class="truncate text-sm font-medium text-foreground max-w-[200px]"
                            title={file.name}
                        >
                            {file.name}
                        </p>
                        <p class="text-xs text-muted-foreground">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>

                <div
                    class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-muted-foreground"
                            >Halaman:</span
                        >
                        <div
                            class="flex items-center rounded-md border bg-background"
                        >
                            <button
                                class="px-2 py-1 text-sm hover:bg-muted"
                                on:click={() =>
                                    updatePageCount(
                                        file.id,
                                        file.pageCount - 1,
                                    )}
                                disabled={file.pageCount <= 1}>-</button
                            >
                            <span
                                class="min-w-[2rem] text-center text-sm font-medium"
                                >{file.pageCount}</span
                            >
                            <button
                                class="px-2 py-1 text-sm hover:bg-muted"
                                on:click={() =>
                                    updatePageCount(
                                        file.id,
                                        file.pageCount + 1,
                                    )}>+</button
                            >
                        </div>
                    </div>

                    <button
                        class="text-destructive hover:bg-destructive/10 p-2 rounded-full transition-colors"
                        on:click={() => removeFile(file.id)}
                        aria-label="Remove file"
                    >
                        <Trash2 class="h-4 w-4" />
                    </button>
                </div>
            </div>
        {/each}
    </div>

    <!-- Configuration -->
    <div class="rounded-xl border bg-card p-6 space-y-8 shadow-sm">
        <!-- Speed Slider -->
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <label
                    class="font-semibold text-foreground"
                    for="urgency-slider">Kecepatan Terjemah</label
                >
                <span
                    class="text-primary font-bold bg-primary/10 px-3 py-1 rounded text-sm"
                >
                    {$orderStore.urgencyDays} Hari
                </span>
            </div>

            <input
                id="urgency-slider"
                type="range"
                min="1"
                max="7"
                step="1"
                class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                value={$orderStore.urgencyDays}
                on:input={(e) => setUrgency(parseInt(e.currentTarget.value))}
            />
            <div class="flex justify-between text-xs text-muted-foreground">
                <span>Kilat (Mahal)</span>
                <span>Santai (Hemat)</span>
            </div>
        </div>

        <!-- Hard Copy Toggle -->
        <div class="space-y-4 pt-4 border-t">
            <div class="flex items-start gap-3">
                <div class="flex items-center h-5">
                    <input
                        id="hardCopy"
                        type="checkbox"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        checked={$orderStore.hardCopy}
                        on:change={(e) =>
                            toggleHardCopy(e.currentTarget.checked)}
                    />
                </div>
                <div class="text-sm">
                    <label for="hardCopy" class="font-medium text-foreground"
                        >Kirim Hard Copy (Cap Basah)?</label
                    >
                    <p class="text-muted-foreground">
                        Kami akan mengirimkan dokumen asli dengan cap basah ke
                        alamat Anda via JNE/J&T.
                    </p>
                </div>
            </div>

            {#if $orderStore.hardCopy}
                <div class="ml-7" transition:slide>
                    <label
                        class="block text-sm font-medium mb-1"
                        for="address-input">Alamat Pengiriman Lengkap</label
                    >
                    <textarea
                        id="address-input"
                        class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        rows="3"
                        placeholder="Jalan, Nomor Rumah, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos..."
                        value={$orderStore.hardCopyAddress}
                        on:input={(e) => setAddress(e.currentTarget.value)}
                    ></textarea>
                </div>
            {/if}
        </div>
    </div>

    <!-- Sticky Footer (Mobile) / Summary (Desktop) -->
    <div
        class="sticky bottom-0 bg-background/80 backdrop-blur-md p-4 border-t -mx-6 -mb-6 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mx-0 sm:mb-0"
    >
        <div
            class="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
            <div class="text-center sm:text-left">
                <p class="text-sm text-muted-foreground">Total Estimasi</p>
                <p class="text-3xl font-bold text-primary">
                    {formatPrice($totalPrice)}
                </p>
            </div>
            <button
                id="checkout-btn"
                class="w-full sm:w-auto px-8 py-3 rounded-full bg-accent text-accent-foreground font-bold shadow-lg hover:bg-accent/90 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed {isResuming
                    ? 'ring-4 ring-primary ring-offset-2 animate-pulse'
                    : ''}"
                on:click={handleCheckout}
                disabled={isLoading || $orderStore.files.length === 0}
            >
                {#if isLoading}
                    <div class="flex items-center gap-2">
                        <Loader2 class="h-4 w-4 animate-spin" />
                        <span>Memproses...</span>
                    </div>
                {:else}
                    Lanjut Pembayaran
                {/if}
            </button>
        </div>
    </div>
</div>
