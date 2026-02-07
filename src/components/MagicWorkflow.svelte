<script lang="ts">
    import { orderStore } from "../stores/orderStore";
    import FileDropzone from "./FileDropzone.svelte";
    import OrderConfig from "./OrderConfig.svelte";
    import { slide, fade } from "svelte/transition";
    import { cubicInOut } from "svelte/easing";
</script>

<div
    class="relative bg-card rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 ease-in-out w-full"
    class:max-w-2xl={$orderStore.files.length === 0}
    class:max-w-4xl={$orderStore.files.length > 0}
>
    {#if $orderStore.files.length === 0}
        <div
            in:fade={{ duration: 300, delay: 300 }}
            out:fade={{ duration: 300 }}
            class="p-2"
        >
            <div
                class="rounded-xl border border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50"
            >
                <FileDropzone />
            </div>
        </div>
    {:else}
        <div
            in:fade={{ duration: 500, delay: 400 }}
            out:fade={{ duration: 200 }}
            class="w-full"
        >
            <OrderConfig />
        </div>
    {/if}
</div>
