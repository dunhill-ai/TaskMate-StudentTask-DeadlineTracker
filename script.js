
document.addEventListener("DOMContentLoaded", () => {
  const TASKS_KEY = "taskmateTasks";
  const NAME_KEY = "taskmateStudentName";
  const $ = id => document.getElementById(id);
  const page = document.body.dataset.page;

  let tasks = [];
  try {
    const saved = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
    tasks = Array.isArray(saved) ? saved : [];
  } catch {
    tasks = [];
  }

  let studentName = localStorage.getItem(NAME_KEY) || "Student";

  function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function displayName() {
    document.querySelectorAll(".student-name").forEach(el => {
      el.textContent = studentName;
    });
    document.querySelectorAll(".avatar").forEach(el => {
      el.textContent = studentName.charAt(0).toUpperCase();
    });
  }

  displayName();

  if ($("editName")) {
    $("editName").addEventListener("click", () => {
      const newName = prompt("Enter your name:", studentName);
      if (newName && newName.trim()) {
        studentName = newName.trim();
        localStorage.setItem(NAME_KEY, studentName);
        displayName();
      }
    });
  }

  function todayString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "No date";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  }

  function isOverdue(task) {
    return !task.completed && task.date < todayString();
  }

  function statusOf(task) {
    if (task.completed) return "Completed";
    if (isOverdue(task)) return "Overdue";
    return "Pending";
  }

  function priorityBadge(priority) {
    const value = ["High", "Medium", "Low"].includes(priority) ? priority : "Medium";
    return `<span class="badge priority-${value.toLowerCase()}">${value}</span>`;
  }

  function statusBadge(task) {
    const status = statusOf(task);
    return `<span class="badge status-${status.toLowerCase()}">${status}</span>`;
  }

  function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.filter(task => !task.completed && !isOverdue(task)).length;
    const overdue = tasks.filter(isOverdue).length;
    const rate = total ? Math.round(completed / total * 100) : 0;

    if ($("totalTasks")) $("totalTasks").textContent = total;
    if ($("pendingTasks")) $("pendingTasks").textContent = pending;
    if ($("completedTasks")) $("completedTasks").textContent = completed;
    if ($("overdueTasks")) $("overdueTasks").textContent = overdue;
    if ($("progressPercent")) $("progressPercent").textContent = rate + "%";
    if ($("progressRing")) $("progressRing").style.setProperty("--progress", rate + "%");
    if ($("progressCaption")) {
      $("progressCaption").textContent = total
        ? `${completed} out of ${total} tasks completed. Keep going!`
        : "Start adding tasks to track your progress.";
    }

    if ($("dashboardTasks")) {
      const recent = [...tasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
      $("dashboardTasks").innerHTML = recent.length ? recent.map(task => `
        <tr>
          <td><strong>${escapeHTML(task.name)}</strong></td>
          <td>${escapeHTML(task.subject)}</td>
          <td>${formatDate(task.date)}</td>
          <td>${priorityBadge(task.priority)}</td>
          <td>${statusBadge(task)}</td>
        </tr>
      `).join("") : `<tr><td colspan="5" class="empty">No tasks yet. Add your first task!</td></tr>`;
    }
  }

  function resetForm() {
    if (!$("taskForm")) return;
    $("taskForm").reset();
    $("taskId").value = "";
    $("formTitle").textContent = "＋ Add New Task";
    $("submitTask").textContent = "＋ Add Task";
    $("cancelEdit").classList.add("hidden");
  }

  function renderTasks() {
    const table = $("taskTable");
    if (!table) return;

    const search = $("taskSearch").value.toLowerCase().trim();
    const filter = $("taskFilter").value;

    const filtered = [...tasks].filter(task => {
      const matchesSearch =
        task.name.toLowerCase().includes(search) ||
        task.subject.toLowerCase().includes(search);
      const status = statusOf(task);
      const matchesFilter = filter === "All" || status === filter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.date.localeCompare(b.date));

    $("taskCount").textContent = `${filtered.length} task${filtered.length === 1 ? "" : "s"}`;

    table.innerHTML = filtered.length ? filtered.map(task => `
      <tr>
        <td><strong>${escapeHTML(task.name)}</strong></td>
        <td>${escapeHTML(task.subject)}</td>
        <td>${formatDate(task.date)}</td>
        <td>${priorityBadge(task.priority)}</td>
        <td>${statusBadge(task)}</td>
        <td>
          <div class="action-buttons">
            ${!task.completed ? `<button class="action-btn complete-btn" data-action="complete" data-id="${task.id}" title="Mark completed">✓</button>` : `<button class="action-btn undo-btn" data-action="undo" data-id="${task.id}" title="Mark pending">↶</button>`}
            <button class="action-btn edit-btn" data-action="edit" data-id="${task.id}" title="Edit task">✎</button>
            <button class="action-btn delete-btn" data-action="delete" data-id="${task.id}" title="Delete task">×</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">No tasks found. Try another search or add a new task.</td></tr>`;
  }

  if ($("taskForm")) {
    $("taskForm").addEventListener("submit", event => {
      event.preventDefault();

      const id = $("taskId").value;
      const name = $("taskName").value.trim();
      const subject = $("taskSubject").value.trim();
      const date = $("taskDate").value;
      const priority = $("taskPriority").value;

      if (!name || !subject || !date) {
        alert("Please complete all task details.");
        return;
      }

      if (id) {
        const task = tasks.find(item => String(item.id) === id);
        if (task) {
          task.name = name;
          task.subject = subject;
          task.date = date;
          task.priority = priority;
        }
      } else {
        tasks.push({
          id: Date.now().toString(),
          name,
          subject,
          date,
          priority,
          completed: false,
          createdAt: Date.now()
        });
      }

      saveTasks();
      resetForm();
      renderTasks();
      updateDashboard();
      alert(id ? "Task updated successfully!" : "Task added successfully!");
    });

    $("cancelEdit").addEventListener("click", resetForm);
    $("taskSearch").addEventListener("input", renderTasks);
    $("taskFilter").addEventListener("change", renderTasks);
  }

  if ($("taskTable")) {
    $("taskTable").addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;
      const action = button.dataset.action;
      const task = tasks.find(item => String(item.id) === id);
      if (!task) return;

      if (action === "complete") {
        task.completed = true;
        saveTasks();
        renderTasks();
        updateDashboard();
      }

      if (action === "undo") {
        task.completed = false;
        saveTasks();
        renderTasks();
        updateDashboard();
      }

      if (action === "edit") {
        $("taskId").value = task.id;
        $("taskName").value = task.name;
        $("taskSubject").value = task.subject;
        $("taskDate").value = task.date;
        $("taskPriority").value = task.priority;
        $("formTitle").textContent = "✎ Edit Task";
        $("submitTask").textContent = "Save Changes";
        $("cancelEdit").classList.remove("hidden");
        $("taskName").focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (action === "delete") {
        if (confirm(`Are you sure you want to delete "${task.name}"?`)) {
          tasks = tasks.filter(item => String(item.id) !== id);
          saveTasks();
          renderTasks();
          updateDashboard();
        }
      }
    });
  }

  function renderDeadlines() {
    if (!$("deadlineList")) return;

    const pending = tasks.filter(task => !task.completed)
      .sort((a, b) => a.date.localeCompare(b.date));

    const upcoming = pending.filter(task => task.date > todayString()).length;
    const dueToday = pending.filter(task => task.date === todayString()).length;
    const overdue = pending.filter(isOverdue).length;

    $("upcomingCount").textContent = upcoming;
    $("todayCount").textContent = dueToday;
    $("deadlineOverdue").textContent = overdue;

    $("deadlineList").innerHTML = pending.length ? pending.map(task => {
      const status = statusOf(task);
      return `
        <article class="deadline-item">
          <div class="deadline-date"><strong>${new Date(task.date + "T00:00:00").getDate()}</strong><small>${new Date(task.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}</small></div>
          <div class="deadline-info"><h3>${escapeHTML(task.name)}</h3><p>${escapeHTML(task.subject)} · ${formatDate(task.date)}</p></div>
          <div class="deadline-meta">${priorityBadge(task.priority)}${statusBadge(task)}</div>
        </article>
      `;
    }).join("") : `<p class="empty">No pending deadlines. You're all caught up!</p>`;
  }

  function renderCompleted() {
    if (!$("completedTable")) return;

    const completed = tasks.filter(task => task.completed)
      .sort((a, b) => b.createdAt - a.createdAt);
    const rate = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;

    $("completedTotal").textContent = completed.length;
    $("allTotal").textContent = tasks.length;
    $("completedRate").textContent = rate + "%";

    $("completedTable").innerHTML = completed.length ? completed.map(task => `
      <tr>
        <td><strong>${escapeHTML(task.name)}</strong></td>
        <td>${escapeHTML(task.subject)}</td>
        <td>${formatDate(task.date)}</td>
        <td>${priorityBadge(task.priority)}</td>
        <td>${statusBadge(task)}</td>
        <td><button class="action-btn undo-btn" data-action="undo" data-id="${task.id}" title="Mark pending">↶</button></td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">No completed tasks yet. Finish a task to see it here!</td></tr>`;
  }

  if ($("completedTable")) {
    $("completedTable").addEventListener("click", event => {
      const button = event.target.closest("button[data-action='undo']");
      if (!button) return;
      const task = tasks.find(item => String(item.id) === button.dataset.id);
      if (task) {
        task.completed = false;
        saveTasks();
        renderCompleted();
        updateDashboard();
      }
    });
  }

  updateDashboard();
  renderTasks();
  renderDeadlines();
  renderCompleted();
});
