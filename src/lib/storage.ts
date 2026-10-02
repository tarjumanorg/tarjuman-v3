import localforage from "localforage";
import { orderStore, type FileItem } from "../stores/orderStore";
import { getTierByDays, DEFAULT_TIER } from "./pricing";

const STORAGE_KEY = "tarjuman_order_state";

interface PersistedState {
    files: FileItem[];
    urgencyDays: number;
    hardCopy: boolean;
    hardCopyAddress: string;
    timestamp: number;
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
            // Saved state may predate a tier being closed (e.g. Reguler).
            urgencyDays: getTierByDays(savedState.urgencyDays).open
                ? savedState.urgencyDays
                : DEFAULT_TIER.days,
            hardCopy: savedState.hardCopy,
            hardCopyAddress: savedState.hardCopyAddress,
        });

        return true;
    }
    return false;
}

export async function clearOrderState() {
    await storage.removeItem(STORAGE_KEY);
}
