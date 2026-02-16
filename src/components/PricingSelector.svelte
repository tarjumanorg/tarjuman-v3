<script lang="ts">
    import { PRICING_TIERS } from "../lib/pricing";
    import { Check, Clock, Zap } from "lucide-svelte";
    import { fade } from "svelte/transition";

    export let selectedDays: number;
    export let onSelect: (days: number) => void;

    function formatPrice(price: number) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    }

    function getDurationLabel(days: number) {
        if (days === 0) return "Hitungan Jam";
        if (days === 1) return "24 Jam";
        return `${days} Hari`;
    }
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {#each PRICING_TIERS as tier}
        <button
            class="relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20
           {selectedDays === tier.days
                ? `${tier.color} shadow-sm bg-opacity-100`
                : 'border-border bg-card hover:border-primary/50 text-muted-foreground'}"
            onclick={() => onSelect(tier.days)}
        >
            <!-- Recommended Badge -->
            {#if tier.id === "sedang"}
                <span
                    class="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm z-10 whitespace-nowrap"
                >
                    Recommended
                </span>
            {/if}

            <!-- Checkmark if selected -->
            {#if selectedDays === tier.days}
                <div
                    class="absolute top-3 right-3"
                    transition:fade={{ duration: 150 }}
                >
                    <div
                        class="flex items-center justify-center h-5 w-5 rounded-full bg-current"
                    >
                        <Check class="h-3 w-3 text-white" strokeWidth={3} />
                    </div>
                </div>
            {/if}

            <!-- Header -->
            <div class="mb-3 w-full">
                <h3
                    class="font-bold text-sm tracking-tight {selectedDays ===
                    tier.days
                        ? ''
                        : 'text-foreground'}"
                >
                    {tier.label}
                </h3>
                <p
                    class="text-[10px] font-medium opacity-80 uppercase tracking-wide mt-0.5"
                >
                    {tier.description}
                </p>
            </div>

            <!-- Price & Time -->
            <div class="mt-auto w-full space-y-1">
                <div class="flex items-baseline gap-1">
                    <span
                        class="text-lg font-extrabold tracking-tight {selectedDays ===
                        tier.days
                            ? ''
                            : 'text-foreground'}"
                    >
                        {formatPrice(tier.price)
                            .replace(",00", "")
                            .replace("Rp", "")}
                    </span>
                    <span class="text-[10px]">IB</span>
                </div>

                <div
                    class="flex items-center gap-1.5 pt-2 border-t border-current/10 w-full"
                >
                    {#if tier.days === 0}
                        <Zap class="h-3.5 w-3.5" />
                    {:else}
                        <Clock class="h-3.5 w-3.5" />
                    {/if}
                    <span class="text-xs font-semibold">
                        {getDurationLabel(tier.days)}
                    </span>
                </div>
            </div>
        </button>
    {/each}
</div>
