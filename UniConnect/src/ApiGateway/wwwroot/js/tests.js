// System Tests Runner Script for UniConnect

let eventSource = null;
let timerInterval = null;
let startTime = null;
let currentStep = 0;
let testFailed = false;

document.addEventListener("DOMContentLoaded", () => {
  // Find current user if any, and check role. Redirect if not admin.
  API.me()
    .then(data => {
      const user = data.user;
      if (!user || user.role !== 'admin') {
        window.location.href = '/profile.html';
      } else {
        Sidebar.render(user, 'tests');
      }
    })
    .catch(() => {
      window.location.href = '/login.html';
    });

  // Attach event listeners programmatically (separation of concerns)
  const runBtn = document.getElementById("run-btn");
  if (runBtn) {
    runBtn.addEventListener("click", runTests);
  }

  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearTerminal);
  }
});

function runTests() {
  // Prevent double running
  if (eventSource) return;

  // Reset states
  clearTerminal();
  resetTimeline();
  testFailed = false;
  currentStep = 0;

  // Update Controls
  const runBtn = document.getElementById("run-btn");
  const runIcon = document.getElementById("run-icon");
  const runText = document.getElementById("run-text");
  const statusBadge = document.getElementById("status-badge");

  if (runBtn) {
    runBtn.disabled = true;
    runBtn.style.opacity = "0.7";
  }
  if (runIcon) runIcon.innerHTML = "⏳";
  if (runText) runText.textContent = "Running Tests...";
  
  if (statusBadge) {
    statusBadge.className = "badge badge-blue";
    statusBadge.textContent = "Running";
  }

  // Start Timer
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) timerDisplay.textContent = `${elapsed}s`;
  }, 100);

  // Open SSE Connection
  eventSource = new EventSource("/api/run-tests");

  eventSource.onmessage = (event) => {
    const line = event.data;
    
    // Handle Exit Event
    if (line.startsWith("[EXIT]")) {
      const code = line.split(" ")[1];
      finalizeRun(code === "0");
      return;
    }

    // Print Line to Terminal
    appendTerminalLine(line);

    // Process Progress Stages
    parseProgress(line);
  };

  eventSource.onerror = (error) => {
    appendTerminalLine("ERROR: Connection to test runner lost.");
    finalizeRun(false);
  };
}

function parseProgress(line) {
  if (line.includes("[1/5]")) {
    updateStep(1);
  } else if (line.includes("[2/5]")) {
    updateStep(2);
  } else if (line.includes("[3/5]")) {
    updateStep(3);
  } else if (line.includes("[4/5]")) {
    updateStep(4);
  } else if (line.includes("[5/5]")) {
    updateStep(5);
  }

  if (line.includes("INTEGRATION TEST FAILED") || line.includes("Exception:") || line.includes("Error:")) {
    testFailed = true;
    if (currentStep > 0) {
      const stepEl = document.getElementById(`step-${currentStep}`);
      if (stepEl) {
        stepEl.className = "timeline-step failed";
      }
    }
  }
}

function updateStep(stepNum) {
  // Mark previous steps as completed
  for (let i = 1; i < stepNum; i++) {
    const prevEl = document.getElementById(`step-${i}`);
    if (prevEl && !prevEl.classList.contains("failed")) {
      prevEl.className = "timeline-step completed";
    }
  }

  // Mark current step as active
  currentStep = stepNum;
  const currentEl = document.getElementById(`step-${stepNum}`);
  if (currentEl) {
    currentEl.className = "timeline-step active";
  }
}

function finalizeRun(processSuccess) {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Update Controls
  const runBtn = document.getElementById("run-btn");
  const runIcon = document.getElementById("run-icon");
  const runText = document.getElementById("run-text");
  const statusBadge = document.getElementById("status-badge");

  if (runBtn) {
    runBtn.disabled = false;
    runBtn.style.opacity = "1";
  }
  if (runIcon) runIcon.innerHTML = "▶";
  if (runText) runText.textContent = "Run Integration Tests";

  const overallSuccess = processSuccess && !testFailed;

  if (overallSuccess) {
    if (statusBadge) {
      statusBadge.className = "badge badge-green";
      statusBadge.textContent = "All Passed";
    }
    
    // Ensure all steps marked completed
    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (stepEl) stepEl.className = "timeline-step completed";
    }
    appendTerminalLine("\n>>> ALL TESTS COMPLETED SUCCESSFULLY! <<<", "term-success term-bold");
  } else {
    if (statusBadge) {
      statusBadge.className = "badge badge-red";
      statusBadge.textContent = "Failed";
    }
    
    if (currentStep > 0) {
      const stepEl = document.getElementById(`step-${currentStep}`);
      if (stepEl) stepEl.className = "timeline-step failed";
    }
    appendTerminalLine("\n>>> TEST SUITE FAILURE ENCOUNTERED <<<", "term-error term-bold");
  }
}

function appendTerminalLine(text, customClass = "") {
  const term = document.getElementById("terminal");
  if (!term) return;

  const lineEl = document.createElement("div");
  let finalClass = customClass || "term-line";

  // Detect highlight formatting
  if (!customClass) {
    if (text.startsWith("ERROR") || text.includes("Exception:") || text.includes("INTEGRATION TEST FAILED")) {
      finalClass += " term-error";
    } else if (text.startsWith("->") || text.includes("successful") || text.includes("successfully") || text.includes("PASSED")) {
      finalClass += " term-success";
    } else if (text.includes("Connecting to") || text.includes("Rolling back") || text.includes("connection successful")) {
      finalClass += " term-info";
    } else if (text.startsWith("===") || text.includes("UniConnect Integration Test Runner")) {
      finalClass += " term-bold";
    } else if (text.match(/\[\d\/5\]/)) {
      finalClass += " term-phase";
    }
  }

  lineEl.className = finalClass;
  lineEl.textContent = text;
  term.appendChild(lineEl);
  
  // Auto scroll
  term.scrollTop = term.scrollHeight;
}

function clearTerminal() {
  const term = document.getElementById("terminal");
  if (term) {
    term.innerHTML = '<div class="term-line term-bold">Terminal cleared. Click Run above to execute tests.</div>';
  }
}

function resetTimeline() {
  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById(`step-${i}`);
    if (stepEl) {
      stepEl.className = "timeline-step";
    }
  }
}
