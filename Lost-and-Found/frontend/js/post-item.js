import { createItem, isAuthenticated } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }

  const postForm = document.getElementById("post-form");

  if (postForm) {
    postForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const isLostForm = window.location.pathname.includes("lost");
      const type = isLostForm ? "lost" : "found";

      const itemData = {
        name: document.getElementById("name").value,
        category: document.getElementById("category").value,
        description: document.getElementById("description").value,
        location: document.getElementById("location").value,
        type,
      };

      if (isLostForm) {
        itemData.date = document.getElementById("date-lost").value;
        itemData.time = document.getElementById("time-lost").value;
      } else {
        itemData.date = document.getElementById("date-found").value;
        itemData.time = document.getElementById("time-found").value;
      }

      const imageInput = document.getElementById("image");
      if (imageInput.files.length > 0) {
        itemData.image = imageInput.files[0];
      }

      try {
        await createItem(itemData);
        alert(
          `Item ${type === "lost" ? "lost" : "found"} successfully posted!`
        );
        window.location.href = type === "lost" ? "/lost.html" : "/items.html";
      } catch (error) {
        alert(error.message || "Error posting item. Please try again.");
      }
    });
  }
});
