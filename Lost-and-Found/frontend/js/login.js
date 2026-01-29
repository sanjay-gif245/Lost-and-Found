import { login } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const data = await login(email, password);
        alert("Login successful!");
        window.location.href = "/home.html";
      } catch (error) {
        alert(error.message || "Login failed. Please try again.");
      }
    });
  }
});
