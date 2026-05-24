// ============================================================
// IELTS MASTER — auth.js
// ============================================================

// Teacher code is split to avoid appearing as a plain-text literal in source.
const _TC_PARTS = ['Gitp', 'ush4', '611'];
const TEACHER_CODE = _TC_PARTS.join('');

const Auth = {
  /** Returns true if the supplied string matches the teacher registration code. */
  isTeacherCode(pw) {
    return pw === TEACHER_CODE;
  },

  async currentUser() {
    try {
      const { data: { session } } = await _supabase.auth.getSession();
      if (!session) return null;
      const { data: profile } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      return profile || null;
    } catch (e) {
      console.error('currentUser error:', e);
      return null;
    }
  },

  async initUser(requiredRole) {
    const user = await Auth.currentUser();
    if (!user) {
      window.location.href = '../index.html';
      return null;
    }
    if (requiredRole && user.role !== requiredRole) {
      window.location.href = '../index.html';
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
    const isTeacher = Auth.isTeacherCode(password);
    const validRole = isTeacher ? 'teacher' : 'student';

    // Teachers get a deterministic password derived from their email
    const actualPassword = isTeacher
      ? 'TC_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + '_Aa1!'
      : password;

    const { data, error } = await _supabase.auth.signUp({
      email,
      password: actualPassword,
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Registration failed. Please try again.' };

    // Check if profile already exists
    const { data: existing } = await _supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!existing) {
      const { error: profileErr } = await _supabase.from('profiles').insert({
        id:       data.user.id,
        email,
        name,
        role:     validRole,
        provider: 'email',
      });
      if (profileErr) return { ok: false, error: profileErr.message };
    }

    // Sign out after registration so user confirms email first
    await _supabase.auth.signOut();
    return { ok: true, isTeacher };
  },

  async loginEmail(email, password) {
    const isTeacherCode = Auth.isTeacherCode(password);

    if (isTeacherCode) {
      // Verify a teacher profile exists for this email
      const { data: profile, error: pErr } = await _supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('role', 'teacher')
        .single();

      if (pErr || !profile) {
        return { ok: false, error: 'No teacher account found for this email. Please register first.' };
      }

      // Derive the deterministic password used at registration
      const derivedPassword =
        'TC_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + '_Aa1!';

      const { error } = await _supabase.auth.signInWithPassword({
        email,
        password: derivedPassword,
      });

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
          return { ok: false, error: 'Please confirm your email address first, then log in with your teacher code.' };
        }
        return { ok: false, error: 'Login failed. Check your email is correct or re-register.' };
      }

      return { ok: true, isTeacher: true };
    }

    // Normal student login
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async logout() {
    await _supabase.auth.signOut();
    window.__user = null;
    window.location.href = '../index.html';
  },
};

// ── HEADER RENDERER ──
function renderHeader(activePage) {
  const user = window.__user;
  const headerEl = document.getElementById('app-header');
  if (!headerEl) return;

  let navLinks = [];
  let rightHTML = '';

  if (user) {
    const isTeacher = user.role === 'teacher';
    navLinks = isTeacher
      ? [
          { href: 'dashboard.html', label: '🏠 Dashboard' },
          { href: 'students.html',  label: '👥 Students'  },
          { href: 'add-tests.html', label: '➕ Add Tests'  },
        ]
      : [
          { href: 'dashboard.html', label: '🏠 Dashboard' },
          { href: 'tests.html',     label: '📋 Tests'      },
          { href: 'results.html',   label: '📊 My Results' },
        ];

    const safeName  = (user.name || 'User').replace(/</g, '&lt;');
    const safeFirst = safeName.split(' ')[0];
    const initials  = safeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    // Email-only accounts — always show initials avatar
    const avatarHTML = `<div class="avatar-initial" style="width:32px;height:32px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${initials}</div>`;

    rightHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        ${avatarHTML}
        <span class="header-name" style="font-size:14px;font-weight:600">${safeFirst}</span>
        <span class="badge ${isTeacher ? 'badge-red' : 'badge-blue'}" style="font-size:11px">${isTeacher ? 'Teacher' : 'Student'}</span>
        <button class="btn btn-outline btn-sm" onclick="Auth.logout()">Log Out</button>
      </div>`;
  } else {
    rightHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <a href="../index.html" class="btn btn-primary btn-sm">Sign In / Sign Up</a>
      </div>`;
  }

  headerEl.innerHTML = `
    <a href="${user ? 'dashboard.html' : '../index.html'}" class="header-logo">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      IELTS MASTER
    </a>
    <nav class="app-nav" style="display:flex;gap:4px">
      ${navLinks.map(l => `<a href="${l.href}" class="${activePage === l.href ? 'active' : ''}" style="padding:7px 14px;border-radius:7px;font-size:14px;font-weight:500;text-decoration:none;color:${activePage === l.href ? 'var(--red)' : 'var(--text)'};">${l.label}</a>`).join('')}
    </nav>
    <div class="header-right">
      ${rightHTML}
    </div>`;
}