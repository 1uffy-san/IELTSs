// ============================================================
// IELTS MASTER — auth.js (Supabase version)
// ============================================================

const TEACHER_CODE = "Gitpush4611";

const Auth = {
  async currentUser() {
    try {
      const {
        data: { session },
      } = await _supabase.auth.getSession();
      if (!session) return null;
      const { data: profile } = await _supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      return profile || null;
    } catch (e) {
      console.error("currentUser error:", e);
      return null;
    }
  },

  async initUser(requiredRole) {
    const user = await Auth.currentUser();
    if (!user) {
      window.location.href = "../index.html";
      return null;
    }
    if (requiredRole && user.role !== requiredRole) {
      window.location.href = "../index.html";
      return null;
    }
    window.__user = user;
    return user;
  },

  async initUserOptional() {
    const user = await Auth.currentUser();
    window.__user = user || null;
    return user || null;
  },

  async registerEmail(name, email, password) {
    const isTeacher = password === TEACHER_CODE;
    const validRole = isTeacher ? "teacher" : "student";

    const actualPassword = isTeacher
      ? "TeacherAcc_" + Math.random().toString(36).slice(2) + "!Aa1"
      : password;

    const { data, error } = await _supabase.auth.signUp({
      email,
      password: actualPassword,
      options: { data: { teacher_code_used: isTeacher } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user)
      return { ok: false, error: "Registration failed. Please try again." };

    const { error: profileErr } = await _supabase.from("profiles").insert({
      id: data.user.id,
      email,
      name,
      role: validRole,
      provider: "email",
    });
    if (profileErr) return { ok: false, error: profileErr.message };

    if (isTeacher) {
      await _supabase.auth.signOut();
      return { ok: true, isTeacher: true, email };
    }

    return { ok: true, isTeacher: false };
  },

  async loginEmail(email, password) {
    if (password === TEACHER_CODE) {
      const { data: profiles, error: pErr } = await _supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .eq("role", "teacher")
        .single();
      if (pErr || !profiles) {
        return {
          ok: false,
          error:
            "No teacher account found for this email. Please sign up first using the teacher code.",
        };
      }
      const { error: otpErr } = await _supabase.auth.signInWithOtp({ email });
      if (otpErr) return { ok: false, error: otpErr.message };
      return { ok: true, isTeacher: true, magicLink: true };
    }

    const { error } = await _supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // ── Google One-Tap credential handler ──
  async handleGoogleCredential(response, role) {
    try {
      const { data, error } = await _supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      if (error) return { ok: false, error: error.message };

      const user = data.user;
      const { data: existing } = await _supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existing) {
        const { error: profileErr } = await _supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          picture: user.user_metadata?.avatar_url || null,
          role: role || "student",
          provider: "google",
        });
        if (profileErr) return { ok: false, error: profileErr.message };
      }

      return { ok: true };
    } catch (e) {
      console.error("handleGoogleCredential error:", e);
      return { ok: false, error: "Google sign-in failed. Please try again." };
    }
  },

  async logout() {
    await _supabase.auth.signOut();
    window.__user = null;
    window.location.href = "../index.html";
  },
};

// ── HEADER RENDERER ──
function renderHeader(activePage) {
  const user = window.__user;
  const headerEl = document.getElementById("app-header");
  if (!headerEl) return;

  let navLinks = [];
  let rightHTML = "";

  if (user) {
    const isTeacher = user.role === "teacher";
    navLinks = isTeacher
      ? [
          { href: "dashboard.html", label: "🏠 Dashboard" },
          { href: "students.html", label: "👥 Students" },
          { href: "add-tests.html", label: "➕ Add Tests" },
        ]
      : [
          { href: "dashboard.html", label: "🏠 Dashboard" },
          { href: "tests.html", label: "📋 Tests" },
          { href: "results.html", label: "📊 My Results" },
        ];

    const safeName = (user.name || "User").replace(/</g, "&lt;");
    const safeFirst = safeName.split(" ")[0];
    const initials = safeName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const avatarHTML = user.picture
      ? `<img src="${user.picture}" class="avatar" alt="${safeName}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
      : `<div class="avatar-initial" style="width:32px;height:32px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${initials}</div>`;

    rightHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        ${avatarHTML}
        <span class="header-name" style="font-size:14px;font-weight:600">${safeFirst}</span>
        <span class="badge ${isTeacher ? "badge-red" : "badge-blue"}" style="font-size:11px">${isTeacher ? "Teacher" : "Student"}</span>
        <button class="btn btn-outline btn-sm" onclick="Auth.logout()">Log Out</button>
      </div>`;
  } else {
    rightHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <a href="../index.html" class="btn btn-primary btn-sm">Sign In / Sign Up</a>
      </div>`;
  }

  headerEl.innerHTML = `
    <a href="${user ? "dashboard.html" : "../index.html"}" class="header-logo">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      IELTS MASTER
    </a>
    <nav class="app-nav" style="display:flex;gap:4px">
      ${navLinks.map((l) => `<a href="${l.href}" class="${activePage === l.href ? "active" : ""}" style="padding:7px 14px;border-radius:7px;font-size:14px;font-weight:500;text-decoration:none;color:${activePage === l.href ? "var(--red)" : "var(--text)"};">${l.label}</a>`).join("")}
    </nav>
    <div class="header-right">
      ${rightHTML}
    </div>`;
}
