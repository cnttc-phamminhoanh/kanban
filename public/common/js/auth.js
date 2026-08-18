const AUTH_TOKEN_KEY = "kanban_token";
const AUTH_USER_KEY = "kanban_user";

const REMEMBER_ME_KEY = "kanban_remember_me";
const REMEMBER_USERNAME_KEY = "kanban_remember_username";
const REMEMBER_PASSWORD_KEY = "kanban_remember_password";

// GET TOKEN
function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// GET USER
function getUser() {
  const value = localStorage.getItem(AUTH_USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// SET AUTH
function setAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

// SET TOKEN
function setToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// SET USER
function setUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

// CLEAR AUTH
function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

// REMEMBER ME
function saveRememberMe(username, password) {
  localStorage.setItem(REMEMBER_ME_KEY, "true");
  localStorage.setItem(REMEMBER_USERNAME_KEY, username);
  localStorage.setItem(REMEMBER_PASSWORD_KEY, password);
}

function getRememberMe() {
  return localStorage.getItem(REMEMBER_ME_KEY) === "true";
}

function getRememberedUsername() {
  return localStorage.getItem(REMEMBER_USERNAME_KEY) || "";
}

function getRememberedPassword() {
  return localStorage.getItem(REMEMBER_PASSWORD_KEY) || "";
}

function clearRememberMe() {
  localStorage.removeItem(REMEMBER_ME_KEY);
  localStorage.removeItem(REMEMBER_USERNAME_KEY);
  localStorage.removeItem(REMEMBER_PASSWORD_KEY);
}

// PARSE JWT
function parseJwt(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// CHECK TOKEN EXPIRED
function isTokenExpired(token) {
  const payload = parseJwt(token);

  if (!payload || !payload.exp) {
    return true;
  }

  return Date.now() >= payload.exp * 1000;
}

// CHECK LOGIN PAGE
function isLoginPage() {
  const path = window.location.pathname;

  return (
    path === "/login" || path === "/login/" || path.endsWith("/login.html")
  );
}

// REDIRECT TO LOGIN
function redirectToLogin() {
  // Đang ở trang login thì không redirect nữa.
  if (isLoginPage()) {
    return;
  }

  const currentPath = window.location.pathname + window.location.search;
  const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
  window.location.href = loginUrl;
}

// LOGOUT
async function logout() {
  try {
    const token = getToken();

    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error("Logout API error:", error);
  } finally {
    clearAuth();
    redirectToLogin();
  }
}

// CHECK LOGIN
function requireLogin() {
  const token = getToken();

  if (!token) {
    redirectToLogin();
    return false;
  }

  if (isTokenExpired(token)) {
    clearAuth();
    redirectToLogin();
    return false;
  }

  return true;
}

// AUTO LOGOUT WHEN TOKEN EXPIRES
function startTokenWatcher() {
  const token = getToken();

  if (!token) {
    return;
  }

  const payload = parseJwt(token);

  if (!payload || !payload.exp) {
    clearAuth();
    redirectToLogin();
    return;
  }

  const expiresIn = payload.exp * 1000 - Date.now();

  if (expiresIn <= 0) {
    clearAuth();
    redirectToLogin();
    return;
  }

  setTimeout(() => {
    clearAuth();
    redirectToLogin();
  }, expiresIn);
}

// AUTH FETCH
async function authFetch(url, options = {}) {
  const token = getToken();

  if (!token) {
    clearAuth();
    redirectToLogin();
    throw new Error("Authentication required");
  }

  // Token hết hạn phía client
  if (isTokenExpired(token)) {
    clearAuth();
    redirectToLogin();
    throw new Error("Session expired");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  // Nếu gửi body JSON
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Backend trả 401
  if (response.status === 401) {
    clearAuth();
    redirectToLogin();
    throw new Error("Session expired");
  }

  // Không có quyền
  if (response.status === 403) {
    throw new Error("You do not have permission");
  }

  return response;
}

// INITIALIZE
// Nếu KHÔNG phải login page thì bắt buộc phải login.
if (!isLoginPage()) {
  requireLogin();
  startTokenWatcher();
}

// EXPORT
window.KanbanAuth = {
  // Authentication
  getToken,
  getUser,
  setAuth,
  setToken,
  setUser,
  clearAuth,

  // Remember Me
  saveRememberMe,
  getRememberMe,
  getRememberedUsername,
  getRememberedPassword,
  clearRememberMe,

  // JWT
  parseJwt,
  isTokenExpired,
  isLoginPage,

  // Login / Logout
  redirectToLogin,
  logout,
  requireLogin,
  startTokenWatcher,

  // API
  authFetch,

  // CHECK AUTH WITH BACKEND
  async checkAuth() {
    const token = getToken();

    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      clearAuth();

      return false;
    }

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        clearAuth();
        return false;
      }

      const data = await response.json();

      if (!data.success) {
        clearAuth();
        return false;
      }

      // Backend có thể trả user mới nhất
      if (data.user) {
        setUser(data.user);
      }

      return true;
    } catch (error) {
      console.error("Check authentication error:", error);
      return false;
    }
  },
};
