async function fetchAPI_claim(url, options = {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn(
      "No token found during API call from claim.js. Redirecting to login."
    );
    window.location.href = "/login.html";
    throw new Error("User not authenticated.");
  }
  const defaultHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  options.headers = { ...defaultHeaders, ...options.headers };
  if (options.body instanceof FormData) delete options.headers["Content-Type"];

  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
    let errorData = null;
    try {
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
        errorMsg = errorData?.message || errorMsg;
      } else {
        const text = await response.text();
        if (!text.toLowerCase().includes("<!doctype html>"))
          errorMsg = `Server error: ${text.substring(0, 200)}`;
      }
    } catch (e) {
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (contentType?.includes("application/json")) {
    const data = await response.json();
    return data;
  } else if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return { success: true };
  } else {
    return await response.text();
  }
}

async function getVerificationQuestions(itemId) {
  console.log(`Workspaceing questions for itemId: ${itemId}`);
  try {
    const data = await fetchAPI_claim(
      `http://localhost:5000/api/claims/items/${itemId}/questions`
    );

    if (data && data.success) {
      console.log("Successfully fetched questions:", data.questions);
      return data.questions || [];
    } else {
      console.warn(
        `Backend reported issues fetching questions: ${
          data?.message || "Unknown reason"
        }`
      );
      return [];
    }
  } catch (error) {
    console.error("Error caught in getVerificationQuestions:", error);
    throw new Error(`Could not load verification questions: ${error.message}`);
  }
}

async function submitClaim(itemId, responses) {
  console.log(`Submitting claim for itemId: ${itemId}`);
  try {
    const data = await fetchAPI_claim(
      `http://localhost:5000/api/claims/items/${itemId}/claim`,
      {
        method: "POST",
        body: JSON.stringify({ responses }),
      }
    );

    return {
      success: true,
      message: data.message || "Claim submitted successfully.",
    };
  } catch (error) {
    console.error("Error caught in submitClaim:", error);
    return {
      success: false,
      message:
        error.message || "Failed to submit claim due to an unknown error.",
    };
  }
}

function showClaimModal(itemId, itemName) {
  const existingModal = document.querySelector(".claim-modal");
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  const modal = document.createElement("div");
  modal.className = "claim-modal";
  modal.style.display = "flex";
  modal.innerHTML = `
  <div class="claim-modal-content">
    <span class="close" style="position:absolute; top:10px; right:15px; font-size:24px; cursor:pointer;">&times;</span>
    <h2>Claim: ${itemName}</h2>
    <p>To help verify ownership, please answer the following question(s):</p>
    <div id="questions-container" style="margin-top: 15px; margin-bottom: 15px;"><p class="loading-text">Loading questions...</p></div>
    <div style="text-align: right;"> <button id="submit-claim-btn" class="view-btn" style="background-color: #28a745;" disabled>Submit Claim</button> </div>
  </div>
`;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector(".close");
  const questionsContainer = modal.querySelector("#questions-container");
  const submitBtn = modal.querySelector("#submit-claim-btn");

  closeBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      document.body.removeChild(modal);
    }
  });

  getVerificationQuestions(itemId)
    .then((questions) => {
      if (!questionsContainer) return;

      if (!questions || questions.length === 0) {
        questionsContainer.innerHTML =
          "<p style='color: #777;'>No verification questions available for this item. You can proceed with the claim if you wish, but the owner may require further verification.</p>";
        if (submitBtn) submitBtn.disabled = false;
      } else {
        questionsContainer.innerHTML = "";
        questions.forEach((q, index) => {
          const questionDiv = document.createElement("div");
          questionDiv.className = "question";
          questionDiv.style.marginBottom = "10px";
          questionDiv.innerHTML = `
          <label for="answer-${
            q.id || index
          }" style="display:block; margin-bottom:3px; font-weight:bold;">${
            index + 1
          }. ${q.question}</label>
          <input type="text" id="answer-${
            q.id || index
          }" class="answer-input" style="width: 95%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" data-question-id="${
            q.id
          }" required>
        `;
          questionsContainer.appendChild(questionDiv);
        });
        if (submitBtn) submitBtn.disabled = false;
      }

      if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
          const answers = Array.from(
            modal.querySelectorAll(".answer-input")
          ).map((input) => ({
            questionId: input.dataset.questionId,
            response: input.value.trim(),
          }));

          if (questions && questions.length > 0) {
            const emptyAnswers = answers.some((a) => !a.response);
            if (emptyAnswers) {
              alert("Please answer all verification questions.");
              return;
            }
          }

          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting...";
          submitBtn.style.backgroundColor = "#ccc";

          const result = await submitClaim(itemId, answers);

          if (result.success) {
            alert(result.message || "Claim submitted successfully!");
            document.body.removeChild(modal);
          } else {
            alert(result.message || "Failed to submit claim.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Claim";
            submitBtn.style.backgroundColor = "#28a745";
          }
        });
      }
    })
    .catch((error) => {
      console.error("Failed to load questions for modal:", error);
      if (questionsContainer) {
        questionsContainer.innerHTML = `<p class="error-message">Error loading questions: ${error.message}. Cannot proceed with claim.</p>`;
      }
      if (submitBtn) submitBtn.disabled = true;
    });
}

function startClaimProcess(itemId, itemName) {
  if (document.querySelector(".claim-modal")) {
    console.warn("Claim modal already open.");
    return;
  }
  showClaimModal(itemId, itemName);
}
