import { map } from 'nanostores';

export type OrderFile = {
    id: string;
    file: File;
    pages: number;
    preview?: string;
};

export type OrderState = {
    files: OrderFile[];
    step: 'upload' | 'config' | 'review' | 'payment';
};

export const orderStore = map<OrderState>({
    files: [],
    step: 'upload',
});

export const addFiles = (newFiles: OrderFile[]) => {
    const currentFiles = orderStore.get().files;
    orderStore.setKey('files', [...currentFiles, ...newFiles]);
};

export const removeFile = (id: string) => {
    const currentFiles = orderStore.get().files;
    orderStore.setKey('files', currentFiles.filter(f => f.id !== id));
};

export const updateFilePages = (id: string, pages: number) => {
    const currentFiles = orderStore.get().files;
    orderStore.setKey('files', currentFiles.map(f => f.id === id ? { ...f, pages } : f));
};
