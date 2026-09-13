const AUTH_KEY = "retinova_auth";

const auth = {
  save(data) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  },
  get() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch (e) {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(AUTH_KEY);
  },
  isLoggedIn() {
    return !!this.get()?.access_token;
  },
  isDoctor() {
    return this.get()?.role === "doctor";
  },
  isPatient() {
    return this.get()?.role === "patient";
  },
};
