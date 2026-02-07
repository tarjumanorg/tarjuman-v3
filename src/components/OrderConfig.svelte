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
    import { Trash2, FileText, MapPin } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";

    function formatPrice(price: number) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    }
</script>

{#if $orderStore.files.length > 0}
    <div class="mt-8 space-y-8" transition:slide>
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
                    <label class="font-semibold text-foreground"
                        >Kecepatan Terjemah</label
                    >
                    <span
                        class="text-primary font-bold bg-primary/10 px-3 py-1 rounded text-sm"
                    >
                        {$orderStore.urgencyDays} Hari
                    </span>
                </div>

                <input
                    type="range"
                    min="1"
                    max="7"
                    step="1"
                    class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    value={$orderStore.urgencyDays}
                    on:input={(e) =>
                        setUrgency(parseInt(e.currentTarget.value))}
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
                        <label
                            for="hardCopy"
                            class="font-medium text-foreground"
                            >Kirim Hard Copy (Cap Basah)?</label
                        >
                        <p class="text-muted-foreground">
                            Kami akan mengirimkan dokumen asli dengan cap basah
                            ke alamat Anda via JNE/J&T.
                        </p>
                    </div>
                </div>

                {#if $orderStore.hardCopy}
                    <div class="ml-7" transition:slide>
                        <label class="block text-sm font-medium mb-1"
                            >Alamat Pengiriman Lengkap</label
                        >
                        <textarea
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
            class="sticky bottom-0 bg-background/80 backdrop-blur-md p-4 border-t -mx-4 -mb-4 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mx-0 sm:mb-0"
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
                    class="w-full sm:w-auto px-8 py-3 rounded-full bg-accent text-accent-foreground font-bold shadow-lg hover:bg-accent/90 transition-transform active:scale-95"
                >
                    Lanjut Pembayaran
                </button>
            </div>
        </div>
    </div>
{/if}
