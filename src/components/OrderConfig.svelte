<script lang="ts">
    import {
        orderStore,
        totalPrice,
        originalPrice,
        removeFile,
        updatePageCount,
        setUrgency,
        toggleHardCopy,
        setAddress,
        promoCode,
        promoDiscount,
        promoError,
        promoLoading,
        promoApplied,
        applyPromoCode,
        clearPromo,
    } from "../stores/orderStore";
    import {
        Trash2,
        FileText,
        MapPin,
        Wallet,
        Coins,
        Coffee,
        Armchair,
        Bike,
        Car,
        Plane,
        Rocket,
        Zap,
        Siren,
        Plus,
        Minus,
        Tag,
        X,
        Check,
        Loader2,
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
    import { Input } from "../lib/components/ui/input";
    import { addDays, format } from "date-fns";
    import { id } from "date-fns/locale";

    import { PRICING_TIERS, getTierByDays } from "../lib/pricing";

    let isLoading = false;
    let isRestoring = true;
    let showLoginModal = false;
    let promoInput = "";

    // Map urgency (days) to slider index (0 = Reguler/Slowest, 3 = Kilat/Fastest)
    // We reverse the array for display if we want Left=Cheap/Slow, Right=Expensive/Fast
    // PRICING_TIERS is [Reguler(9), Sedang(5), Ekspres(2), Kilat(1)]
    // Index 0: Reguler (9 days)
    // Index 1: Sedang (5 days)
    // Index 2: Ekspres (2 days)
    // Index 3: Kilat (1 day)

    $: activeTierIndex = PRICING_TIERS.findIndex(
        (t) => t.days === $orderStore.urgencyDays,
    );
    $: activeTier = PRICING_TIERS[activeTierIndex] || PRICING_TIERS[0];

    // Icon Mapping
    const TIER_ICONS = {
        reguler: Wallet,
        sedang: Car,
        ekspres: Plane,
        kilat: Siren,
    };

    // Helper to get color based on index
    function getTierColor(index: number) {
        // Budget -> Green, Mid -> Teal, Express -> Blue, Urgent -> Orange/Red
        const colors = [
            "rgb(22, 163, 74)", // Green-600 (Reguler)
            "rgb(13, 148, 136)", // Teal-600 (Sedang)
            "rgb(37, 99, 235)", // Blue-600 (Ekspres)
            "rgb(234, 88, 12)", // Orange-600 (Kilat)
        ];
        return colors[index] || colors[0];
    }

    $: sliderColor = getTierColor(activeTierIndex);
    $: deliveryDate = addDays(new Date(), activeTier.days);

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
                    <Plus class="h-3 w-3" /> Tambah File
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        class="hidden"
                        onchange={async (e) => {
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
                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-card p-3 sm:p-4 shadow-sm"
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
                                    onclick={() =>
                                        updatePageCount(
                                            file.id,
                                            file.pageCount - 1,
                                        )}
                                    disabled={file.pageCount <= 1}
                                    aria-label="Decrease page count"
                                >
                                    <Minus class="h-3 w-3" />
                                </Button>
                                <span
                                    class="min-w-[2rem] text-center text-sm font-medium"
                                    >{file.pageCount}</span
                                >
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    class="h-8 w-8 rounded-none rounded-r-md"
                                    onclick={() =>
                                        updatePageCount(
                                            file.id,
                                            file.pageCount + 1,
                                        )}
                                    aria-label="Increase page count"
                                >
                                    <Plus class="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            class="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                            onclick={() => removeFile(file.id)}
                            aria-label="Remove file"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Configuration -->
        <div
            class="rounded-xl border bg-card p-6 space-y-8 shadow-sm transition-all duration-500 {$orderStore.urgencyDays ===
            0
                ? 'border-yellow-500/50 ring-4 ring-yellow-500/10 shadow-yellow-500/5'
                : 'border-border'}"
        >
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
                                    this={TIER_ICONS[activeTier.id]}
                                    class="h-6 w-6 sm:h-8 sm:w-8"
                                />
                            </div>
                            <span
                                class="text-xl sm:text-2xl font-bold leading-none"
                                >{activeTier.label}</span
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
                                {$orderStore.urgencyDays === 1
                                    ? "24 Jam"
                                    : `${$orderStore.urgencyDays} Hari`}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="px-2 pt-4 flex items-center gap-4">
                    <Wallet class="h-4 w-4 text-muted-foreground shrink-0" />
                    <div class="flex-1">
                        <Slider
                            value={[activeTierIndex]}
                            onValueChange={(v: number[]) => {
                                if (v && v.length > 0) {
                                    const tier = PRICING_TIERS[v[0]];
                                    if (tier) setUrgency(tier.days);
                                }
                            }}
                            min={0}
                            max={3}
                            step={1}
                            class="cursor-pointer"
                        />
                    </div>
                    <Zap
                        class="h-4 w-4 shrink-0 transition-all duration-300 {$orderStore.urgencyDays ===
                        1
                            ? 'text-yellow-400 scale-125 [filter:drop-shadow(0_0_8px_#facc15)]'
                            : 'text-muted-foreground opacity-50'}"
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
                    <div class="ml-0 mt-4 sm:ml-14 sm:mt-0" transition:slide>
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
                                oninput={(
                                    e: Event & {
                                        currentTarget: HTMLTextAreaElement;
                                    },
                                ) => setAddress(e.currentTarget.value)}
                            />
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Promo Code -->
        <div class="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
                <Tag class="h-4 w-4 text-primary" />
                <Label class="text-sm font-semibold">Kode Promo</Label>
            </div>

            {#if $promoApplied}
                <div
                    class="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3"
                    transition:slide
                >
                    <div class="flex items-center gap-2">
                        <Check class="h-4 w-4 text-green-600" />
                        <span
                            class="text-sm font-medium text-green-700 dark:text-green-400"
                        >
                            {$promoCode} — Diskon {$promoDiscount}%
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        class="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onclick={clearPromo}
                    >
                        <X class="h-3.5 w-3.5" />
                    </Button>
                </div>
            {:else}
                <div class="flex gap-2">
                    <Input
                        placeholder="Masukkan kode promo"
                        class="flex-1 uppercase"
                        bind:value={promoInput}
                        onkeydown={(e: KeyboardEvent) => {
                            if (e.key === "Enter") applyPromoCode(promoInput);
                        }}
                    />
                    <Button
                        variant="outline"
                        onclick={() => applyPromoCode(promoInput)}
                        disabled={$promoLoading || !promoInput.trim()}
                        class="shrink-0"
                    >
                        {#if $promoLoading}
                            <Loader2 class="h-4 w-4 animate-spin" />
                        {:else}
                            Gunakan
                        {/if}
                    </Button>
                </div>
                {#if $promoError}
                    <p class="text-xs text-destructive mt-2" transition:fade>
                        {$promoError}
                    </p>
                {/if}
            {/if}
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
                    {#if $promoApplied}
                        <div class="flex items-baseline gap-2">
                            <p
                                class="text-xl sm:text-3xl font-bold text-primary"
                            >
                                {formatPrice($totalPrice)}
                            </p>
                            <p
                                class="text-sm text-muted-foreground line-through"
                            >
                                {formatPrice($originalPrice)}
                            </p>
                        </div>
                    {:else}
                        <p class="text-xl sm:text-3xl font-bold text-primary">
                            {formatPrice($totalPrice)}
                        </p>
                    {/if}
                </div>
                <Button
                    size="lg"
                    class="flex-1 sm:flex-none px-6 sm:px-8 rounded-full shadow-lg transition-transform active:scale-95 text-base"
                    onclick={handlePayment}
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
        onclose={() => (showLoginModal = false)}
    />
{/if}
