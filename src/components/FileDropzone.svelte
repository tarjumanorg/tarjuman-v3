<script lang="ts">
    import { fade } from "svelte/transition";
    import {
        orderStore,
        addFiles,
        removeFile,
        updateFilePages,
    } from "../stores/order";
    import { countPdfPages } from "../utils/pdf";

    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent } from "$lib/components/ui/card";
    import { Upload, FileText, X, Loader2 } from "lucide-svelte";

    export let maxFiles = 10;
    export let maxSizeMB = 50;

    let isDragging = false;
    let isProcessing = false;

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
        isProcessing = true;
        const currentCount = orderStore.get().files.length;

        // Filter and transform
        const validFiles = [];

        for (const file of newFiles) {
            if (currentCount + validFiles.length >= maxFiles) break;
            if (file.size > maxSizeMB * 1024 * 1024) continue; // Skip large files silently or handle error

            const id = Math.random().toString(36).substring(7);
            let pages = 1;
            let preview = "";

            if (file.type === "application/pdf") {
                pages = await countPdfPages(file);
            } else if (file.type.startsWith("image/")) {
                preview = URL.createObjectURL(file);
            }

            validFiles.push({ file, id, pages, preview });
        }

        if (validFiles.length > 0) {
            addFiles(validFiles);
        }

        isProcessing = false;
    }
</script>

<div class="w-full space-y-4">
    <!-- Dropzone -->
    <div
        class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
    {isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'}"
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        role="button"
        tabindex="0"
    >
        <input
            type="file"
            multiple
            accept=".pdf,image/*"
            class="absolute inset-0 cursor-pointer opacity-0"
            on:change={handleFileInput}
        />

        <div class="flex flex-col items-center gap-2">
            <div
                class="rounded-full bg-background p-4 shadow-sm ring-1 ring-border"
            >
                <Upload class="h-6 w-6 text-primary" />
            </div>
            <div class="text-sm">
                <span class="font-semibold text-primary">Klik untuk upload</span
                > atau seret file ke sini
            </div>
            <p class="text-xs text-muted-foreground">
                PDF, JPG, PNG (Max {maxSizeMB}MB)
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
                            {#if file.preview}
                                <img
                                    src={file.preview}
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
                                {file.file.name}
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
                                on:click={() =>
                                    updateFilePages(file.id, file.pages - 1)}
                                disabled={file.pages <= 1}>-</button
                            >
                            <span class="w-4 text-center text-sm font-medium"
                                >{file.pages}</span
                            >
                            <button
                                class="text-muted-foreground hover:text-foreground"
                                on:click={() =>
                                    updateFilePages(file.id, file.pages + 1)}
                                >+</button
                            >
                            <span class="text-xs text-muted-foreground"
                                >hlm</span
                            >
                        </div>

                        <!-- Remove -->
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-muted-foreground hover:text-destructive"
                            on:click={() => removeFile(file.id)}
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
