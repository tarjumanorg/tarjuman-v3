import { computed, map } from 'nanostores';

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

// Base price configuration
const PRICE_PER_PAGE = 50000; // Base price (slowest)
const URGENCY_MULTIPLIER = {
    1: 2.0, // 1 day = 2x price
    2: 1.8,
    3: 1.6,
    4: 1.4,
    5: 1.2,
    6: 1.1,
    7: 1.0, // 7 days = base price
} as Record<number, number>;

const HARD_COPY_FEE = 20000;

export const orderStore = map<OrderState>({
    files: [],
    urgencyDays: 7, // Default to relaxed
    hardCopy: false,
    hardCopyAddress: '',
});

// Computed total price
export const totalPrice = computed(orderStore, ({ files, urgencyDays, hardCopy }) => {
    const totalPages = files.reduce((acc, item) => acc + item.pageCount, 0);
    const multiplier = URGENCY_MULTIPLIER[urgencyDays] || 1.0;

    let price = totalPages * PRICE_PER_PAGE * multiplier;

    if (hardCopy) {
        price += HARD_COPY_FEE;
    }

    return Math.round(price);
});

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
