// ── Compression helpers (CompressionStream — all modern browsers) ──
const _compress = async (str) => {
  try {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return '__gz__' + btoa(String.fromCharCode(...new Uint8Array(buf)));
  } catch (_) { return str; }
};

const _decompress = async (val) => {
  if (!val || !val.startsWith('__gz__')) return val;
  try {
    const b64 = val.slice(6);
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch (_) { return val; }
};

const DB = {
  async getUserResults(userId) {
    try {
      const { data, error } = await _supabase
        .from("results")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: true });
      if (error) { console.error("getUserResults error:", error); return []; }
      return (data || []).map(r => ({
        ...r,
        test: r.test_name || r.test || "—",
        date: r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"),
      }));
    } catch (e) {
      console.error("getUserResults error:", e);
      return [];
    }
  },

  async saveResult(userId, resultObj) {
    try {
      const correctAnswers = resultObj.correctAnswers || resultObj.correct_answers || [];
      const row = {
        user_id:         userId,
        test_name:       resultObj.test,
        type:            resultObj.type,
        score:           resultObj.score,
        total:           resultObj.total,
        answers:         resultObj.answers || [],
        correct_answers: correctAnswers,
      };
      if (resultObj.explanations && resultObj.explanations.length > 0) {
        row.explanations = resultObj.explanations;
      }
      const { error } = await _supabase.from("results").insert(row);
      if (error) { console.error("saveResult error:", error); return { ok: false, error: error.message }; }
      return { ok: true };
    } catch (e) {
      console.error("saveResult error:", e);
      return { ok: false, error: e.message };
    }
  },

  async getUsers() {
    try {
      const { data, error } = await _supabase
        .from("profiles")
        .select("*")
        .order("id", { ascending: true });
      if (error) { console.error("getUsers error:", error); return []; }
      return data || [];
    } catch (e) {
      console.error("getUsers error:", e);
      return [];
    }
  },

  async getAllResults() {
    try {
      const { data, error } = await _supabase
        .from("results")
        .select("*")
        .order("id", { ascending: true });
      if (error) { console.error("getAllResults error:", error); return {}; }
      const grouped = {};
      for (const row of data || []) {
        const r = {
          ...row,
          test: row.test_name || row.test || "—",
          date: row.date || (row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"),
        };
        if (!grouped[r.user_id]) grouped[r.user_id] = [];
        grouped[r.user_id].push(r);
      }
      return grouped;
    } catch (e) {
      console.error("getAllResults error:", e);
      return {};
    }
  },

  // Lightweight — excludes heavy 'html' and 'answer_key' columns.
  async getTestsMeta() {
    try {
      const { data, error } = await _supabase
        .from("tests")
        .select("id, title, type, mode, url, question_count, created_at")
        .order("created_at", { ascending: true });
      if (error) { console.error("getTestsMeta error:", error); return []; }
      return data || [];
    } catch (e) {
      console.error("getTestsMeta error:", e);
      return [];
    }
  },

  // Full fetch — only used in add-tests.html manage tab
  async getTests() {
    try {
      const { data, error } = await _supabase
        .from("tests")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) { console.error("getTests error:", error); return []; }
      return data || [];
    } catch (e) {
      console.error("getTests error:", e);
      return [];
    }
  },

  // Single test fetch with sessionStorage caching + decompression
  async getTest(testId) {
    try {
      // Check cache first
      try {
        const cached = sessionStorage.getItem('test_' + testId);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id) {
            // Log size for diagnostics
            console.info(`[getTest] cache hit — ${testId} (${(cached.length/1024).toFixed(1)} KB cached)`);
            return parsed;
          }
        }
      } catch (_) {
        sessionStorage.removeItem('test_' + testId);
      }

      console.info(`[getTest] fetching from DB — ${testId}`);
      const t0 = performance.now();

      const { data, error } = await _supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .single();

      const elapsed = (performance.now() - t0).toFixed(0);
      if (error) { console.error("getTest error:", error); return null; }

      // Decompress html field if it was stored compressed
      if (data && data.html) {
        const rawSize = (JSON.stringify(data).length / 1024).toFixed(1);
        console.info(`[getTest] fetched in ${elapsed}ms — raw payload ${rawSize} KB`);
        data.html = await _decompress(data.html);
      }

      // Cache the decompressed version
      try {
        if (data) sessionStorage.setItem('test_' + testId, JSON.stringify(data));
      } catch (_) {}

      return data || null;
    } catch (e) {
      console.error("getTest error:", e);
      return null;
    }
  },

  // Save test — compresses HTML before storing to reduce DB payload size
  async saveTest(testObj) {
    try {
      const toSave = { ...testObj };

      // Compress HTML if present and not already compressed
      if (toSave.html && !toSave.html.startsWith('__gz__')) {
        const originalKB = (toSave.html.length / 1024).toFixed(1);
        toSave.html = await _compress(toSave.html);
        const compressedKB = (toSave.html.length / 1024).toFixed(1);
        console.info(`[saveTest] HTML compressed: ${originalKB} KB → ${compressedKB} KB`);
      }

      const { error } = await _supabase.from("tests").insert(toSave);
      if (error) {
        console.error("saveTest error:", error.message, error.details, error.hint);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (e) {
      console.error("saveTest error:", e);
      return { ok: false, error: e.message };
    }
  },

  async deleteTest(testId) {
    try {
      try { sessionStorage.removeItem('test_' + testId); } catch (_) {}
      const { error } = await _supabase.from("tests").delete().eq("id", testId);
      if (error) { console.error("deleteTest error:", error); return { ok: false, error: error.message }; }
      return { ok: true };
    } catch (e) {
      console.error("deleteTest error:", e);
      return { ok: false, error: e.message };
    }
  },
};

/** Returns a human-readable label + emoji for a test type */
function typeLabel(type) {
  if (type === 'reading')   return { emoji: '📖', label: 'Reading',   badge: 'badge-red'   };
  if (type === 'listening') return { emoji: '🎧', label: 'Listening', badge: 'badge-blue'  };
  if (type === 'article')   return { emoji: '📰', label: 'Article',   badge: 'badge-green' };
  return { emoji: '📋', label: type || 'Test', badge: 'badge-gray' };
}

function bandScore(score, total) {
  const pct = pctScore(score, total);
  if (pct >= 97) return 9;
  if (pct >= 87) return 8.5;
  if (pct >= 80) return 8;
  if (pct >= 72) return 7.5;
  if (pct >= 63) return 7;
  if (pct >= 55) return 6.5;
  if (pct >= 47) return 6;
  if (pct >= 40) return 5.5;
  if (pct >= 33) return 5;
  if (pct >= 27) return 4.5;
  if (pct >= 20) return 4;
  return 3.5;
}

function pctScore(score, total) {
  if (!total) return 0;
  return Math.round((score / total) * 100);
}

function bandColor(pct) {
  if (pct >= 80) return "var(--green, #16a34a)";
  if (pct >= 60) return "var(--yellow, #ca8a04)";
  return "var(--red, #922B21)";
}