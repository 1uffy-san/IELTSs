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
      const correctAnswers =
        resultObj.correctAnswers || resultObj.correct_answers || [];

      const { error } = await _supabase.from("results").insert({
        user_id:         userId,
        test_name:       resultObj.test,
        type:            resultObj.type,
        score:           resultObj.score,
        total:           resultObj.total,
        answers:         resultObj.answers || [],
        correct_answers: correctAnswers,
      });
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

  // ✅ NEW: Lightweight fetch — excludes heavy 'html' and 'answer_key' columns.
  // Use this for listing tests (tests.html, dashboard, etc.)
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

  // Full fetch including html/answer_key — only use when actually taking a test
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

  // ✅ Fetches a single test by ID — used in take-test.html
 async getTest(testId) {
  try {
    // ✅ FIX 2: Return cached version if already fetched this session
    const cached = sessionStorage.getItem('test_' + testId);
    if (cached) return JSON.parse(cached);

    const { data, error } = await _supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();
    if (error) { console.error("getTest error:", error); return null; }

    // Cache it for this session
    if (data) sessionStorage.setItem('test_' + testId, JSON.stringify(data));
    return data || null;
  } catch (e) {
    console.error("getTest error:", e);
    return null;
  }
},,

  async saveTest(testObj) {
    try {
      const { error } = await _supabase.from("tests").insert(testObj);
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
      const { error } = await _supabase.from("tests").delete().eq("id", testId);
      if (error) { console.error("deleteTest error:", error); return { ok: false, error: error.message }; }
      return { ok: true };
    } catch (e) {
      console.error("deleteTest error:", e);
      return { ok: false, error: e.message };
    }
  },
};


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