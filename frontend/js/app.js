import { api } from "./api.js";
import { initLectures } from "./lectures.js";
import { initTests } from "./tests.js";
import { initExercises } from "./exercises.js";

// главный контроллер приложения

let currentTab = "lectures";
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  // старт приложения
  await loadUserProfile();
  setupNavigation();
  setupRoleSwitcher();
  switchTab("lectures");
});

async function loadUserProfile() {
  // достаем текущего юзера
  try {
    currentUser = await api.getMe();
    updateUserUI();
  } catch (err) {
    console.error("ошибка загрузки профиля", err);
  }
}

function updateUserUI() {
  if (!currentUser) return;

  const roleNameEl = document.getElementById("current-user-name");
  if (roleNameEl) {
    roleNameEl.textContent = `${currentUser.full_name} (${currentUser.role_name === "teacher" ? "Преподаватель" : "Студент"})`;
  }

  // переключаем активную кнопку роли
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
  // клики по вкладкам в шапке
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      switchTab(target);
    });
  });
}

function setupRoleSwitcher() {
  // переключалка роли
  const studentBtn = document.getElementById("role-student-btn");
  const teacherBtn = document.getElementById("role-teacher-btn");

  if (studentBtn) {
    studentBtn.addEventListener("click", async () => {
      currentUser = await api.switchRole("student");
      updateUserUI();
      switchTab(currentTab);
    });
  }

  if (teacherBtn) {
    teacherBtn.addEventListener("click", async () => {
      currentUser = await api.switchRole("teacher");
      updateUserUI();
      switchTab(currentTab);
    });
  }
}

export function setBreadcrumbs(items) {
  // тайловая навигация в одну компактную таблетку
  const container = document.getElementById("breadcrumb-area");
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = "";
    return;
  }

  const breadcrumbPill = document.createElement("nav");
  breadcrumbPill.className = "pill-breadcrumb";

  items.forEach((item, index) => {
    if (index > 0) {
      const divider = document.createElement("span");
      divider.className = "pill-divider";
      divider.textContent = "/";
      breadcrumbPill.appendChild(divider);
    }

    const tile = document.createElement("button");
    tile.className = `pill-tile ${item.active ? "active" : ""}`;
    tile.textContent = item.label;

    if (item.onClick && !item.active) {
      tile.addEventListener("click", item.onClick);
    }

    breadcrumbPill.appendChild(tile);
  });

  container.innerHTML = "";
  container.appendChild(breadcrumbPill);
}

export function switchTab(tabName) {
  currentTab = tabName;

  // обновляем активный таб
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const contentArea = document.getElementById("app-main-view");
  contentArea.innerHTML = "";

  // отрисовываем нужный экран
  if (tabName === "lectures") {
    initLectures(contentArea);
  } else if (tabName === "tests") {
    setBreadcrumbs([
      { label: "Каталог", onClick: () => switchTab("lectures") },
      { label: "Контрольное тестирование", active: true },
    ]);
    initTests(contentArea);
  } else if (tabName === "exercises") {
    setBreadcrumbs([
      { label: "Каталог", onClick: () => switchTab("lectures") },
      { label: "Интерактивные задания", active: true },
    ]);
    initExercises(contentArea);
  } else if (tabName === "diagrams") {
    setBreadcrumbs([
      { label: "Каталог", onClick: () => switchTab("lectures") },
      { label: "Схемы архитектуры и БД", active: true },
    ]);
    renderDiagrams(contentArea);
  }
}

function renderDiagrams(container) {
  // просмотр диаграмм в чб
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
