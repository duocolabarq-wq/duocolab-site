"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export const supabaseNavegador = () => createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
