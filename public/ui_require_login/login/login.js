const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");

// LOAD REMEMBERED LOGIN
document.addEventListener("DOMContentLoaded", async () => {
  // Nếu đã có token kiểm tra token với backend.
  const token = KanbanAuth.getToken();

  if (token) {
    const valid = await KanbanAuth.checkAuth();

    if (valid) {
      redirectAfterLogin();

      return;
    }
  }

  // Nếu chưa login hoặc token hết hạn, load Remember Me.
  loadRememberedLogin();
});

// LOAD REMEMBERED USERNAME / PASSWORD
function loadRememberedLogin() {
  const remember = KanbanAuth.getRememberMe();

  if (!remember) {
    rememberMe.checked = false;

    return;
  }

  const username = KanbanAuth.getRememberedUsername();

  const password = KanbanAuth.getRememberedPassword();

  if (username) {
    usernameInput.value = username;
  }

  if (password) {
    passwordInput.value = password;
  }

  rememberMe.checked = true;
}

// SHOW / HIDE PASSWORD
togglePassword.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";

    togglePassword.textContent = "Hide";
  } else {
    passwordInput.type = "password";

    togglePassword.textContent = "Show";
  }
});

// LOGIN
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  // VALIDATE
  if (!username || !password) {
    showError("Please enter username and password.");

    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    // LOGIN FAILED
    if (!response.ok) {
      showError(data.message || "Login failed.");

      return;
    }

    // INVALID RESPONSE
    if (!data.success || !data.token) {
      showError("Invalid server response.");

      return;
    }

    // SAVE JWT
    KanbanAuth.setToken(data.token);

    // SAVE USER
    if (data.user) {
      KanbanAuth.setUser(data.user);
    }

    // REMEMBER ME
    if (rememberMe.checked) {
      // User đã tick Remember me. -> Lưu username/password để lần sau tự điền.
      KanbanAuth.saveRememberMe(username, password);
    } else {
      // User không tick -> Xóa credential đã nhớ trước đó.
      KanbanAuth.clearRememberMe();
    }

    // REDIRECT
    redirectAfterLogin();
  } catch (error) {
    console.error("Login error:", error);

    showError("Cannot connect to server.");
  } finally {
    loginButton.disabled = false;

    loginButton.textContent = "Sign In";
  }
});

// REDIRECT AFTER LOGIN
function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);

  const redirect = params.get("redirect");

  // Nếu backend/client đưa user tới một URL cụ thể trước đó.
  if (redirect && redirect.startsWith("/")) {
    window.location.href = redirect;

    return;
  }

  // Không có redirect. Trang mặc định:  /login/pms/monitor
  window.location.href = "/login/pms/monitor";
}

// ERROR
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function hideError() {
  errorMessage.textContent = "";
  errorMessage.style.display = "none";
}
