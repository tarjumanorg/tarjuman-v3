<script lang="ts">
    import {
        orderStore,
        totalPrice,
        removeFile,
        updatePageCount,
        setUrgency,
        toggleHardCopy,
        setAddress,
    } from "../stores/orderStore";
    import {
        Trash2,
        FileText,
        MapPin,
        Wallet,
        PiggyBank,
        Coffee,
        Armchair,
        Bike,
        Car,
        Plane,
        Rocket,
        Zap,
    } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { createClient } from "../lib/supabase";
    import { onMount } from "svelte";
    import {
        saveOrderState,
        restoreOrderState,
        clearOrderState,
    } from "../lib/storage";
    import LoginModal from "./LoginModal.svelte";
    import { Slider } from "../lib/components/ui/slider";
    import { Textarea } from "../lib/components/ui/textarea";
    import { Switch } from "../lib/components/ui/switch";
    import { Button } from "../lib/components/ui/button";
    import { Label } from "../lib/components/ui/label";
    import { addDays, format } from "date-fns";
    import { id } from "date-fns/locale";

    const SPEED_LEVELS = [
        { level: 1, label: "Budget", icon: Wallet },
        { level: 2, label: "Economy", icon: PiggyBank },
        { level: 3, label: "Regular", icon: Coffee },
        { level: 4, label: "Standard", icon: Armchair },
        { level: 5, label: "Rapid", icon: Bike },
        { level: 6, label: "Fast", icon: Car },
        { level: 7, label: "Express", icon: Plane },
        { level: 8, label: "Ultra", icon: Rocket },
        { level: 9, label: "Instant", icon: Zap },
    ];

    let isLoading = false;
    let isRestoring = true;
    let showLoginModal = false;

    // Colors: Start (Grey: #9ca3af) -> End (Primary: #064E3B)
    const START_COLOR = [156, 163, 175]; // #9ca3af
    const END_COLOR = [6, 78, 59]; // #064E3B

    function interpolateColor(start: number[], end: number[], factor: number) {
        const result = start.map((startVal, i) => {
            const endVal = end[i];
            return Math.round(startVal + (endVal - startVal) * factor);
        });
        return `rgb(${result.join(",")})`;
    }

    $: sliderColor = interpolateColor(
        START_COLOR,
        END_COLOR,
        (10 - $orderStore.urgencyDays - 1) / 8,
    );

    $: activeSpeed =
        SPEED_LEVELS.find((s) => s.level === 10 - $orderStore.urgencyDays) ||
        SPEED_LEVELS[0];
    $: deliveryDate = addDays(new Date(), $orderStore.urgencyDays);

    onMount(async () => {
        // Try to restore state on load
        if (await restoreOrderState()) {
            console.log("Order state restored from storage");

            // Check if we were interrupted by login
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            const pendingOrder = localStorage.getItem("pendingOrder");

            if (
                user &&
                pendingOrder === "true" &&
                $orderStore.files.length > 0
            ) {
                console.log("Auto-resuming order creation...");
                localStorage.removeItem("pendingOrder");
                await handlePayment();
            }
        }
        isRestoring = false;
    });

    function formatPrice(price: number) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    }

    async function handlePayment() {
        isLoading = true;
        const supabase = createClient();

        // 1. Check Auth
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            // Save state *before* showing modal/redirecting
            await saveOrderState();
            // Set flag to auto-resume after login
            localStorage.setItem("pendingOrder", "true");

            // Show the Login Modal (Bottom Sheet)
            showLoginModal = true;
            isLoading = false;
            return;
        }

        try {
            const files = $orderStore.files;
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

            // 3. Create Order via API
            const response = await fetch("/api/orders/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files: uploadedFiles,
                    urgencyDays: $orderStore.urgencyDays,
                    hardCopy: $orderStore.hardCopy,
                    hardCopyAddress: $orderStore.hardCopyAddress,
                    totalPrice: $totalPrice,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to create order");
            }

            const { order } = await response.json();

            // 4. Success -> Redirect
            await clearOrderState(); // Clear storage on success

            // Redirect to payment page
            window.location.href = `/payment/${order.id}`;

            // Optional: Backup alert if redirect is slow, but usually better to just go.
            // alert("Alhamdulillah, pesananmu sudah diterima! Mengalihkan ke halaman pembayaran...");
        } catch (error) {
            console.error(error);
            alert(
                "Waduh, ada masalah: " +
                    (error instanceof Error ? error.message : "Coba lagi ya."),
            );
        } finally {
            isLoading = false;
        }
    }
</script>

{#if $orderStore.files.length > 0}
    <div class="mt-8 space-y-8" transition:slide>
        <!-- File List -->
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Dokumen Anda</h3>
                <label
                    for="file-upload"
                    class="cursor-pointer inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                    <span class="text-lg leading-none">+</span> Tambah File
                    <input
                        id="file-upload"
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
                    transition:fade
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
                                <FileText
                                    class="h-6 w-6 text-muted-foreground"
                                />
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
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    class="h-8 w-8 rounded-none rounded-l-md"
                                    on:click={() =>
                                        updatePageCount(
                                            file.id,
                                            file.pageCount - 1,
                                        )}
                                    disabled={file.pageCount <= 1}>-</Button
                                >
                                <span
                                    class="min-w-[2rem] text-center text-sm font-medium"
                                    >{file.pageCount}</span
                                >
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    class="h-8 w-8 rounded-none rounded-r-md"
                                    on:click={() =>
                                        updatePageCount(
                                            file.id,
                                            file.pageCount + 1,
                                        )}>+</Button
                                >
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            class="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                            on:click={() => removeFile(file.id)}
                            aria-label="Remove file"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Configuration -->
        <div class="rounded-xl border bg-card p-6 space-y-8 shadow-sm">
            <!-- Speed Slider -->
            <div class="space-y-6" style="--primary: {sliderColor}">
                <div
                    class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4"
                >
                    <!-- Left: Package Selection -->
                    <div class="space-y-1">
                        <Label
                            class="text-xs text-muted-foreground uppercase tracking-wide font-semibold"
                        >
                            Pilih Paket
                        </Label>
                        <div class="flex items-center gap-3 text-primary">
                            <div class="p-2 bg-primary/10 rounded-lg">
                                <svelte:component
                                    this={activeSpeed.icon}
                                    class="h-6 w-6 sm:h-8 sm:w-8"
                                />
                            </div>
                            <span
                                class="text-xl sm:text-2xl font-bold leading-none"
                                >{activeSpeed.label}</span
                            >
                        </div>
                    </div>

                    <!-- Right: Estimation -->
                    <div class="text-left sm:text-right space-y-1">
                        <Label
                            class="text-xs text-muted-foreground uppercase tracking-wide font-semibold"
                        >
                            Estimasi Selesai
                        </Label>
                        <div class="flex flex-col sm:items-end">
                            <p
                                class="text-base sm:text-lg font-bold text-foreground capitalize leading-snug"
                            >
                                {format(deliveryDate, "EEEE, d MMMM yyyy", {
                                    locale: id,
                                })}
                            </p>
                            <p
                                class="text-xs sm:text-sm font-medium text-muted-foreground"
                            >
                                {$orderStore.urgencyDays} Hari
                            </p>
                        </div>
                    </div>
                </div>

                <div class="px-2 pt-4">
                    <Slider
                        value={[10 - $orderStore.urgencyDays]}
                        onValueChange={(v: number[]) => {
                            if (v && v.length > 0) setUrgency(10 - v[0]);
                        }}
                        min={1}
                        max={9}
                        step={1}
                        class="cursor-pointer"
                    />
                </div>
            </div>

            <div class="space-y-4 pt-4 border-t">
                <div class="flex items-start gap-4">
                    <div class="flex items-center h-6">
                        <Switch
                            id="hardCopy"
                            checked={$orderStore.hardCopy}
                            onCheckedChange={(v: boolean) => toggleHardCopy(v)}
                        />
                    </div>
                    <div class="text-sm space-y-1">
                        <Label
                            for="hardCopy"
                            class="font-medium text-foreground text-base cursor-pointer"
                            >Kirim Hard Copy (Cap Basah)?</Label
                        >
                        <p class="text-muted-foreground">
                            Kami akan kirim dokumen asli dengan cap basah ke
                            alamatmu via JNE/J&T.
                        </p>
                    </div>
                </div>

                {#if $orderStore.hardCopy}
                    <div class="ml-14" transition:slide>
                        <Label
                            class="block text-sm font-medium mb-2"
                            for="shipping-address"
                            >Alamat Pengiriman Lengkap</Label
                        >
                        <div class="relative">
                            <MapPin
                                class="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10"
                            />
                            <Textarea
                                id="shipping-address"
                                class="pl-10 min-h-[100px] resize-none"
                                placeholder="Contoh: Jl. Sudirman No. 10, RT 01/RW 02, Jakarta Selatan, 12190. (Sertakan Patokan)"
                                value={$orderStore.hardCopyAddress}
                                on:input={(e) =>
                                    setAddress(e.currentTarget.value)}
                            />
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Sticky Footer for Mobile -->
        <div
            class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:static sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 z-50"
        >
            <div
                class="container max-w-4xl mx-auto flex flex-row items-center justify-between gap-4"
            >
                <div class="text-left">
                    <p class="text-xs sm:text-sm text-muted-foreground">
                        Total Estimasi
                    </p>
                    <p class="text-xl sm:text-3xl font-bold text-primary">
                        {formatPrice($totalPrice)}
                    </p>
                </div>
                <Button
                    size="lg"
                    class="flex-1 sm:flex-none px-6 sm:px-8 rounded-full shadow-lg transition-transform active:scale-95 text-base"
                    on:click={handlePayment}
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <span class="flex items-center gap-2 justify-center">
                            Loading...
                        </span>
                    {:else}
                        Lanjut Pembayaran
                    {/if}
                </Button>
            </div>
        </div>
        <!-- Spacer for mobile to prevent content being hidden behind footer -->
        <div class="h-24 sm:hidden"></div>
    </div>

    <LoginModal
        isOpen={showLoginModal}
        on:close={() => (showLoginModal = false)}
    />
{/if}
