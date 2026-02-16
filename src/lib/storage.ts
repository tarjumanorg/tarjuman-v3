import localforage from "localforage";
import {
    orderStore,
    promoCode,
    promoDiscount,
    promoApplied,
    type FileItem,
} from "../stores/orderStore";

const STORAGE_KEY = "tarjuman_order_state";

interface PersistedState {
    files: FileItem[];
    urgencyDays: number;
    hardCopy: boolean;
    hardCopyAddress: string;
    timestamp: number;
    promoCode?: string;
    promoDiscount?: number;
    promoApplied?: boolean;
}

export const storage = localforage.createInstance({
    name: "tarjuman_db",
    storeName: "order_state",
});

export async function saveOrderState() {
    const currentState = orderStore.get();
    const stateToSave: PersistedState = {
        files: currentState.files, // localforage handles File/Blob automatically
        urgencyDays: currentState.urgencyDays,
        hardCopy: currentState.hardCopy,
        hardCopyAddress: currentState.hardCopyAddress,
        timestamp: Date.now(),
        promoCode: promoCode.get(),
        promoDiscount: promoDiscount.get(),
        promoApplied: promoApplied.get(),
    };
    await storage.setItem(STORAGE_KEY, stateToSave);
}

export async function restoreOrderState() {
    const savedState = (await storage.getItem(STORAGE_KEY)) as PersistedState;

    if (savedState) {
        // Optional: Check if state is too old (e.g., > 24 hours)
        const isExpired =
            Date.now() - savedState.timestamp > 24 * 60 * 60 * 1000;
        if (isExpired) {
            await clearOrderState();
            return false;
        }

        orderStore.set({
            files: savedState.files,
            urgencyDays: savedState.urgencyDays,
            hardCopy: savedState.hardCopy,
            hardCopyAddress: savedState.hardCopyAddress,
        });

        if (savedState.promoApplied && savedState.promoCode) {
            promoCode.set(savedState.promoCode);
            promoDiscount.set(savedState.promoDiscount || 0);
            promoApplied.set(true);
        }

        return true;
    }
    return false;
}

export async function clearOrderState() {
    await storage.removeItem(STORAGE_KEY);
    promoCode.set("");
    promoDiscount.set(0);
    promoApplied.set(false);
}
