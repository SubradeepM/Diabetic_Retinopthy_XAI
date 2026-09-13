const API_BASE = window.RETINOVA_API_BASE || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const authData = auth.get();
  const headers = options.headers || {};
  if (authData?.access_token) {
    headers["Authorization"] = `Bearer ${authData.access_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    auth.clear();
    location.hash = "#login";
    throw new Error("Session expired — please log in again");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  health: () => request("/health"),

  register: (data) =>
    request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  login: (data) =>
    request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  me: () => request("/auth/me"),
  mySummary: () => request("/me/summary"),

  listPatients: () => request("/patients"),
  createPatient: (data) =>
    request("/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  listAllImages: () => request("/images"),
  listPatientImages: (patientId) => request(`/patients/${patientId}/images`),
  uploadImage: (patientId, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/patients/${patientId}/images`, {
      method: "POST",
      body: form,
    });
  },

  predict: (imageId) => request(`/images/${imageId}/predict`, { method: "POST" }),
  listAllPredictions: () => request("/predictions"),

  imageUrl: (filename) => `${API_BASE}/uploads/${filename}`,
};
