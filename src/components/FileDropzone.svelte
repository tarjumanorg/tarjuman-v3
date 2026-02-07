<script lang="ts">
  import { onMount } from "svelte";
  import { addFile } from "../stores/orderStore";
  import { countPdfPages } from "../utils/pdf";
  import { Upload, FileText, X, Loader2 } from "lucide-svelte";

  let isDragging = false;
  let isProcessing = false;
  let fileInput: HTMLInputElement;

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      await processFiles(target.files);
    }
    // Reset input so same file can be selected again if needed
    if (fileInput) fileInput.value = "";
  }

  async function processFiles(fileList: FileList) {
    isProcessing = true;
    const files = Array.from(fileList);

    for (const file of files) {
      // Validate type
      if (!file.type.match("pdf|image.*")) {
        alert(`File ${file.name} is not a PDF or Image.`);
        continue;
      }

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
    isProcessing = false;
  }

  function openFileDialog() {
    fileInput.click();
  }
</script>

<div
  class="relative w-full rounded-xl border-2 border-dashed transition-all duration-200 ease-in-out
    {isDragging
    ? 'border-primary bg-primary/5'
    : 'border-border bg-card/50 hover:bg-card/80'}
    {isProcessing ? 'opacity-70 pointer-events-none' : ''}
    select-none touch-manipulation cursor-pointer"
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  role="button"
  tabindex="0"
  on:click={openFileDialog}
  on:keydown={(e) => e.key === "Enter" && openFileDialog()}
>
  <input
    type="file"
    class="hidden"
    multiple
    accept=".pdf,image/*"
    bind:this={fileInput}
    on:change={handleFileSelect}
  />

  <div
    class="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4"
  >
    {#if isProcessing}
      <Loader2
        class="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mb-3 sm:mb-4"
      />
      <p class="text-sm font-medium text-muted-foreground">
        Processing files...
      </p>
    {:else}
      <div class="mb-3 sm:mb-4 rounded-full bg-primary/10 p-3 sm:p-4">
        <Upload class="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
      </div>
      <h3
        class="mb-1 sm:mb-2 text-base sm:text-lg font-semibold text-foreground"
      >
        Upload Dokumen
      </h3>
      <p class="mb-4 sm:mb-6 max-w-sm text-xs sm:text-sm text-muted-foreground">
        <span class="hidden sm:inline"
          >Seret file ke sini atau klik untuk memilih.</span
        >
        <span class="sm:hidden">Ketuk area ini untuk memilih file.</span>
        <br />
        <span class="text-[10px] sm:text-xs opacity-70"
          >(Ijazah, Transkrip, Akta, SKCK)</span
        >
      </p>

      <button
        class="rounded-full bg-primary px-5 py-2 sm:px-6 sm:py-2 text-xs sm:text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 pointer-events-none sm:pointer-events-auto"
        tabindex="-1"
      >
        Pilih File
      </button>
    {/if}
  </div>
</div>
