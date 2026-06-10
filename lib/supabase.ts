import { createClient } from "@supabase/supabase-js";

export type Wish = {
  id: string;
  name: string;
  attendance: "datang" | "berhalangan";
  message: string;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export const galleryBucket =
  process.env.NEXT_PUBLIC_SUPABASE_GALLERY_BUCKET || "wedding-gallery";

export const galleryPath =
  process.env.NEXT_PUBLIC_SUPABASE_GALLERY_PATH || "";
