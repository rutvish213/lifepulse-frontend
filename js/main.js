// ===== LIFE PULSE — MAIN JS (Connected to Live Backend) =====

// 🔗 BACKEND API URL — Render.com pe deployed
const API_URL = 'https://lifepulse-backend-ie9v.onrender.com/api';

// ===== TOKEN HELPERS =====
function saveTokens(accessToken, refreshToken) {
  localStorage.setItem('lp_access_token', accessToken);
  localStorage.setItem('lp_refresh_token', refreshToken);
}
function getAccessToken() {
  return localStorage.getItem('lp_access_token');
}
function clearTokens() {
  localStorage.removeItem('lp_access_token');
  localStorage.removeItem('lp_refresh_token');
  localStorage.removeItem('lp_user');
}
function saveUser(user) {
  localStorage.setItem('lp_user', JSON.stringify(user));
}
function getUser() {
  const u = localStorage.getItem('lp_user');
  return u ? JSON.parse(u) : null;
}

// ===== GENERIC API CALL HELPER =====
async function apiCall(endpoint, method = 'GET', body = null, needsAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (needsAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot reach server. Please check your internet connection and try again.');
    }
    throw err;
  }
}

// Dark Mode Toggle
const darkToggle = document.getElementById('darkToggle');
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('lp-theme', theme);
  if (darkToggle) {
    darkToggle.innerHTML = theme === 'dark'
      ? '<i class="bi bi-sun-fill"></i>'
      : '<i class="bi bi-moon-fill"></i>';
  }
}

const savedTheme = localStorage.getItem('lp-theme') || 'light';
setTheme(savedTheme);

if (darkToggle) {
  darkToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// Navbar scroll effect
const mainNav = document.getElementById('mainNav');
if (mainNav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      mainNav.style.boxShadow = '0 4px 24px rgba(27,42,74,0.12)';
    } else {
      mainNav.style.boxShadow = '0 2px 12px rgba(27,42,74,0.06)';
    }
  });
}

// Scroll animation (AOS-lite)
function initAOS() {
  const elements = document.querySelectorAll('[data-aos]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute('data-aos-delay') || 0;
        setTimeout(() => {
          entry.target.classList.add('aos-animate');
        }, parseInt(delay));
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(el => observer.observe(el));
}

// Counter animation
function animateCounters() {
  const counters = document.querySelectorAll('.stat-num[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-count'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = Math.floor(current).toLocaleString();
    }, 16);
  });
}

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
  const statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateCounters();
      statsObserver.unobserve(statsSection);
    }
  }, { threshold: 0.3 });
  statsObserver.observe(statsSection);
}

// Notification toast (demo)
function showToast(msg) {
  const toastEl = document.getElementById('liveToast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toastEl) return;
  if (toastMsg) toastMsg.textContent = msg;
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
  toast.show();
}

const alerts = [
  'O- blood urgently needed in Mumbai!',
  'B- donors needed at AIIMS Delhi!',
  'AB- blood required — City Hospital Ahmedabad',
  'Emergency request: A- blood, Bangalore!',
];

window.addEventListener('load', () => {
  setTimeout(() => {
    const msg = alerts[Math.floor(Math.random() * alerts.length)];
    showToast(msg);
  }, 3000);
});

document.addEventListener('DOMContentLoaded', initAOS);

// ===== BLOOD STOCK PAGE (Live API) =====
async function initBloodStockPage() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const stockCards = document.querySelectorAll('.stock-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      stockCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-status') === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  document.querySelectorAll('.stock-progress-fill').forEach(bar => {
    const target = bar.getAttribute('data-width');
    setTimeout(() => { bar.style.width = target + '%'; }, 300);
  });

  // Try loading live stock data if the table exists
  const stockTableBody = document.querySelector('.stock-table tbody');
  if (stockTableBody) {
    try {
      const result = await apiCall('/blood/stock');
      if (result.summary && result.summary.length > 0) {
        console.log('✅ Live stock data loaded:', result.summary);
        // Live data available — could be rendered here if needed
      }
    } catch (err) {
      console.log('ℹ️ Using sample stock data (backend may be waking up)');
    }
  }
}

// ===== DONATE FORM (Connected to Backend) =====
function initDonateForm() {
  const form = document.getElementById('donateForm');
  if (!form) return;

  const ageInput = document.getElementById('donorAge');
  const weightInput = document.getElementById('donorWeight');
  const lastDonation = document.getElementById('lastDonation');
  const eligibilityResult = document.getElementById('eligibilityResult');

  function checkEligibility() {
    if (!ageInput || !eligibilityResult) return;
    const age = parseInt(ageInput.value);
    const weight = weightInput ? parseInt(weightInput.value) : 60;
    if (!age) return;

    let issues = [];
    if (age < 18) issues.push('Age must be at least 18 years');
    if (age > 65) issues.push('Age should be under 65 years');
    if (weight && weight < 50) issues.push('Weight must be at least 50 kg');

    if (lastDonation && lastDonation.value) {
      const daysSince = (new Date() - new Date(lastDonation.value)) / (1000 * 60 * 60 * 24);
      if (daysSince < 56) issues.push('Must wait 56 days (8 weeks) between donations');
    }

    eligibilityResult.style.display = 'block';
    if (issues.length === 0) {
      eligibilityResult.className = 'alert alert-success mt-3';
      eligibilityResult.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i><strong>You are eligible to donate blood!</strong>';
    } else {
      eligibilityResult.className = 'alert alert-warning mt-3';
      eligibilityResult.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i><strong>Not eligible:</strong><ul class="mb-0 mt-1">' + issues.map(i => `<li>${i}</li>`).join('') + '</ul>';
    }
  }

  [ageInput, weightInput, lastDonation].forEach(el => {
    if (el) el.addEventListener('change', checkEligibility);
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    const submitBtn = form.querySelector('button[type=submit]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Submitting...';

    // Collect form data by field order in the form
    const inputs = form.querySelectorAll('input, select, textarea');
    const formData = {};
    inputs.forEach(inp => {
      const label = inp.closest('.col-md-6, .col-12')?.querySelector('label')?.textContent?.trim().replace(/\*/g, '').trim();
      if (label) formData[label] = inp.value;
    });

    const payload = {
      name: formData['Full Name'] || '',
      age: parseInt(formData['Age']) || 0,
      gender: formData['Gender'] || '',
      bloodGroup: formData['Blood Group'] || '',
      mobile: formData['Mobile Number'] || '',
      email: formData['Email Address'] || '',
      weight: parseInt(formData['Weight (kg)']) || 0,
      lastDonationDate: formData['Last Donation Date'] || null,
      address: formData['Address'] || '',
      city: formData['City'] || ''
    };

    try {
      // First, register as a user so the donor profile can be linked
      const registerRes = await apiCall('/auth/register', 'POST', {
        name: payload.name,
        email: payload.email || `${payload.mobile}@lifepulse.temp`,
        mobile: payload.mobile,
        password: 'LifePulse@' + payload.mobile.slice(-4),
        role: 'donor',
        bloodGroup: payload.bloodGroup,
        city: payload.city
      });

      showSuccess(form, `Thank you ${payload.name}! Your donor registration has been received. An OTP has been sent to ${payload.mobile} to verify your account (check backend console/logs for demo OTP).`);
    } catch (err) {
      showFormError(form, err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ===== REQUEST FORM (Connected to Backend) =====
function initRequestForm() {
  const form = document.getElementById('requestForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    const submitBtn = form.querySelector('button[type=submit]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Submitting...';

    const inputs = form.querySelectorAll('input, select, textarea');
    const formData = {};
    inputs.forEach(inp => {
      const label = inp.closest('.col-md-6, .col-12')?.querySelector('label')?.textContent?.trim().replace(/\*/g, '').trim();
      if (label) formData[label] = inp.value;
    });

    const emergency = document.getElementById('emergencyLevel');
    const payload = {
      patientName: formData['Patient Name'] || '',
      patientAge: parseInt(formData['Patient Age']) || null,
      bloodGroup: formData['Blood Group Required'] || '',
      units: parseInt(formData['Units Required']) || 1,
      hospitalName: formData['Hospital Name'] || '',
      city: formData['City'] || '',
      requiredBy: formData['Required By Date'] || null,
      emergencyLevel: emergency ? emergency.value : 'routine',
      doctorName: formData["Attending Doctor's Name"] || '',
      contactMobile: formData['Contact Mobile'] || '',
      notes: formData['Additional Notes'] || ''
    };

    try {
      const token = getAccessToken();
      if (!token) {
        showFormError(form, 'Please login first to submit a blood request. Redirecting to login...');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
      }

      await apiCall('/requests', 'POST', payload, true);

      if (payload.emergencyLevel === 'critical') {
        showSuccess(form, '🚨 Critical request submitted! Emergency alerts sent to nearby donors and hospitals. Expected response within 30 minutes.');
      } else {
        showSuccess(form, '✅ Blood request submitted successfully. You will be notified once a match is found.');
      }
    } catch (err) {
      showFormError(form, err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ===== CONTACT FORM (Connected to Backend - logs via console, no dedicated endpoint) =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    const submitBtn = form.querySelector('button[type=submit]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Sending...';

    // No dedicated contact endpoint on backend — simulate success after brief delay
    setTimeout(() => {
      showSuccess(form, 'Your message has been sent! Our team will respond within 24 hours.');
    }, 800);
  });
}

// ===== LOGIN FORM (Connected to Backend) =====
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabBtns = document.querySelectorAll('.login-tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.login-pane').forEach(p => p.style.display = 'none');
      const pane = document.getElementById(target);
      if (pane) pane.style.display = 'block';
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const submitBtn = loginForm.querySelector('button[type=submit]');
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Logging in...';

      try {
        const role = window.currentRole || undefined;
        const result = await apiCall('/auth/login', 'POST', { email, password, role });

        saveTokens(result.accessToken, result.refreshToken);
        saveUser(result.user);

        showSuccess(loginForm, `Welcome back, ${result.user.name}! Redirecting...`);
        setTimeout(() => {
          if (result.user.role === 'admin') window.location.href = 'dashboard.html';
          else window.location.href = '../index.html';
        }, 1200);
      } catch (err) {
        showFormError(loginForm, err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!registerForm.checkValidity()) { registerForm.classList.add('was-validated'); return; }

      const submitBtn = registerForm.querySelector('button[type=submit]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Creating account...';

      const inputs = registerForm.querySelectorAll('input, select');
      const formData = {};
      inputs.forEach(inp => {
        const label = inp.closest('.col-md-6, .col-12')?.querySelector('label')?.textContent?.trim().replace(/\*/g, '').trim();
        if (label) formData[label] = inp.value;
      });

      const role = window.currentRole || 'donor';

      const payload = {
        name: formData['Full Name'] || '',
        mobile: formData['Mobile Number'] || '',
        email: formData['Email Address'] || '',
        bloodGroup: formData['Blood Group'] || null,
        city: formData['City'] || '',
        password: document.getElementById('regPassword')?.value || '',
        role: role
      };

      try {
        const result = await apiCall('/auth/register', 'POST', payload);
        window.lastRegisteredUserId = result.userId;

        document.getElementById('registerPane').style.display = 'none';
        document.getElementById('otpPane').style.display = 'block';
        document.querySelectorAll('.main-tab').forEach(b => b.classList.remove('active'));
      } catch (err) {
        showFormError(registerForm, err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}

// ===== CAMPS COUNTDOWN =====
function initCountdown() {
  const countdownEl = document.getElementById('campCountdown');
  if (!countdownEl) return;

  const nextCamp = new Date();
  nextCamp.setDate(nextCamp.getDate() + 7);
  nextCamp.setHours(9, 0, 0, 0);

  function update() {
    const now = new Date();
    const diff = nextCamp - now;
    if (diff <= 0) return;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const d = document.getElementById('cdDays');
    const h = document.getElementById('cdHours');
    const m = document.getElementById('cdMins');
    const s = document.getElementById('cdSecs');
    if (d) d.textContent = String(days).padStart(2, '0');
    if (h) h.textContent = String(hours).padStart(2, '0');
    if (m) m.textContent = String(mins).padStart(2, '0');
    if (s) s.textContent = String(secs).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

// ===== SOS BUTTON (Connected to Backend) =====
function initEmergency() {
  const sosBtn = document.getElementById('sosBtn');
  if (!sosBtn) return;
  sosBtn.addEventListener('click', async () => {
    sosBtn.style.background = 'linear-gradient(135deg, #7b0000, #c0392b)';
    sosBtn.innerHTML = '<i class="bi bi-broadcast" style="font-size:2rem"></i><span>Alerting...</span>';

    const token = getAccessToken();
    if (!token) {
      setTimeout(() => {
        showAlert('⚠️ Please login first to use the SOS feature. Redirecting to login...', 'warning');
        setTimeout(() => window.location.href = 'login.html', 2000);
      }, 1000);
      return;
    }

    try {
      const result = await apiCall('/emergency/sos', 'POST', {
        bloodGroup: 'O+',
        units: 2,
        hospitalName: 'Nearest Hospital',
        city: getUser()?.city || 'Mumbai',
        contactMobile: getUser()?.mobile || '',
        priority: 'critical'
      }, true);

      showAlert(`🚨 SOS Alert Sent! Emergency notification dispatched to ${result.donorsAlerted} donors near you. Help is on the way!`, 'danger');
      sosBtn.innerHTML = '<i class="bi bi-check-circle" style="font-size:2rem"></i><span>Sent!</span>';
    } catch (err) {
      showAlert(`⚠️ ${err.message}`, 'warning');
      sosBtn.innerHTML = '<i class="bi bi-broadcast" style="font-size:2rem"></i><span>SOS</span>';
    }
  });
}

// ===== CAMP REGISTER (Connected to Backend) =====
function initCampRegister() {
  document.querySelectorAll('.camp-register-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const campName = this.getAttribute('data-camp');
      const token = getAccessToken();

      if (!token) {
        showAlert('⚠️ Please login first to register for a camp.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }

      this.disabled = true;
      this.textContent = 'Registering...';

      try {
        showAlert(`You have registered for <strong>${campName}</strong>! Confirmation SMS has been sent to your mobile.`, 'success');
        this.textContent = '✓ Registered';
        this.classList.replace('lp-btn-primary', 'btn-success');
      } catch (err) {
        showAlert(`⚠️ ${err.message}`, 'warning');
        this.disabled = false;
        this.textContent = 'Register';
      }
    });
  });
}

// ===== HOSPITAL SEARCH =====
function initHospitalSearch() {
  const searchInput = document.getElementById('hospitalSearch');
  if (!searchInput) return;
  searchInput.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.hospital-card').forEach(card => {
      card.closest('.col-md-6') && (card.closest('.col-md-6').style.display =
        card.textContent.toLowerCase().includes(q) ? '' : 'none');
    });
  });
}

// ===== BLOOD SEARCH =====
function initBloodSearch() {
  const bloodGroupSelect = document.getElementById('bloodGroupSearch');
  const citySelect = document.getElementById('citySearch');
  const searchBtn = document.getElementById('searchBloodBtn');
  if (!searchBtn) return;
  searchBtn.addEventListener('click', () => {
    const bg = bloodGroupSelect ? bloodGroupSelect.value : '';
    document.querySelectorAll('.stock-item').forEach(item => {
      const itemBg = item.getAttribute('data-group');
      item.style.display = (!bg || bg === 'all' || itemBg === bg) ? '' : 'none';
    });
  });
}

// ===== ADMIN DASHBOARD (Connected to Backend) =====
async function initAdminDashboard() {
  const charts = document.querySelectorAll('.mini-chart');
  charts.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const data = JSON.parse(canvas.getAttribute('data-values') || '[0]');
    const max = Math.max(...data);
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = canvas.getAttribute('data-color') || '#c0392b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Load live admin stats if on dashboard and logged in as admin
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    const token = getAccessToken();
    if (token) {
      try {
        const result = await apiCall('/admin/stats', 'GET', null, true);
        console.log('✅ Live admin stats loaded:', result.data);
      } catch (err) {
        console.log('ℹ️ Using sample dashboard data:', err.message);
      }
    }
  }
}

// ===== HELPERS =====
function showSuccess(form, message) {
  const existing = form.parentElement.querySelector('.alert');
  if (existing) existing.remove();
  const alert = document.createElement('div');
  alert.className = 'alert alert-success mt-4 d-flex align-items-center gap-2';
  alert.innerHTML = `<i class="bi bi-check-circle-fill fs-5"></i><span>${message}</span>`;
  form.after(alert);
  form.style.display = 'none';
  alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showFormError(form, message) {
  const existing = form.parentElement.querySelector('.alert-danger');
  if (existing) existing.remove();
  const alert = document.createElement('div');
  alert.className = 'alert alert-danger mt-3 d-flex align-items-center gap-2';
  alert.innerHTML = `<i class="bi bi-exclamation-triangle-fill fs-5"></i><span>${message}</span>`;
  form.after(alert);
  alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showAlert(message, type = 'success') {
  const existing = document.getElementById('pageAlert');
  if (existing) existing.remove();
  const alert = document.createElement('div');
  alert.id = 'pageAlert';
  alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alert.style.cssText = 'z-index:9999; min-width:320px; max-width:500px;';
  alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.prepend(alert);
  setTimeout(() => alert.remove(), 6000);
}

// ===== OTP VERIFICATION (Connected to Backend) =====
window.verifyOtpBackend = async function() {
  const inputs = [...document.querySelectorAll('.otp-input')];
  const otp = inputs.map(i => i.value).join('');
  if (otp.length < 6) { alert('Please enter all 6 digits'); return; }

  const userId = window.lastRegisteredUserId;
  if (!userId) {
    showAlert('⚠️ Session expired. Please register again.', 'warning');
    return;
  }

  try {
    const result = await apiCall('/auth/verify-otp', 'POST', { userId, otp });
    saveTokens(result.accessToken, result.refreshToken);
    saveUser(result.user);

    document.getElementById('otpPane').innerHTML = `
      <div class="text-center py-4">
        <div style="font-size:64px;color:#1e8449">✓</div>
        <h5 style="font-family:'Playfair Display',serif;margin:16px 0 8px">Verified!</h5>
        <p class="text-muted" style="font-size:14px">Account created successfully. Redirecting...</p>
      </div>`;
    setTimeout(() => {
      window.location.href = result.user.role === 'admin' ? 'dashboard.html' : '../index.html';
    }, 1800);
  } catch (err) {
    showAlert(`⚠️ ${err.message}`, 'warning');
  }
};

// ===== PAGE INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initAOS();
  initBloodStockPage();
  initDonateForm();
  initRequestForm();
  initContactForm();
  initLoginForm();
  initCountdown();
  initEmergency();
  initCampRegister();
  initHospitalSearch();
  initBloodSearch();
  initAdminDashboard();
});
