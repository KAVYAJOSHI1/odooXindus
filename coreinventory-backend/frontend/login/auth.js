/* ═══════════════════════════════════════════════════
   ShelfControl — login/auth.js
═══════════════════════════════════════════════════ */
'use strict';

/* ── TOGGLE PASSWORD VISIBILITY ───────────────────── */
function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.innerHTML = inp.type === 'text'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

/* ── ALERT HELPERS ────────────────────────────────── */
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'form-alert error show';
}
function clearAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'form-alert error';
}

/* ── LOGIN ────────────────────────────────────────── */
function handleLogin() {
  clearAlert('loginError');
  const email = document.getElementById('loginEmail')?.value.trim();
  const pwd   = document.getElementById('loginPassword')?.value;
  const btn   = document.getElementById('loginBtn');

  if (!email) { showError('loginError', 'Please enter your email address.'); return; }
  if (!email.includes('@')) { showError('loginError', 'Please enter a valid email address.'); return; }
  if (!pwd)   { showError('loginError', 'Please enter your password.'); return; }
  if (pwd.length < 4) { showError('loginError', 'Invalid email or password.'); return; }

  // Call backend API
  btn.textContent = 'Signing in…';
  btn.disabled = true;

  fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email.split('@')[0], password: pwd }) // Simple demo username derivation
  })
  .then(res => {
    if (!res.ok) throw new Error('Invalid email or password.');
    return res.json();
  })
  .then(data => {
    const nameParts = email.split('@')[0].split('.');
    const name = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const initials = nameParts.map(p => p[0]?.toUpperCase()).join('').slice(0,2);
    localStorage.setItem('ci_user', JSON.stringify({ name, email, role: 'Inv. Manager', initials }));
    window.location.href = '../dashboard/dashboard.html';
  })
  .catch(err => {
    showError('loginError', err.message);
    btn.textContent = 'Login';
    btn.disabled = false;
  });
}

function demoLogin() {
  localStorage.setItem('ci_user', JSON.stringify({
    name: 'Raj Kumar', email: 'raj@demo.com',
    role: 'Inv. Manager', initials: 'RK'
  }));
  window.location.href = '../dashboard/dashboard.html';
}

/* ── SIGNUP ───────────────────────────────────────── */
function handleSignup() {
  clearAlert('signupError');
  const first   = document.getElementById('firstName')?.value.trim();
  const last    = document.getElementById('lastName')?.value.trim();
  const email   = document.getElementById('signupEmail')?.value.trim();
  const role    = document.getElementById('signupRole')?.value;
  const pwd     = document.getElementById('signupPassword')?.value;
  const confirm = document.getElementById('confirmPassword')?.value;
  const agreed  = document.getElementById('agreeTerms')?.checked;

  if (!first || !last) { showError('signupError', 'Please enter your full name.'); return; }
  if (!email || !email.includes('@')) { showError('signupError', 'Please enter a valid email.'); return; }
  if (!role) { showError('signupError', 'Please select your role.'); return; }
  if (!pwd || pwd.length < 8) { showError('signupError', 'Password must be at least 8 characters.'); return; }
  if (pwd !== confirm) { showError('signupError', 'Passwords do not match.'); return; }
  if (!agreed) { showError('signupError', 'Please agree to the Terms of Service.'); return; }

  const name = `${first} ${last}`;
  const initials = (first[0] + last[0]).toUpperCase();
  const username = email.split('@')[0];

  fetch('/api/auth/signup/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password: pwd })
  })
  .then(res => {
    if (!res.ok) throw new Error('Error creating account. Username/Email might be taken.');
    return res.json();
  })
  .then(data => {
    localStorage.setItem('ci_user', JSON.stringify({ name, email, role, initials }));
    window.location.href = '../dashboard/dashboard.html';
  })
  .catch(err => {
    showError('signupError', err.message);
  });
}

/* ── OTP FLOW ─────────────────────────────────────── */
let DEMO_OTP = '123456';
let otpTimer;

function sendOTP() {
  const email = document.getElementById('resetEmail')?.value.trim();
  if (!email || !email.includes('@')) {
    showError('step1Error', 'Please enter a valid email address.'); return;
  }

  // Show step 2
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  document.getElementById('otpEmailDisplay').textContent = email;
  document.getElementById('step2Ind').className = 'step active';

  // Focus first OTP input
  const inputs = document.querySelectorAll('.otp-input');
  if (inputs[0]) inputs[0].focus();
  initOTPInputs();
  startResendTimer();
}

function initOTPInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach((inp, i) => {
    inp.value = '';
    inp.addEventListener('input', e => {
      inp.classList.toggle('filled', inp.value.length > 0);
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
    });
    inp.addEventListener('paste', e => {
      e.preventDefault();
      const data = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
      [...data].forEach((ch, j) => { if (inputs[j]) { inputs[j].value = ch; inputs[j].classList.add('filled'); } });
      if (inputs[Math.min(data.length, inputs.length - 1)]) inputs[Math.min(data.length, inputs.length - 1)].focus();
    });
  });
}

function getOTPValue() {
  return [...document.querySelectorAll('.otp-input')].map(i => i.value).join('');
}

function verifyOTP() {
  const entered = getOTPValue();
  if (entered.length < 6) { showError('step2Error', 'Please enter all 6 digits.'); return; }
  if (entered !== DEMO_OTP) { showError('step2Error', `Incorrect OTP. (Demo hint: use ${DEMO_OTP})`); return; }

  clearInterval(otpTimer);
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'block';
  document.getElementById('step2Ind').className = 'step done';
  document.getElementById('step3Ind').className = 'step active';
}

function resendOTP() {
  document.querySelectorAll('.otp-input').forEach(i => { i.value = ''; i.classList.remove('filled'); });
  clearAlert('step2Error');
  startResendTimer();
  alert(`New OTP sent! (Demo: use ${DEMO_OTP})`);
}

function startResendTimer() {
  let secs = 30;
  const el = document.getElementById('resendTimer');
  clearInterval(otpTimer);
  if (el) el.textContent = ` (${secs}s)`;
  otpTimer = setInterval(() => {
    secs--;
    if (el) el.textContent = secs > 0 ? ` (${secs}s)` : '';
    if (secs <= 0) clearInterval(otpTimer);
  }, 1000);
}

function resetPassword() {
  const pwd     = document.getElementById('newPassword')?.value;
  const confirm = document.getElementById('confirmNewPassword')?.value;
  if (!pwd || pwd.length < 8) { showError('step3Error', 'Password must be at least 8 characters.'); return; }
  if (pwd !== confirm) { showError('step3Error', 'Passwords do not match.'); return; }

  // Success
  setTimeout(() => {
    alert('Password reset successfully! Redirecting to login…');
    window.location.href = 'login.html';
  }, 500);
}

/* ── ENTER KEY SUPPORT ────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const page = document.querySelector('[id$="Page"]');
  if (document.getElementById('loginBtn') && !document.getElementById('loginBtn').disabled) handleLogin();
});
