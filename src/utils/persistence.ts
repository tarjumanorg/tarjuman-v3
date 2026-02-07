import { get, set, del } from 'idb-keyval';
import type { OrderState, FileItem } from '../stores/orderStore';

const STORE_KEY = 'tarjuman_order_state';

export async function saveOrderState(state: OrderState) {
    // We need to verify if File objects are preserved. IndexedDB handles Blobs/Files.
    await set(STORE_KEY, state);
}

export async function restoreOrderState(): Promise<OrderState | undefined> {
    return await get(STORE_KEY);
}

export async function clearOrderState() {
    await del(STORE_KEY);
}
