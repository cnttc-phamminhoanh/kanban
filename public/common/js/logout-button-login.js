document.addEventListener("DOMContentLoaded", () => {
  // Không tạo trùng nút
  if (document.getElementById("logoutBtn")) {
    return;
  }

  const logoutButton = document.createElement("button");

  logoutButton.id = "logoutBtn";
  logoutButton.type = "button";
  logoutButton.className = "floating-logout";

  logoutButton.setAttribute("aria-label", "Logout");
  // logoutButton.setAttribute("title", "Logout");

  logoutButton.innerHTML = `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  `;

  document.body.appendChild(logoutButton);

  logoutButton.addEventListener("click", async () => {
    if (logoutButton.disabled) {
      return;
    }

    logoutButton.disabled = true;

    try {
      await KanbanAuth.logout();
    } catch (error) {
      console.error("Logout failed:", error);

      logoutButton.disabled = false;
    }
  });
});
