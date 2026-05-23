// ⚠️  IMPORTANT: Replace SUPABASE_KEY with your real anon/public JWT key.
// Find it in: Supabase Dashboard → Project Settings → API → "anon public"
// It starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
//
// The "sb_publishable_..." key you had before is NOT valid for supabase-js.

const SUPABASE_URL = "https://iyjryrdsdeaxonwkaeyf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5anJ5cmRzZGVheG9ud2thZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjEzNDcsImV4cCI6MjA5NDY5NzM0N30.5sJ1ahI0UiRbXHBiFqZnfBQlvB07U0dVPA877uMCqXA"; // ← replace this
const GOOGLE_CLIENT_ID = "640397849110-1turv8a967jpkfuasiamie374iq0rb4u.apps.googleusercontent.com";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);