import { computed, map, atom } from 'nanostores';
import { createClient } from '../lib/supabase';

export type FileItem = {
    id: string;
    file: File;
    name: string;
    pageCount: number;
    previewUrl?: string; // For images
};

export type OrderState = {
    files: FileItem[];
    urgencyDays: number; // 1 to 7
    hardCopy: boolean;
    hardCopyAddress: string;
};

// Promo code state (separate atoms for reactivity)
export const promoCode = atom('');
export const promoDiscount = atom(0); // percentage, e.g. 30 = 30%
export const promoError = atom('');
export const promoLoading = atom(false);
export const promoApplied = atom(false);

import { PRICING_TIERS, getTierByDays, HARD_COPY_FEE } from '../lib/pricing';

export const orderStore = map<OrderState>({
    files: [],
    urgencyDays: 9, // Default to Budget (9 days)
    hardCopy: false,
    hardCopyAddress: '',
});

// Computed total price (before discount)
export const originalPrice = computed(orderStore, ({ files, urgencyDays, hardCopy }) => {
    const totalPages = files.reduce((acc, item) => acc + item.pageCount, 0);

    // Calculate price per page based on tier
    const tier = getTierByDays(urgencyDays);
    const pricePerPage = tier.price;

    let price = totalPages * pricePerPage;

    if (hardCopy) {
        price += HARD_COPY_FEE;
    }

    return Math.round(price);
});

// Computed total price (with discount applied)
export const totalPrice = computed([originalPrice, promoDiscount], (original, discount) => {
    if (discount > 0) {
        return Math.round(original * (1 - discount / 100));
    }
    return original;
});

// Promo code actions
export const applyPromoCode = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
        promoError.set('Masukkan kode promo');
        return;
    }

    promoLoading.set(true);
    promoError.set('');

    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', trimmed)
            .eq('active', true)
            .single();

        if (error || !data) {
            promoError.set('Kode promo tidak ditemukan');
            promoDiscount.set(0);
            promoApplied.set(false);
            return;
        }

        // Check expiry
        const now = new Date();
        if (new Date(data.valid_from) > now) {
            promoError.set('Kode promo belum berlaku');
            promoDiscount.set(0);
            promoApplied.set(false);
            return;
        }
        if (new Date(data.valid_until) < now) {
            promoError.set('Kode promo sudah kadaluarsa');
            promoDiscount.set(0);
            promoApplied.set(false);
            return;
        }

        // Check usage limit
        if (data.current_uses >= data.max_uses) {
            promoError.set('Kuota promo sudah habis');
            promoDiscount.set(0);
            promoApplied.set(false);
            return;
        }

        // Success
        promoCode.set(trimmed);
        promoDiscount.set(data.discount_percent);
        promoApplied.set(true);
        promoError.set('');
    } catch {
        promoError.set('Gagal memvalidasi kode promo');
        promoDiscount.set(0);
        promoApplied.set(false);
    } finally {
        promoLoading.set(false);
    }
};

export const clearPromo = () => {
    promoCode.set('');
    promoDiscount.set(0);
    promoError.set('');
    promoApplied.set(false);
};

// Actions
export const addFile = (fileItem: FileItem) => {
    orderStore.setKey('files', [...orderStore.get().files, fileItem]);
};

export const removeFile = (id: string) => {
    orderStore.setKey('files', orderStore.get().files.filter((f) => f.id !== id));
};

export const updatePageCount = (id: string, count: number) => {
    const files = orderStore.get().files.map((f) =>
        f.id === id ? { ...f, pageCount: Math.max(1, count) } : f
    );
    orderStore.setKey('files', files);
};

export const setUrgency = (days: number) => {
    orderStore.setKey('urgencyDays', days);
};

export const toggleHardCopy = (enabled: boolean) => {
    orderStore.setKey('hardCopy', enabled);
};

export const setAddress = (address: string) => {
    orderStore.setKey('hardCopyAddress', address);
};
