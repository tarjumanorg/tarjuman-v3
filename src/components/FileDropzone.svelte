<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import {
        orderStore,
        addFile,
        removeFile,
        updatePageCount,
    } from "../stores/orderStore";
    import { countPdfPages } from "../utils/pdf";

    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent } from "$lib/components/ui/card";
    import {
        Upload,
        FileText,
        X,
        Loader2,
        Plus,
        Minus,
        AlertCircle,
    } from "lucide-svelte";

    export let maxFiles = 10;
    export let maxSizeMB = 50;

    let isDragging = false;
    let isProcessing = false;
    let errorMessage = "";
    let errorTimeout: ReturnType<typeof setTimeout>;

    function showError(msg: string) {
        errorMessage = msg;
        if (errorTimeout) clearTimeout(errorTimeout);
        errorTimeout = setTimeout(() => {
            errorMessage = "";
        }, 5000);
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        isDragging = true;
    }

    function handleDragLeave() {
        isDragging = false;
    }

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
        if (e.dataTransfer?.files) {
            await processFiles(Array.from(e.dataTransfer.files));
        }
    }

    async function handleFileInput(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            await processFiles(Array.from(target.files));
        }
        target.value = "";
    }

    async function processFiles(newFiles: File[]) {
        errorMessage = ""; // Clear previous errors
        isProcessing = true;
        const currentCount = $orderStore.files.length;
        let hasError = false;

        for (const file of newFiles) {
            if ($orderStore.files.length >= maxFiles) {
                showError(`Maksimal ${maxFiles} file.`);
                hasError = true;
                break;
            }

            // Validate Size
            if (file.size > maxSizeMB * 1024 * 1024) {
                showError(
                    `File "${file.name}" terlalu besar (Max ${maxSizeMB}MB).`,
                );
                hasError = true;
                continue;
            }

            // Validate Type
            if (
                !file.type.startsWith("image/") &&
                file.type !== "application/pdf"
            ) {
                showError(
                    `File "${file.name}" tidak didukung. Harap upload PDF atau Gambar.`,
                );
                hasError = true;
                continue;
            }

            const id = Math.random().toString(36).substring(7);
            let pageCount = 1;
            let previewUrl = undefined;

            try {
                if (file.type === "application/pdf") {
                    pageCount = await countPdfPages(file);
                } else if (file.type.startsWith("image/")) {
                    previewUrl = URL.createObjectURL(file);
                }

                addFile({
                    id,
                    file,
                    name: file.name,
                    pageCount,
                    previewUrl,
                });
            } catch (err) {
                console.error("Error processing file:", err);
                showError(`Gagal memproses file "${file.name}".`);
                hasError = true;
            }
        }

        isProcessing = false;
    }
</script>

<div class="w-full space-y-4">
    <!-- Error Message -->
    {#if errorMessage}
        <div
            transition:slide
            class="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive"
        >
            <AlertCircle class="h-4 w-4" />
            <p>{errorMessage}</p>
        </div>
    {/if}

    <!-- Dropzone -->
    <div
        class="relative rounded-lg border-2 border-dashed p-4 sm:p-8 text-center transition-colors
    {isDragging
            ? 'border-primary bg-primary/5'
            : errorMessage
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-muted-foreground/25 hover:border-primary/50'}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        role="button"
        tabindex="0"
    >
        <input
            type="file"
            multiple
            accept=".pdf,image/*"
            class="absolute inset-0 cursor-pointer opacity-0"
            onchange={handleFileInput}
        />

        <div class="flex flex-col items-center gap-2">
            <div
                class="rounded-full bg-background p-4 shadow-sm ring-1 ring-border"
            >
                <Upload class="h-6 w-6 text-primary" />
            </div>
            <div class="text-sm sm:text-base">
                <span class="font-semibold text-primary"
                    >Upload Dokumen di sini
                </span>
            </div>
            <p class="text-xs text-muted-foreground">
                Drop file di sini untuk cek estimasi biaya & waktu. (Max {maxSizeMB}MB)
            </p>
        </div>
    </div>

    <!-- File List from Store -->
    {#if $orderStore.files.length > 0}
        <div class="grid gap-2" transition:fade>
            {#each $orderStore.files as file (file.id)}
                <Card class="overflow-hidden">
                    <CardContent class="flex items-center p-3 gap-3">
                        <!-- Preview/Icon -->
                        <div
                            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted"
                        >
                            {#if file.previewUrl}
                                <img
                                    src={file.previewUrl}
                                    alt="preview"
                                    class="h-full w-full object-cover rounded-md"
                                />
                            {:else}
                                <FileText
                                    class="h-6 w-6 text-muted-foreground"
                                />
                            {/if}
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0 text-left">
                            <p class="truncate text-sm font-medium">
                                {file.name}
                            </p>
                            <p class="text-xs text-muted-foreground">
                                {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>

                        <!-- Pages Control -->
                        <div
                            class="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1"
                        >
                            <button
                                class="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                onclick={() =>
                                    updatePageCount(
                                        file.id,
                                        file.pageCount - 1,
                                    )}
                                disabled={file.pageCount <= 1}
                                aria-label="Decrease page count"
                            >
                                <Minus class="h-3 w-3" />
                            </button>
                            <span class="w-4 text-center text-sm font-medium"
                                >{file.pageCount}</span
                            >
                            <button
                                class="text-muted-foreground hover:text-foreground"
                                onclick={() =>
                                    updatePageCount(
                                        file.id,
                                        file.pageCount + 1,
                                    )}
                                aria-label="Increase page count"
                            >
                                <Plus class="h-3 w-3" />
                            </button>
                            <span class="text-xs text-muted-foreground"
                                >hlm</span
                            >
                        </div>

                        <!-- Remove -->
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onclick={() => removeFile(file.id)}
                        >
                            <X class="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            {/each}
        </div>
    {/if}

    {#if isProcessing}
        <div
            class="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground"
        >
            <Loader2 class="h-4 w-4 animate-spin" />
            Memproses file...
        </div>
    {/if}
</div>
