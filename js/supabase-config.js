// ============================================================
// IELTS MASTER — Supabase Configuration
// ============================================================

const SUPABASE_URL = 'https://iyjryrdsdeaxonwkaeyf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cW15ey48YEt3zuYZ3BbdxA_myGWLxDS';

// ── Google OAuth Client ID ──
// Get this from: https://console.cloud.google.com
// → APIs & Services → Credentials → your OAuth 2.0 Client ID
const GOOGLE_CLIENT_ID = '640397849110-1turv8a967jpkfuasiamie374iq0rb4u.apps.googleusercontent.com';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);