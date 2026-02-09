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
// Base price configuration
const BASE_PRICE = 75000; // Price for 9 days (slowest)
const URGENCY_SURCHARGE_PER_DAY = 30000; // Cost per day reduced

const HARD_COPY_FEE = 20000;

export const orderStore = map<OrderState>({
    files: [],
    urgencyDays: 9, // Default to Budget (9 days)
    hardCopy: false,
    hardCopyAddress: '',
});

// Computed total price
export const totalPrice = computed(orderStore, ({ files, urgencyDays, hardCopy }) => {
    const totalPages = files.reduce((acc, item) => acc + item.pageCount, 0);

    // Calculate price per page based on urgency
    // Days: 9 (Base) -> 8 (+30k) -> ... -> 1 (+240k)
    // Formula: Base + (9 - days) * Surcharge
    const daysReduced = 9 - urgencyDays;
    const pricePerPage = BASE_PRICE + (daysReduced * URGENCY_SURCHARGE_PER_DAY);

    let price = totalPages * pricePerPage;

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
