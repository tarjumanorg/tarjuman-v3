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
    urgencyDays: number; // days of an open tier
    hardCopy: boolean;
    hardCopyAddress: string;
};

import { computeOrderPrice, DEFAULT_TIER } from '../lib/pricing';

export const orderStore = map<OrderState>({
    files: [],
    urgencyDays: DEFAULT_TIER.days,
    hardCopy: false,
    hardCopyAddress: '',
});

// Display-only total; the order API recomputes the charged amount server-side.
export const totalPrice = computed(orderStore, ({ files, urgencyDays, hardCopy }) => {
    const totalPages = files.reduce((acc, item) => acc + item.pageCount, 0);
    return computeOrderPrice(totalPages, urgencyDays, hardCopy);
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
