-- Migration: Add manual bank transfer columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS transfer_notes TEXT,
  ADD COLUMN IF NOT EXISTS unique_amount INTEGER;
