/**
 * Mayar.id Payment Gateway Integration Helper
 *
 * Docs: https://mayar.id (Bearer-token auth, no request signing required).
 *
 * Ported from the verified reference implementation in the sibling project
 * `FaraidAcademy-v2/src/lib/services/payment.service.ts`, retargeted from a
 * generic `payments` table to this project's `orders` table. This project
 * has no `payments` table and no product catalog — the amount to charge is
 * `order.final_price`, already computed server-side elsewhere; this module
 * never recalculates or looks it up.
 *
 * Design note: env vars (apiKey/baseUrl) are passed in via `MayarConfig`
 * rather than read directly from `astro:env/server` in this module, so this
 * file stays safe to import from contexts that don't have server-only env
 * access (e.g. if ever referenced from a client-side Svelte component).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '../types/supabase';

export interface MayarConfig {
    apiKey: string;
    baseUrl: string;
}

interface CreateOrderInvoiceParams {
    orderId: string;
    amount: number;          // caller passes order.final_price — this module does not look it up
    name: string;
    email: string;
    mobile: string;
    description: string;
    redirectUrl: string;     // base URL; this function appends nothing — caller already targets /payment/success/{orderId}
}

interface MayarInvoiceDetail {
    id: string;
    status: string;
    transactionId: string | null;
    amount: number;
}

/**
 * Creates a Mayar invoice for an existing order and stores the invoice
 * reference on it. Does not insert a new row — the order already exists
 * (created at checkout, before payment).
 */
export async function createOrderInvoice(
    adminSupabase: SupabaseClient,
    mayar: MayarConfig,
    params: CreateOrderInvoiceParams
): Promise<{ link: string } | null> {
    try {
        const response = await fetch(`${mayar.baseUrl}/hl/v1/invoice/create`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${mayar.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: params.name,
                email: params.email,
                mobile: params.mobile,
                description: params.description,
                redirectUrl: params.redirectUrl,
                items: [{ quantity: 1, rate: params.amount, description: params.description }],
            }),
        });

        const json = await response.json();
        const link: string | undefined = json?.data?.link;
        const invoiceId: string | undefined = json?.data?.id;
        const transactionId: string | undefined = json?.data?.transactionId;

        if (!response.ok || !link || !invoiceId) {
            console.error('Mayar invoice creation failed:', json);
            // The order persists regardless and the customer can retry — leave
            // payment_status alone (it's already 'unpaid' from creation).
            return null;
        }

        const { error: updateError } = await adminSupabase
            .from('orders')
            .update({
                mayar_invoice_id: invoiceId,
                mayar_transaction_id: transactionId ?? null,
                mayar_payment_url: link,
            })
            .eq('id', params.orderId);

        if (updateError) {
            console.error('Error updating order with Mayar invoice:', updateError);
            return null;
        }

        return { link };
    } catch (err) {
        console.error('Error calling Mayar invoice create:', err);
        return null;
    }
}

export async function getInvoiceStatus(
    mayar: MayarConfig,
    invoiceId: string
): Promise<MayarInvoiceDetail | null> {
    try {
        const response = await fetch(`${mayar.baseUrl}/hl/v1/invoice/${invoiceId}`, {
            headers: { Authorization: `Bearer ${mayar.apiKey}` },
        });
        const json = await response.json();
        if (!response.ok || !json?.data) {
            console.error('Mayar invoice detail fetch failed:', json);
            return null;
        }
        return {
            id: json.data.id,
            status: json.data.status,
            transactionId: json.data.transactionId ?? null,
            amount: json.data.amount,
        };
    } catch (err) {
        console.error('Error fetching Mayar invoice detail:', err);
        return null;
    }
}

function isPaidStatus(status: string | boolean): boolean {
    if (typeof status === 'boolean') return status;
    return status.toLowerCase() === 'paid' || status.toLowerCase() === 'success';
}

function isExpiredStatus(status: string | boolean): boolean {
    if (typeof status === 'boolean') return false;
    return status.toLowerCase() === 'expired';
}

/**
 * Confirms an order's payment status against Mayar and writes the
 * transition. Idempotent: only orders still awaiting settlement
 * (`payment_status` of 'unpaid' or 'pending', with a Mayar invoice already
 * attached) are checked against Mayar; an already-settled order is returned
 * unchanged.
 */
export async function confirmAndUpdateOrder(
    adminSupabase: SupabaseClient,
    mayar: MayarConfig,
    orderId: string
): Promise<Tables<'orders'> | null> {
    const { data: order, error } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error || !order) {
        console.error('Error fetching order for confirmation:', error);
        return null;
    }

    const isAwaitingSettlement = order.payment_status === 'unpaid' || order.payment_status === 'pending';
    if (!isAwaitingSettlement || !order.mayar_invoice_id) {
        return order;
    }

    const detail = await getInvoiceStatus(mayar, order.mayar_invoice_id);
    if (!detail) return order;

    let nextStatus: 'paid' | 'failed' | null = null;
    if (isPaidStatus(detail.status)) nextStatus = 'paid';
    else if (isExpiredStatus(detail.status)) nextStatus = 'failed';

    if (nextStatus === null) return order;

    const { data: updated, error: updateError } = await adminSupabase
        .from('orders')
        .update({
            payment_status: nextStatus,
            status: nextStatus === 'paid' ? 'processing' : order.status,
            mayar_transaction_id: detail.transactionId ?? order.mayar_transaction_id,
        })
        .eq('id', orderId)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating order payment status:', updateError);
        return order;
    }
    return updated;
}

export async function findOrderByInvoiceId(
    adminSupabase: SupabaseClient,
    invoiceId: string
): Promise<Tables<'orders'> | null> {
    const { data, error } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('mayar_invoice_id', invoiceId)
        .maybeSingle();

    if (error) {
        console.error('Error finding order by invoice id:', error);
        return null;
    }
    return data;
}

async function listPaidInvoiceIds(mayar: MayarConfig): Promise<Set<string>> {
    const ids = new Set<string>();
    const pageSize = 50;
    for (let page = 1; page <= 10; page++) {
        const response = await fetch(
            `${mayar.baseUrl}/hl/v1/invoice?sort=paid&page=${page}&pageSize=${pageSize}`,
            { headers: { Authorization: `Bearer ${mayar.apiKey}` } }
        );
        const json = await response.json();
        if (!response.ok || !Array.isArray(json?.data)) {
            console.error('Mayar paid-invoice list fetch failed:', json);
            break;
        }
        for (const invoice of json.data) {
            if (invoice?.id && invoice?.status === 'paid') ids.add(invoice.id);
        }
        if (!json.hasMore) break;
    }
    return ids;
}

/**
 * Sweeps orders that have a Mayar invoice attached and are still awaiting
 * settlement (mirrors the `confirmAndUpdateOrder` guard), checking each
 * against Mayar's paid-invoice list and settling any matches. Intended for
 * a scheduled reconcile endpoint to catch missed webhooks.
 */
export async function reconcilePendingOrders(
    adminSupabase: SupabaseClient,
    mayar: MayarConfig
): Promise<{ checked: number; settled: number }> {
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data: pending, error } = await adminSupabase
        .from('orders')
        .select('id, mayar_invoice_id')
        .in('payment_status', ['unpaid', 'pending'])
        .not('mayar_invoice_id', 'is', null)
        .lt('created_at', cutoff)
        .limit(200);

    if (error || !pending) {
        console.error('Error listing pending orders for reconciliation:', error);
        return { checked: 0, settled: 0 };
    }

    if (pending.length === 0) return { checked: 0, settled: 0 };

    const paidIds = await listPaidInvoiceIds(mayar);

    let settled = 0;
    for (const row of pending) {
        if (!row.mayar_invoice_id || !paidIds.has(row.mayar_invoice_id)) continue;
        const { error: updateError } = await adminSupabase
            .from('orders')
            .update({ payment_status: 'paid', status: 'processing' })
            .eq('id', row.id);
        if (updateError) {
            console.error('Error marking order paid during reconciliation:', updateError);
            continue;
        }
        settled++;
    }

    return { checked: pending.length, settled };
}
