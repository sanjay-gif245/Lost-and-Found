import { register } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("signup-form");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        password: document.getElementById("password").value,
      };

      try {
        await register(userData);
        alert("Registration successful! Please log in.");
        window.location.href = "/login.html";
      } catch (error) {
        alert(error.message || "Registration failed. Please try again.");
      }
    });
  }
});
