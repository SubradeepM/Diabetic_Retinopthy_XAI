const SEVERITY = {
  0: { label: "No DR",            color: "var(--sev-0)", badge: "badge-success" },
  1: { label: "Mild DR",          color: "var(--sev-1)", badge: "badge-success" },
  2: { label: "Moderate DR",      color: "var(--sev-2)", badge: "badge-warning" },
  3: { label: "Severe DR",        color: "var(--sev-3)", badge: "badge-warning" },
  4: { label: "Proliferative DR", color: "var(--sev-4)", badge: "badge-danger"  },
};

const viewEl = document.getElementById("view");

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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const routes = {
  dashboard: renderDashboard,
  register: renderRegister,
  screen: renderScreen,
  records: renderRecords,
};

function setActiveNav(route) {
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

function navigate() {
  const hash = (location.hash || "#dashboard").replace("#", "");
  const route = routes[hash] ? hash : "dashboard";
  setActiveNav(route);
  routes[route]();
}

window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", () => {
  navigate();
  pollHealth();
  setInterval(pollHealth, 15000);
});

async function pollHealth() {
  const dot = document.getElementById("api-dot");
  const text = document.getElementById("api-status-text");
  try {
    await api.health();
    dot.className = "dot online";
    text.textContent = "API connected";
  } catch (e) {
    dot.className = "dot offline";
    text.textContent = "API unreachable";
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
async function renderDashboard() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-desc">A snapshot of screening activity across all registered patients.</p>
    </div>
    <div class="stat-grid" id="stat-grid">
      ${statCardSkeleton("Registered patients")}
      ${statCardSkeleton("Images screened")}
      ${statCardSkeleton("Referable cases")}
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
      ${statCard(patients.length, "Registered patients")}
      ${statCard(images.length, "Images screened")}
      ${statCard(referable, "Referable cases")}
    `;

    const imageById = Object.fromEntries(images.map((i) => [i.image_id, i]));
    renderPredictionsTable(
      document.getElementById("recent-table"),
      predictions.slice(0, 8),
      imageById,
      "No screenings yet — register a patient and run a screening to see results here."
    );
  } catch (e) {
    document.getElementById("stat-grid").innerHTML = "";
    document.getElementById("recent-table").innerHTML = apiErrorState(e);
  }
}

function statCardSkeleton(label) {
  return `<div class="stat-card"><div class="stat-value">—</div><div class="stat-label">${label}</div></div>`;
}
function statCard(value, label) {
  return `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

function apiErrorState(e) {
  return `<div class="empty-state">
    <div class="empty-state-title">Can't reach the API</div>
    <div>${e.message || "Make sure the backend is running at " + API_BASE}</div>
  </div>`;
}

function renderPredictionsTable(container, predictions, imageById, emptyMessage) {
  if (!predictions.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Nothing here yet</div><div>${emptyMessage}</div></div>`;
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
// Register patient
// ---------------------------------------------------------------------------
function renderRegister() {
  viewEl.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Register patient</h1>
      <p class="page-desc">Add a patient record before uploading fundus images for screening.</p>
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
      <button class="btn btn-primary" id="btn-register">Register patient</button>
    </div>
  `;

  document.getElementById("btn-register").addEventListener("click", async () => {
    const patient_id = document.getElementById("f-id").value.trim();
    const ageVal = document.getElementById("f-age").value;
    const gender = document.getElementById("f-gender").value || null;

    if (!patient_id) {
      toast("Enter a patient ID before registering", true);
      return;
    }

    const btn = document.getElementById("btn-register");
    btn.disabled = true;
    btn.textContent = "Registering…";

    try {
      await api.createPatient({
        patient_id,
        age: ageVal ? parseInt(ageVal, 10) : null,
        gender,
      });
      toast(`Patient ${patient_id} registered`);
      document.getElementById("f-id").value = "";
      document.getElementById("f-age").value = "";
      document.getElementById("f-gender").value = "";
    } catch (e) {
      toast(e.message || "Could not register patient", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Register patient";
    }
  });
}

// ---------------------------------------------------------------------------
// Screen a patient
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
      <p class="card-desc">Select from registered patients, or register a new one first.</p>
      <select class="select-inline" id="patient-select" style="width:100%"></select>
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
// Records
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
