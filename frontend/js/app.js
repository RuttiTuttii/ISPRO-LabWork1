import { api } from "./api.js";
import { initLectures } from "./lectures.js";
import { initTests } from "./tests.js";
import { initExercises } from "./exercises.js";

// главный контроллер фронтенда

let currentTab = "lectures";
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  // инициализируем пользователя и шапку
  await loadUserProfile();
  setupNavigation();
  setupRoleSwitcher();
  switchTab("lectures");
});

async function loadUserProfile() {
  // достаем данные юзера и обновляем бейдж роли
  try {
    currentUser = await api.getMe();
    updateUserUI();
  } catch (err) {
    console.error("не удалось получить пользователя", err);
  }
}

function updateUserUI() {
  if (!currentUser) return;

  const roleNameEl = document.getElementById("current-user-name");
  if (roleNameEl) {
    roleNameEl.textContent = `${currentUser.full_name} (${currentUser.role_name === "teacher" ? "Преподаватель" : "Студент"})`;
  }

  // подсвечиваем активную кнопку роли
  const studentBtn = document.getElementById("role-student-btn");
  const teacherBtn = document.getElementById("role-teacher-btn");

  if (studentBtn && teacherBtn) {
    if (currentUser.role_name === "teacher") {
      teacherBtn.className = "role-btn active";
      studentBtn.className = "role-btn";
    } else {
      studentBtn.className = "role-btn active";
      teacherBtn.className = "role-btn";
    }
  }
}

function setupNavigation() {
  // вешаем клики на табы навигации
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      switchTab(target);
    });
  });
}

function setupRoleSwitcher() {
  // обработчики быстрого переключения ролей
  const studentBtn = document.getElementById("role-student-btn");
  const teacherBtn = document.getElementById("role-teacher-btn");

  if (studentBtn) {
    studentBtn.addEventListener("click", async () => {
      currentUser = await api.switchRole("student");
      updateUserUI();
      // перезагружаем текущую вкладку
      switchTab(currentTab);
    });
  }

  if (teacherBtn) {
    teacherBtn.addEventListener("click", async () => {
      currentUser = await api.switchRole("teacher");
      updateUserUI();
      // перезагружаем текущую вкладку
      switchTab(currentTab);
    });
  }
}

function switchTab(tabName) {
  currentTab = tabName;

  // меняем активный класс на кнопке таба
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const contentArea = document.getElementById("app-main-view");
  contentArea.innerHTML = "";

  // запускаем рендеринг нужного модуля
  if (tabName === "lectures") {
    initLectures(contentArea);
  } else if (tabName === "tests") {
    initTests(contentArea);
  } else if (tabName === "exercises") {
    initExercises(contentArea);
  } else if (tabName === "diagrams") {
    renderDiagrams(contentArea);
  }
}

function renderDiagrams(container) {
  // экран со схемами архитектуры и бд в чб
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      <div class="diagram-viewer">
        <h3 style="margin-bottom: 16px; font-size: 16px;">1. ER-диаграмма базы данных (ГОСТ / ч-б Times New Roman)</h3>
        <img src="/static/../database/erd_diagram.svg" alt="ERD Diagram" style="max-width: 100%; border: 1px solid var(--border-light); border-radius: var(--radius-control);" />
      </div>

      <div class="diagram-viewer">
        <h3 style="margin-bottom: 16px; font-size: 16px;">2. Архитектура структуры проекта (Layered Architecture)</h3>
        <img src="/static/../database/architecture_diagram.svg" alt="Architecture Diagram" style="max-width: 100%; border: 1px solid var(--border-light); border-radius: var(--radius-control);" />
      </div>
    </div>
  `;
}
