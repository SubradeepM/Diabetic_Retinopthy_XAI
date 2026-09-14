const SEVERITY = {
  0: { label: "No DR",            color: "var(--sev-0)", badge: "badge-success" },
  1: { label: "Mild DR",          color: "var(--sev-1)", badge: "badge-success" },
  2: { label: "Moderate DR",      color: "var(--sev-2)", badge: "badge-warning" },
  3: { label: "Severe DR",        color: "var(--sev-3)", badge: "badge-warning" },
  4: { label: "Proliferative DR", color: "var(--sev-4)", badge: "badge-danger"  },
};

// Small line icons (stroke-based, matches the brand mark's stroke style).
const ICONS = {
  dashboard: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  addPatient: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M18 8v6M15 11h6"/></svg>`,
  screen: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/></svg>`,
  records: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>`,
  patients: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="8" r="2.8"/><path d="M15.5 14.2c2.6.4 4.5 2.5 4.5 5.8"/></svg>`,
  images: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5.5-5-9.5 8"/></svg>`,
  referral: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v6m0 0-3-3m3 3 3-3"/><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/></svg>`,
  emptyTray: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h4l2 3h6l2-3h4"/><path d="M5.5 6h13l1.5 7v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6l1.5-7Z"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  chat: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12c0 4.4-4 8-9 8-1.3 0-2.6-.2-3.7-.7L3 20l1.1-4.4C3.4 14.4 3 13.2 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z"/></svg>`,
};

// Fetches every image for a patient along with whether each has a prediction
// yet, so uploads are visible immediately instead of only after classification.
async function loadImagesWithStatus(patientId) {
  const images = await api.listPatientImages(patientId);
  const withStatus = await Promise.all(images.map(async (img) => {
    try {
      const preds = await api.getImagePredictions(img.image_id);
      return { image: img, prediction: preds.length ? preds[preds.length - 1] : null };
    } catch (e) {
      return { image: img, prediction: null };
    }
  }));
  return withStatus;
}

function renderImageStatusList(container, items, { emptyMessage, actionLabel, onAction }) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${ICONS.emptyTray}<div class="empty-state-title">Nothing here yet</div><div>${emptyMessage}</div></div>`;
    return;
  }
  container.innerHTML = items.map(({ image, prediction }, idx) => {
    const qualityGood = image.quality_status === "acceptable";
    let statusHtml;
    if (prediction) {
      const sev = SEVERITY[prediction.dr_level] || SEVERITY[0];
      statusHtml = `
        <span class="sev-dot" style="background:${sev.color}"></span>${sev.label}
        ${prediction.referable
          ? '<span class="badge badge-danger" style="margin-left:8px">Refer</span>'
          : '<span class="badge badge-success" style="margin-left:8px">Routine</span>'}`;
    } else {
      statusHtml = `<span class="badge badge-neutral">${ICONS.clock} Pending review</span>`;
    }
    const actionHtml = (!prediction && onAction)
      ? `<button class="btn btn-secondary btn-sm" data-image-id="${image.image_id}" data-idx="${idx}">${actionLabel}</button>`
      : "";
    return `
      <div class="image-row">
        <img class="preview-thumb" src="${api.imageUrl(image.filename)}" onerror="this.style.visibility='hidden'" />
        <div class="image-row-body">
          <div class="image-row-top">
            <strong>${formatDate(image.upload_time)}</strong>
            ${qualityGood
              ? '<span class="badge badge-success">Quality OK</span>'
              : '<span class="badge badge-warning">Quality: recapture</span>'}
          </div>
          <div class="image-row-status">${statusHtml}</div>
        </div>
        ${actionHtml}
      </div>`;
  }).join("");

  if (onAction) {
    container.querySelectorAll("button[data-image-id]").forEach((btn) => {
      btn.addEventListener("click", () => onAction(btn.dataset.imageId, btn));
    });
  }
}

const viewEl = document.getElementById("view");
const bodyEl = document.body;

function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function apiErrorState(e) {
  return `<div class="empty-state">
    <div class="empty-state-title">Can't reach the API</div>
    <div>${e.message || "Make sure the backend is running at " + API_BASE}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Nav definitions per role
// ---------------------------------------------------------------------------
const DOCTOR_NAV = [
  { route: "dashboard", label: "Dashboard", icon: "dashboard" },
  { route: "add-patient", label: "Add patient", icon: "addPatient" },
  { route: "screen", label: "Screen a patient", icon: "screen" },
  { route: "records", label: "Records", icon: "records" },
  { route: "chat", label: "Ask Retinova", icon: "chat" },
];
const PATIENT_NAV = [
  { route: "my-screenings", label: "My screenings", icon: "screen" },
  { route: "chat", label: "Ask Retinova", icon: "chat" },
];

const routes = {
  login: renderLogin,
  signup: renderSignup,
  dashboard: renderDashboard,
  "add-patient": renderAddPatient,
  screen: renderScreen,
  records: renderRecords,
  "my-screenings": renderMyScreenings,
  chat: renderChat,
};

const DOCTOR_ROUTES = new Set(["dashboard", "add-patient", "screen", "records", "chat"]);
const PATIENT_ROUTES = new Set(["my-screenings", "chat"]);

function renderSidebar() {
  const loggedIn = auth.isLoggedIn();
  const sidebar = document.getElementById("sidebar");
  const navEl = document.getElementById("nav-links");
  const userChip = document.getElementById("user-chip");

  if (!loggedIn) {
    sidebar.style.display = "none";
    return;
  }
  sidebar.style.display = "flex";

  const data = auth.get();
  const items = data.role === "doctor" ? DOCTOR_NAV : PATIENT_NAV;
  navEl.innerHTML = items
    .map((i) => `<a href="#${i.route}" data-route="${i.route}" class="nav-link">${ICONS[i.icon] || ""}<span>${i.label}</span></a>`)
    .join("");

  userChip.style.display = "flex";
  userChip.innerHTML = `
    <div>
      <div class="user-chip-name">${data.full_name || "Account"}</div>
      <div class="user-chip-role">${data.role}</div>
    </div>
    <button class="user-chip-logout" id="btn-logout">Log out</button>
  `;
  document.getElementById("btn-logout").addEventListener("click", () => {
    auth.clear();
    location.hash = "#login";
    navigate();
  });
}

function setActiveNav(route) {
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

function navigate() {
  const hash = (location.hash || "#dashboard").replace("#", "");
  const loggedIn = auth.isLoggedIn();

  renderSidebar();

  // Not logged in: only login/signup are reachable.
  if (!loggedIn) {
    const route = hash === "signup" ? "signup" : "login";
    bodyEl.classList.add("auth-mode");
    routes[route]();
    return;
  }
  bodyEl.classList.remove("auth-mode");

  // Logged in: bounce away from login/signup, and away from routes that
  // don't belong to this account's role.
  const data = auth.get();
  let route = hash;
  if (route === "login" || route === "signup" || !routes[route]) {
    route = data.role === "doctor" ? "dashboard" : "my-screenings";
  }
  if (data.role === "doctor" && !DOCTOR_ROUTES.has(route)) {
    route = "dashboard";
  }
  if (data.role === "patient" && !PATIENT_ROUTES.has(route)) {
    route = "my-screenings";
  }

  setActiveNav(route);
  routes[route]();
}

window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", () => {
  navigate();
});

// ---------------------------------------------------------------------------
// Login / signup
// ---------------------------------------------------------------------------
function authShell(innerHtml) {
  viewEl.innerHTML = `
    <div class="auth-shell">
      <div class="auth-hero">
        <svg class="auth-hero-illustration" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="160" cy="160" r="140" stroke="#0F5058" stroke-width="1.5"/>
          <circle class="ring-draw" cx="160" cy="160" r="140" stroke="#5FE3C4" stroke-width="1.5" stroke-dasharray="300" pathLength="300"/>
          <circle class="ring-draw ring-2" cx="160" cy="160" r="98" stroke="#5FE3C4" stroke-width="1.5" opacity="0.7" stroke-dasharray="300" pathLength="300"/>
          <circle class="ring-draw ring-3" cx="160" cy="160" r="58" stroke="#5FE3C4" stroke-width="1.5" opacity="0.5" stroke-dasharray="300" pathLength="300"/>
          <circle cx="160" cy="160" r="22" fill="#5FE3C4" opacity="0.9"/>
          <path class="vessel-draw" d="M160 160 C 130 130, 90 120, 55 95" stroke="#F2B84B" stroke-width="2" stroke-linecap="round" fill="none" pathLength="220" stroke-dasharray="220"/>
          <path class="vessel-draw" d="M160 160 C 195 125, 230 118, 262 88" stroke="#5FE3C4" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6" pathLength="220" stroke-dasharray="220"/>
          <path class="vessel-draw" d="M160 160 C 180 200, 215 220, 250 235" stroke="#5FE3C4" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6" pathLength="220" stroke-dasharray="220"/>
          <path class="vessel-draw" d="M160 160 C 125 195, 100 215, 65 228" stroke="#5FE3C4" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6" pathLength="220" stroke-dasharray="220"/>
        </svg>
        <div class="auth-hero-text">
          <p class="auth-hero-title">Explainable AI-assisted DR screening</p>
          <p class="auth-hero-desc">Helping frontline health workers and doctors catch diabetic retinopathy earlier, closer to home.</p>
        </div>
      </div>
      <div class="auth-form-panel">
        <div class="auth-card">${innerHtml}</div>
      </div>
    </div>`;
}

function renderLogin() {
  authShell(`
    <div class="auth-brand">
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="19" stroke="#028090" stroke-width="2"/>
        <circle cx="20" cy="20" r="11" stroke="#028090" stroke-width="2"/>
        <circle cx="20" cy="20" r="4" fill="#028090"/>
      </svg>
      <span>Retinova</span>
    </div>
    <h1 class="auth-title">Log in</h1>
    <p class="auth-desc">For registered patients and doctors.</p>
    <div id="auth-error"></div>
    <div class="field">
      <label for="li-email">Email</label>
      <input id="li-email" type="email" placeholder="you@example.com" />
    </div>
    <div class="field">
      <label for="li-password">Password</label>
      <input id="li-password" type="password" placeholder="••••••••" />
    </div>
    <button class="btn btn-primary" id="btn-login" style="width:100%">Log in</button>
    <div class="auth-switch">Don't have an account? <a href="#signup">Sign up</a></div>
  `);

  document.getElementById("btn-login").addEventListener("click", async () => {
    const email = document.getElementById("li-email").value.trim();
    const password = document.getElementById("li-password").value;
    const errEl = document.getElementById("auth-error");
    errEl.innerHTML = "";

    if (!email || !password) {
      errEl.innerHTML = `<div class="auth-error">Enter your email and password</div>`;
      return;
    }
    const btn = document.getElementById("btn-login");
    btn.disabled = true;
    btn.textContent = "Logging in…";
    try {
      const result = await api.login({ email, password });
      auth.save(result);
      toast(`Welcome back, ${result.full_name || "there"}`);
      location.hash = result.role === "doctor" ? "#dashboard" : "#my-screenings";
      navigate();
    } catch (e) {
      errEl.innerHTML = `<div class="auth-error">${e.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Log in";
    }
  });
}

function renderSignup() {
  let role = "patient";
  authShell(`<div id="signup-form-inner"></div>`);

  function draw() {
    document.getElementById("signup-form-inner").innerHTML = `
      <div class="auth-brand">
        <svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="19" stroke="#028090" stroke-width="2"/>
          <circle cx="20" cy="20" r="11" stroke="#028090" stroke-width="2"/>
          <circle cx="20" cy="20" r="4" fill="#028090"/>
        </svg>
        <span>Retinova</span>
      </div>
      <h1 class="auth-title">Create an account</h1>
      <p class="auth-desc">Sign up as a patient, or as a doctor with an access code.</p>
      <div id="auth-error"></div>

      <div class="role-toggle">
        <button type="button" id="role-patient" class="${role === "patient" ? "active" : ""}">Patient</button>
        <button type="button" id="role-doctor" class="${role === "doctor" ? "active" : ""}">Doctor</button>
      </div>

      <div class="field">
        <label for="su-name">Full name</label>
        <input id="su-name" type="text" placeholder="e.g. Asha Devi" />
      </div>
      <div class="field">
        <label for="su-email">Email</label>
        <input id="su-email" type="email" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label for="su-password">Password</label>
        <input id="su-password" type="password" placeholder="At least 8 characters" />
      </div>

      ${role === "patient" ? `
      <div class="field-row">
        <div class="field">
          <label for="su-age">Age</label>
          <input id="su-age" type="number" min="0" max="120" placeholder="e.g. 55" />
        </div>
        <div class="field">
          <label for="su-gender">Gender</label>
          <select id="su-gender">
            <option value="">Not specified</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>` : `
      <div class="field">
        <label for="su-doctor-code">Doctor access code</label>
        <input id="su-doctor-code" type="text" placeholder="Provided by your clinic administrator" />
      </div>`}

      <button class="btn btn-primary" id="btn-signup" style="width:100%">Create account</button>
      <div class="auth-switch">Already have an account? <a href="#login">Log in</a></div>
    `;

    document.getElementById("role-patient").addEventListener("click", () => { role = "patient"; draw(); });
    document.getElementById("role-doctor").addEventListener("click", () => { role = "doctor"; draw(); });

    document.getElementById("btn-signup").addEventListener("click", async () => {
      const full_name = document.getElementById("su-name").value.trim();
      const email = document.getElementById("su-email").value.trim();
      const password = document.getElementById("su-password").value;
      const errEl = document.getElementById("auth-error");
      errEl.innerHTML = "";

      if (!full_name || !email || !password) {
        errEl.innerHTML = `<div class="auth-error">Fill in your name, email, and password</div>`;
        return;
      }

      const payload = { full_name, email, password, role };
      if (role === "patient") {
        const age = document.getElementById("su-age").value;
        payload.age = age ? parseInt(age, 10) : null;
        payload.gender = document.getElementById("su-gender").value || null;
      } else {
        payload.doctor_code = document.getElementById("su-doctor-code").value.trim();
      }

      const btn = document.getElementById("btn-signup");
      btn.disabled = true;
      btn.textContent = "Creating account…";
      try {
        const result = await api.register(payload);
        auth.save(result);
        toast(`Welcome, ${result.full_name || "there"}`);
        location.hash = result.role === "doctor" ? "#dashboard" : "#my-screenings";
        navigate();
      } catch (e) {
        errEl.innerHTML = `<div class="auth-error">${e.message}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = "Create account";
      }
    });
  }

  draw();
}

// ---------------------------------------------------------------------------
// Dashboard (doctor)
// ---------------------------------------------------------------------------
async function renderDashboard() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-desc">A snapshot of screening activity across all registered patients.</p>
    </div>
    <div class="stat-grid" id="stat-grid">
      ${statCardSkeleton("Registered patients", "patients")}
      ${statCardSkeleton("Images screened", "images")}
      ${statCardSkeleton("Referable cases", "referral")}
    </div>
    <div class="card">
      <h2 class="card-title">Recent screenings</h2>
      <p class="card-desc">The latest DR classification results, most recent first.</p>
      <div id="recent-table"></div>
    </div>
  `;

  try {
    const [patients, images, predictions] = await Promise.all([
      api.listPatients(),
      api.listAllImages(),
      api.listAllPredictions(),
    ]);

    const referable = predictions.filter((p) => p.referable).length;
    document.getElementById("stat-grid").innerHTML = `
      ${statCard(patients.length, "Registered patients", "patients")}
      ${statCard(images.length, "Images screened", "images")}
      ${statCard(referable, "Referable cases", "referral")}
    `;

    const imageById = Object.fromEntries(images.map((i) => [i.image_id, i]));
    renderPredictionsTable(
      document.getElementById("recent-table"),
      predictions.slice(0, 8),
      imageById,
      "No screenings yet — add a patient and run a screening to see results here."
    );
  } catch (e) {
    document.getElementById("stat-grid").innerHTML = "";
    document.getElementById("recent-table").innerHTML = apiErrorState(e);
  }
}

function statCardSkeleton(label, icon) {
  return `<div class="stat-card"><div class="stat-icon">${ICONS[icon]}</div><div class="stat-value">—</div><div class="stat-label">${label}</div></div>`;
}
function statCard(value, label, icon) {
  return `<div class="stat-card"><div class="stat-icon">${ICONS[icon]}</div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

function renderPredictionsTable(container, predictions, imageById, emptyMessage) {
  if (!predictions.length) {
    container.innerHTML = `<div class="empty-state">${ICONS.emptyTray}<div class="empty-state-title">Nothing here yet</div><div>${emptyMessage}</div></div>`;
    return;
  }
  const rows = predictions.map((p) => {
    const img = imageById[p.image_id];
    const sev = SEVERITY[p.dr_level] || SEVERITY[0];
    return `
      <tr>
        <td>${img ? img.patient_id : "—"}</td>
        <td><span class="sev-dot" style="background:${sev.color}"></span>${sev.label}</td>
        <td>${p.confidence != null ? Math.round(p.confidence * 100) + "%" : "—"}</td>
        <td>${p.referable
          ? '<span class="badge badge-danger">Refer to specialist</span>'
          : '<span class="badge badge-success">Routine follow-up</span>'}</td>
        <td>${formatDate(p.created_at)}</td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table>
      <thead><tr><th>Patient</th><th>Severity</th><th>Confidence</th><th>Outcome</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Add patient (doctor manually registers a walk-in patient without an account)
// ---------------------------------------------------------------------------
function renderAddPatient() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Add patient</h1>
      <p class="page-desc">Manually add a walk-in patient who doesn't have their own login. They'll be identified by the patient ID you choose here.</p>
    </div>
    <div class="card" style="max-width:480px">
      <div class="field">
        <label for="f-id">Patient ID</label>
        <input id="f-id" type="text" placeholder="e.g. P-1042" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="f-age">Age</label>
          <input id="f-age" type="number" min="0" max="120" placeholder="e.g. 55" />
        </div>
        <div class="field">
          <label for="f-gender">Gender</label>
          <select id="f-gender">
            <option value="">Not specified</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" id="btn-register">Add patient</button>
    </div>
  `;

  document.getElementById("btn-register").addEventListener("click", async () => {
    const patient_id = document.getElementById("f-id").value.trim();
    const ageVal = document.getElementById("f-age").value;
    const gender = document.getElementById("f-gender").value || null;

    if (!patient_id) {
      toast("Enter a patient ID before adding", true);
      return;
    }

    const btn = document.getElementById("btn-register");
    btn.disabled = true;
    btn.textContent = "Adding…";

    try {
      await api.createPatient({
        patient_id,
        age: ageVal ? parseInt(ageVal, 10) : null,
        gender,
      });
      toast(`Patient ${patient_id} added`);
      document.getElementById("f-id").value = "";
      document.getElementById("f-age").value = "";
      document.getElementById("f-gender").value = "";
    } catch (e) {
      toast(e.message || "Could not add patient", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Add patient";
    }
  });
}

// ---------------------------------------------------------------------------
// Screen a patient (doctor)
// ---------------------------------------------------------------------------
let selectedFile = null;
let currentImage = null;

async function renderScreen() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Screen a patient</h1>
      <p class="page-desc">Choose a registered patient, upload a fundus image, then run the DR classification.</p>
    </div>

    <div class="card">
      <h2 class="card-title">1. Choose patient</h2>
      <p class="card-desc">Select from registered patients, or add a new one first.</p>
      <select class="select-inline" id="patient-select" style="width:100%"></select>
    </div>

    <div class="card" id="pending-card" style="display:none">
      <h2 class="card-title">Images for this patient</h2>
      <p class="card-desc">Includes anything the patient uploaded themselves and hasn't been classified yet.</p>
      <div id="pending-list"></div>
    </div>

    <div class="card">
      <h2 class="card-title">2. Upload fundus image</h2>
      <p class="card-desc">JPEG or PNG. The image is checked for usable quality before classification.</p>
      <label class="dropzone" id="dropzone">
        <div class="dropzone-title">Click to choose an image, or drag it here</div>
        <div class="dropzone-desc">A clear, centred fundus photo gives the most reliable result</div>
        <input type="file" id="file-input" accept="image/*" />
      </label>
      <div id="preview-area"></div>
      <button class="btn btn-primary" id="btn-upload" style="margin-top:16px" disabled>Upload image</button>
    </div>

    <div class="card" id="predict-card" style="display:none">
      <h2 class="card-title">3. Run DR classification</h2>
      <p class="card-desc">Analyzes the uploaded image and grades diabetic retinopathy severity (0–4).</p>
      <button class="btn btn-primary" id="btn-predict">Run classification</button>
      <div id="result-area" style="margin-top:16px"></div>
    </div>
  `;

  selectedFile = null;
  currentImage = null;

  const patientSelect = document.getElementById("patient-select");
  try {
    const patients = await api.listPatients();
    if (!patients.length) {
      patientSelect.innerHTML = `<option value="">No patients registered yet</option>`;
    } else {
      patientSelect.innerHTML = patients
        .map((p) => `<option value="${p.patient_id}">${p.patient_id}${p.age ? " · age " + p.age : ""}</option>`)
        .join("");
    }
  } catch (e) {
    patientSelect.innerHTML = `<option value="">Could not load patients</option>`;
  }

  async function refreshPendingList() {
    const patientId = patientSelect.value;
    const card = document.getElementById("pending-card");
    const list = document.getElementById("pending-list");
    if (!patientId) { card.style.display = "none"; return; }
    card.style.display = "block";
    list.innerHTML = `<div class="empty-state">Loading…</div>`;
    try {
      const items = await loadImagesWithStatus(patientId);
      renderImageStatusList(list, items, {
        emptyMessage: "No images uploaded for this patient yet.",
        actionLabel: "Run classification",
        onAction: async (imageId, btn) => {
          btn.disabled = true;
          btn.textContent = "Analyzing…";
          try {
            await api.predict(imageId);
            toast("Classification complete");
            refreshPendingList();
          } catch (e) {
            toast(e.message || "Classification failed", true);
            btn.disabled = false;
            btn.textContent = "Run classification";
          }
        },
      });
    } catch (e) {
      list.innerHTML = apiErrorState(e);
    }
  }
  patientSelect.addEventListener("change", refreshPendingList);
  refreshPendingList();

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("btn-upload");

  dropzone.addEventListener("dragover", (ev) => { ev.preventDefault(); dropzone.classList.add("drag"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", (ev) => {
    ev.preventDefault();
    dropzone.classList.remove("drag");
    if (ev.dataTransfer.files.length) handleFile(ev.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    selectedFile = file;
    const url = URL.createObjectURL(file);
    document.getElementById("preview-area").innerHTML = `
      <div class="preview-row">
        <img class="preview-thumb" src="${url}" />
        <div class="preview-meta"><strong>${file.name}</strong><br>${(file.size / 1024).toFixed(0)} KB</div>
      </div>`;
    uploadBtn.disabled = false;
  }

  uploadBtn.addEventListener("click", async () => {
    const patientId = patientSelect.value;
    if (!patientId) { toast("Select a patient first", true); return; }
    if (!selectedFile) { toast("Choose an image to upload", true); return; }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";
    try {
      const img = await api.uploadImage(patientId, selectedFile);
      currentImage = img;
      toast("Image uploaded");
      const qualityGood = img.quality_status === "acceptable";
      document.getElementById("preview-area").insertAdjacentHTML("beforeend", `
        <div style="margin-top:12px">
          ${qualityGood
            ? '<span class="badge badge-success">Image quality: acceptable</span>'
            : '<span class="badge badge-warning">Image quality: needs recapture</span>'}
        </div>`);
      document.getElementById("predict-card").style.display = "block";
      refreshPendingList();
    } catch (e) {
      toast(e.message || "Upload failed", true);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload image";
    }
  });

  document.getElementById("btn-predict").addEventListener("click", async () => {
    if (!currentImage) return;
    const btn = document.getElementById("btn-predict");
    btn.disabled = true;
    btn.textContent = "Analyzing…";
    try {
      const result = await api.predict(currentImage.image_id);
      renderResult(document.getElementById("result-area"), result);
    } catch (e) {
      toast(e.message || "Classification failed", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Run classification";
    }
  });
}

function renderResult(container, result) {
  const sev = SEVERITY[result.dr_level] ?? SEVERITY[0];
  const confidencePct = Math.round((result.confidence ?? 0) * 100);
  container.innerHTML = `
    <div class="result-panel">
      <div class="result-strip" style="background:${sev.color}"></div>
      <div class="result-body">
        <div class="result-top">
          <span class="result-level">${sev.label}</span>
          ${result.referable
            ? '<span class="badge badge-danger">Refer to specialist</span>'
            : '<span class="badge badge-success">Routine follow-up</span>'}
        </div>
        <div class="result-sub">DR severity grade ${result.dr_level} of 4, on the international clinical DR scale</div>

        <div class="meter-label"><span>Model confidence</span><span>${confidencePct}%</span></div>
        <div class="meter-track"><div class="meter-fill" style="width:${confidencePct}%; background:${sev.color}"></div></div>

        <div class="explain-note">
          Grad-CAM lesion overlay and calibrated clinical evidence will appear here once the
          trained classification model is connected to this endpoint. This screening result
          is currently produced by a placeholder response for pipeline testing.
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Records (doctor)
// ---------------------------------------------------------------------------
async function renderRecords() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Records</h1>
      <p class="page-desc">All screenings recorded across patients, most recent first.</p>
    </div>
    <div class="card">
      <div id="records-table"></div>
    </div>
  `;

  try {
    const [images, predictions] = await Promise.all([api.listAllImages(), api.listAllPredictions()]);
    const imageById = Object.fromEntries(images.map((i) => [i.image_id, i]));
    renderPredictionsTable(
      document.getElementById("records-table"),
      predictions,
      imageById,
      "Screenings will show up here once you upload an image and run a classification."
    );
  } catch (e) {
    document.getElementById("records-table").innerHTML = apiErrorState(e);
  }
}

// ---------------------------------------------------------------------------
// My screenings (patient's own view)
// ---------------------------------------------------------------------------
let patientSelectedFile = null;

async function renderMyScreenings() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">My screenings</h1>
      <p class="page-desc">Your profile and diabetic retinopathy screening history.</p>
    </div>
    <div class="card" id="profile-card"></div>

    <div class="card">
      <h2 class="card-title">Upload a new fundus image</h2>
      <p class="card-desc">Bring a photo taken at a screening camp or clinic. A doctor will review it and run the classification.</p>
      <label class="dropzone" id="dropzone">
        <div class="dropzone-title">Click to choose an image, or drag it here</div>
        <div class="dropzone-desc">A clear, centred fundus photo gives the most reliable result</div>
        <input type="file" id="file-input" accept="image/*" />
      </label>
      <div id="preview-area"></div>
      <button class="btn btn-primary" id="btn-upload" style="margin-top:16px" disabled>Upload image</button>
    </div>

    <div class="card">
      <h2 class="card-title">My screening history</h2>
      <div id="my-table"></div>
    </div>
  `;

  patientSelectedFile = null;
  let patientId = null;

  try {
    const summary = await api.mySummary();
    patientId = summary.patient.patient_id;

    document.getElementById("profile-card").innerHTML = `
      <h2 class="card-title">Profile</h2>
      <p class="card-desc" style="margin-bottom:0">
        Patient ID <strong>${summary.patient.patient_id}</strong>
        ${summary.patient.age ? " · Age " + summary.patient.age : ""}
        ${summary.patient.gender ? " · " + summary.patient.gender : ""}
      </p>
    `;

    const predictionByImageId = Object.fromEntries(
      summary.predictions.map((p) => [p.image_id, p])
    );
    const items = summary.images.map((img) => ({
      image: img,
      prediction: predictionByImageId[img.image_id] || null,
    }));
    renderImageStatusList(document.getElementById("my-table"), items, {
      emptyMessage: "Upload a fundus image below to get started.",
    });
  } catch (e) {
    document.getElementById("profile-card").innerHTML = apiErrorState(e);
  }

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("btn-upload");

  dropzone.addEventListener("dragover", (ev) => { ev.preventDefault(); dropzone.classList.add("drag"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", (ev) => {
    ev.preventDefault();
    dropzone.classList.remove("drag");
    if (ev.dataTransfer.files.length) handleFile(ev.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    patientSelectedFile = file;
    const url = URL.createObjectURL(file);
    document.getElementById("preview-area").innerHTML = `
      <div class="preview-row">
        <img class="preview-thumb" src="${url}" />
        <div class="preview-meta"><strong>${file.name}</strong><br>${(file.size / 1024).toFixed(0)} KB</div>
      </div>`;
    uploadBtn.disabled = false;
  }

  uploadBtn.addEventListener("click", async () => {
    if (!patientId) { toast("Could not find your patient profile", true); return; }
    if (!patientSelectedFile) { toast("Choose an image to upload", true); return; }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";
    try {
      await api.uploadImage(patientId, patientSelectedFile);
      toast("Image uploaded — a doctor will review it");
      renderMyScreenings();
    } catch (e) {
      toast(e.message || "Upload failed", true);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload image";
    }
  });
}

// ---------------------------------------------------------------------------
// Chat assistant
// ---------------------------------------------------------------------------
let chatHistory = [];

function renderChat() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Ask Retinova</h1>
      <p class="page-desc">Learn about diabetic retinopathy, your screening results, and general eye care.</p>
    </div>
    <div class="chat-shell">
      <div class="chat-disclaimer">
        This assistant gives general education only — it doesn't diagnose or prescribe
        treatment. For any medication or treatment decision, and always in an emergency
        (sudden vision loss, severe eye pain), contact a doctor directly.
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-row">
        <input id="chat-input" type="text" placeholder="Ask about symptoms, results, or eye care…" />
        <button class="btn btn-primary" id="chat-send">Send</button>
      </div>
    </div>
  `;

  chatHistory = [];
  const messagesEl = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  addBubble("assistant", "Hi — I can help explain diabetic retinopathy, what a screening result means, or general eye-care questions. What's on your mind?");

  function addBubble(role, text, isError = false) {
    const el = document.createElement("div");
    el.className = `chat-bubble ${role}${isError ? " error" : ""}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  async function send() {
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    addBubble("user", message);

    const typingEl = document.createElement("div");
    typingEl.className = "chat-typing";
    typingEl.textContent = "Retinova is typing…";
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    sendBtn.disabled = true;
    try {
      const result = await api.chat(message, chatHistory);
      typingEl.remove();
      addBubble("assistant", result.reply);
      chatHistory.push({ role: "user", content: message });
      chatHistory.push({ role: "assistant", content: result.reply });
    } catch (e) {
      typingEl.remove();
      addBubble("assistant", e.message || "Something went wrong. Please try again.", true);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") send();
  });
}
