document.addEventListener("DOMContentLoaded", () => {
  // Không tạo trùng button
  if (document.getElementById("managementBtn")) {
    return;
  }

  const managementButton = document.createElement("button");

  managementButton.id = "managementBtn";
  managementButton.type = "button";
  managementButton.className = "floating-management";

  managementButton.setAttribute("aria-label", "Management");
  // managementButton.setAttribute("title", "Management");

  managementButton.innerHTML = `
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="4" y1="6" x2="20" y2="6"></line>
    <circle cx="9" cy="6" r="2"></circle>

    <line x1="4" y1="12" x2="20" y2="12"></line>
    <circle cx="15" cy="12" r="2"></circle>

    <line x1="4" y1="18" x2="20" y2="18"></line>
    <circle cx="11" cy="18" r="2"></circle>
  </svg>
`;

  document.body.appendChild(managementButton);

  managementButton.addEventListener("click", () => {
    window.location.href = "/login/pms/monitor/flowPlan";
  });
});
