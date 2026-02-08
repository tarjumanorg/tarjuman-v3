import localforage from 'localforage';
import { get } from 'svelte/store';
import { orderStore, type FileItem } from '../stores/orderStore';

const STORAGE_KEY = 'tarjuman_order_state';

interface PersistedState {
    files: FileItem[];
    urgencyDays: number;
    hardCopy: boolean;
    hardCopyAddress: string;
    timestamp: number;
}

export const storage = localforage.createInstance({
    name: 'tarjuman_db',
    storeName: 'order_state'
});

export async function saveOrderState() {
    const currentState = get(orderStore);
    const stateToSave: PersistedState = {
        files: currentState.files, // localforage handles File/Blob automatically
        urgencyDays: currentState.urgencyDays,
        hardCopy: currentState.hardCopy,
        hardCopyAddress: currentState.hardCopyAddress,
        timestamp: Date.now()
    };
    await storage.setItem(STORAGE_KEY, stateToSave);
}

export async function restoreOrderState() {
    const savedState = await storage.getItem<PersistedState>(STORAGE_KEY);

    if (savedState) {
        // Optional: Check if state is too old (e.g., > 24 hours)
        const isExpired = Date.now() - savedState.timestamp > 24 * 60 * 60 * 1000;
        if (isExpired) {
            await clearOrderState();
            return false;
        }

        orderStore.set({
            files: savedState.files,
            urgencyDays: savedState.urgencyDays,
            hardCopy: savedState.hardCopy,
            hardCopyAddress: savedState.hardCopyAddress
        } as any); // nanostores .set() takes the whole object, but here we are using .setKey individually or .set() for whole store
        // Wait, orderStore is a map. .set() sets the whole object.
        return true;
    }
    return false;
}

export async function clearOrderState() {
    await storage.removeItem(STORAGE_KEY);
}
