import { api } from "./api.js";

// модуль интерактивных заданий с drag and drop и регулярками

let exercisesList = [];
let currentExerciseId = null;
let currentExerciseData = null;
let currentOrderingState = [];
let currentGroupingState = {}; // item_id -> group_id

export async function initExercises(container) {
  // загружаем список доступных заданий
  exercisesList = await api.getExercises();
  if (exercisesList.length > 0) {
    // если в url передан номер конкретного упражнения выбираем его
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = parseInt(urlParams.get("exercise"));
    const match = exercisesList.find((e) => e.id === targetId);
    currentExerciseId = match ? match.id : exercisesList[0].id;
    await loadExercise(container, currentExerciseId);
  } else {
    container.innerHTML = `<div style="text-align:center; padding:40px;">Заданий не найдено</div>`;
  }
}

async function loadExercise(container, id) {
  // дергаем апи за полными данными задания
  currentExerciseId = id;
  currentExerciseData = await api.getExercise(id);

  // сбрасываем локальное состояние под тип задания
  if (currentExerciseData.exercise_type === "ordering") {
    currentOrderingState = currentExerciseData.payload.items.map((i) => i.id);
  } else if (currentExerciseData.exercise_type === "grouping") {
    currentGroupingState = {};
  }

  renderExerciseLayout(container);
}

function renderExerciseLayout(container) {
  // генерим кнопки переключения между заданиями
  const tabsHtml = exercisesList
    .map(
      (ex, idx) => `
      <button class="btn btn-sm ${ex.id === currentExerciseId ? "btn-primary" : "btn-secondary"} ex-tab-btn" data-id="${ex.id}">
        Задание ${idx + 1}: ${ex.exercise_type}
      </button>
    `
    )
    .join("");

  container.innerHTML = `
    <div class="exercise-workspace">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${tabsHtml}
        </div>
        <button id="get-hint-btn" class="btn btn-secondary btn-sm">Подсказка</button>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">${currentExerciseData.title}</h2>
        <p style="color: var(--text-secondary); font-size: 14px;">${currentExerciseData.description}</p>
        <div style="font-size: 13px; font-weight: 500; margin-top: 8px; color: var(--text-primary); background: var(--bg-card-subtle); padding: 8px 14px; border-radius: var(--radius-control); border: 1px solid var(--border-light);">
          Инструкция: ${currentExerciseData.instruction}
        </div>
      </div>

      <div id="hint-container"></div>

      <div id="exercise-interactive-area">
        ${renderInteractiveContent()}
      </div>

      <div id="feedback-container"></div>

      <div style="display: flex; justify-content: flex-end; margin-top: 24px; border-top: 1px solid var(--border-light); padding-top: 18px;">
        <button id="verify-exercise-btn" class="btn btn-primary">Проверить решение</button>
      </div>
    </div>
  `;

  // переключение между упражнениями
  container.querySelectorAll(".ex-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-id"));
      loadExercise(container, id);
    });
  });

  // запрос подсказки
  container.querySelector("#get-hint-btn").addEventListener("click", async () => {
    const hintData = await api.getHint(currentExerciseId);
    const box = container.querySelector("#hint-container");
    box.innerHTML = `
      <div class="alert-box alert-hint">
        <strong>Подсказка:</strong>
        <div>${hintData.hint}</div>
      </div>
    `;
  });

  // проверка ответа
  container.querySelector("#verify-exercise-btn").addEventListener("click", () => {
    verifyCurrentExercise(container);
  });

  // вешаем быстрый сабмит по enter на поле ввода регулярки
  const regexInput = container.querySelector("#regex-input");
  if (regexInput) {
    regexInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyCurrentExercise(container);
      }
    });
  }

  // подставляем эталонный ответ по клику для удобства проверки
  const fillSampleBtn = container.querySelector("#fill-sample-regex-btn");
  if (fillSampleBtn && regexInput) {
    fillSampleBtn.addEventListener("click", () => {
      regexInput.value = "^v?\\d+\\.\\d+\\.\\d+$";
      regexInput.focus();
    });
  }

  // инициализация drag and drop если нужно
  attachDragAndDropHandlers(container);
}

function renderInteractiveContent() {
  const ex = currentExerciseData;

  // тип 1: сортировка шагов drag and drop
  if (ex.exercise_type === "ordering") {
    const itemsMap = {};
    ex.payload.items.forEach((item) => (itemsMap[item.id] = item.text));

    const itemsHtml = currentOrderingState
      .map(
        (itemId, index) => `
        <div class="dnd-item" draggable="true" data-id="${itemId}" data-index="${index}">
          <span class="dnd-handle">::</span>
          <span style="font-weight: 500; font-size: 14px;">${itemsMap[itemId]}</span>
        </div>
      `
      )
      .join("");

    return `
      <div class="dnd-list" id="ordering-list">
        ${itemsHtml}
      </div>
    `;
  }

  // тип 2: группировка по колонкам
  if (ex.exercise_type === "grouping") {
    const unassignedItems = ex.payload.items
      .filter((itm) => !currentGroupingState[itm.id])
      .map(
        (itm) => `
        <div class="dnd-item" draggable="true" data-id="${itm.id}" style="padding: 8px 14px; font-size: 13px;">
          <span>:: ${itm.text}</span>
        </div>
      `
      )
      .join("");

    const columnsHtml = ex.payload.groups
      .map((grp) => {
        const assigned = ex.payload.items
          .filter((itm) => currentGroupingState[itm.id] === grp.id)
          .map(
            (itm) => `
            <div class="dnd-item" draggable="true" data-id="${itm.id}" style="padding: 8px 14px; font-size: 13px; background: white;">
              <span>${itm.text}</span>
            </div>
          `
          )
          .join("");

        return `
          <div class="group-column" data-group-id="${grp.id}">
            <div class="group-title">${grp.title}</div>
            <div class="group-drop-target" style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
              ${assigned}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div>
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">Нераспределенные элементы:</div>
        <div id="unassigned-box" style="display: flex; gap: 10px; flex-wrap: wrap; background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-control); margin-bottom: 18px; min-height: 50px;">
          ${unassignedItems || '<span style="font-size:12px; color:var(--text-muted);">Все элементы распределены по группам</span>'}
        </div>
        <div class="groups-container">
          ${columnsHtml}
        </div>
      </div>
    `;
  }

  // тип 3: проверка регулярного выражения
  if (ex.exercise_type === "regex") {
    const testCasesHtml = ex.payload.test_cases
      .map(
        (tc) => `
        <div style="font-size: 13px; background: white; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-light); display: inline-flex; gap: 6px;">
          <code>${tc.input}</code>
          <span style="color: ${tc.should_match ? "var(--grade-green)" : "var(--grade-red)"}; font-size: 11px;">
            (${tc.should_match ? "валидно" : "невалидно"})
          </span>
        </div>
      `
      )
      .join("");

    return `
      <div style="max-width: 640px; margin: 0 auto;">
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px;">Введите регулярное выражение:</label>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <input type="text" id="regex-input" class="custom-input" placeholder="^v?\\d+\\.\\d+\\.\\d+$" style="font-family: monospace; font-size: 15px; flex: 1;" />
          <button id="fill-sample-regex-btn" type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap;">Вставить эталон</button>
        </div>
        
        <div style="margin-top: 16px;">
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Тестовые кейсы для проверки:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${testCasesHtml}
          </div>
        </div>
      </div>
    `;
  }

  return "";
}

function attachDragAndDropHandlers(container) {
  const ex = currentExerciseData;

  // перетаскивание для упорядочивания
  if (ex.exercise_type === "ordering") {
    let draggedIndex = null;

    container.querySelectorAll(".dnd-item").forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        draggedIndex = parseInt(el.getAttribute("data-index"));
        el.classList.add("dragging");
      });

      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
      });

      el.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetIndex = parseInt(el.getAttribute("data-index"));
        if (draggedIndex !== null && draggedIndex !== targetIndex) {
          // меняем порядок в массиве
          const item = currentOrderingState.splice(draggedIndex, 1)[0];
          currentOrderingState.splice(targetIndex, 0, item);
          renderExerciseLayout(container);
        }
      });
    });
  }

  // перетаскивание для колонок группировки
  if (ex.exercise_type === "grouping") {
    let draggedItemId = null;

    container.querySelectorAll(".dnd-item").forEach((el) => {
      el.addEventListener("dragstart", () => {
        draggedItemId = el.getAttribute("data-id");
        el.classList.add("dragging");
      });

      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
      });
    });

    container.querySelectorAll(".group-column").forEach((col) => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("drag-over");
      });

      col.addEventListener("dragleave", () => {
        col.classList.remove("drag-over");
      });

      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        const grpId = col.getAttribute("data-group-id");
        if (draggedItemId && grpId) {
          currentGroupingState[draggedItemId] = grpId;
          renderExerciseLayout(container);
        }
      });
    });
  }
}

async function verifyCurrentExercise(container) {
  const ex = currentExerciseData;
  let submission = null;

  // формируем отправляемый ответ
  if (ex.exercise_type === "ordering") {
    submission = currentOrderingState;
  } else if (ex.exercise_type === "grouping") {
    submission = currentGroupingState;
  } else if (ex.exercise_type === "regex") {
    const input = container.querySelector("#regex-input");
    submission = input ? input.value.trim() : "";
  }

  const result = await api.verifyExercise(currentExerciseId, submission);
  const feedbackBox = container.querySelector("#feedback-container");

  if (result.is_correct) {
    feedbackBox.innerHTML = `
      <div class="alert-box alert-success">
        <strong>Задание успешно выполнено</strong>
        <div>${result.message}</div>
        <div style="font-size: 13px; margin-top: 6px;">${result.explanation || ""}</div>
      </div>
    `;
  } else {
    const errorsList = result.errors.map((err) => `<li>${err}</li>`).join("");
    feedbackBox.innerHTML = `
      <div class="alert-box alert-error">
        <strong>Обнаружены ошибки:</strong>
        <div>${result.message}</div>
        <ul style="padding-left: 18px; margin: 8px 0; font-size: 13px;">
          ${errorsList}
        </ul>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
          ${result.explanation || ""}
        </div>
      </div>
    `;
  }
}
