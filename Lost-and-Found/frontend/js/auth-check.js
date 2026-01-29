import { isAuthenticated, logout, getUser } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const protectedPages = ["/post.html", "/post_lost.html"];

  const currentPath = window.location.pathname;
  const isProtected = protectedPages.some((page) => currentPath.includes(page));

  if (isProtected && !isAuthenticated()) {
    window.location.href = "/login.html";
  }

  const logoutButton = document.querySelector(".sub-menu-link:last-child");
  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
      window.location.href = "/login.html";
    });
  }

  const user = getUser();
  if (user) {
    const userNameElement = document.querySelector(".user-info h3");
    if (userNameElement) {
      userNameElement.textContent = user.name;
    }
  }
});
