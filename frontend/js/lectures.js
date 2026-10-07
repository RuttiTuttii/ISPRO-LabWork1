import { api } from "./api.js";
import { setBreadcrumbs } from "./app.js";

// модуль работы со списком и чтением лекций с тайловой навигацией

let currentLectureId = null;
let timerInterval = null;
let heartbeatInterval = null;
let secondsSpent = 0;
let currentViewMode = "cards"; // cards или list
let cachedTopics = [];

export async function initLectures(container, initialTopicId = null) {
  // очищаем интервалы если висели
  stopTimer();

  // загружаем темы и лекции
  cachedTopics = await api.getTopics();
  const lectures = await api.getLectures(initialTopicId);

  renderCatalog(container, cachedTopics, lectures, initialTopicId);
}

function renderCatalog(container, topics, lectures, selectedTopicId = null) {
  // обновляем тайловую навигацию наверху
  updateCatalogBreadcrumbs(selectedTopicId, container);

  // формируем опции селекта
  const topicOptions = topics
    .map(
      (t) =>
        `<option value="${t.id}" ${selectedTopicId === t.id ? "selected" : ""}>${t.title}</option>`
    )
    .join("");

  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-left">
        <div class="custom-select-wrap">
          <select id="topic-filter" class="custom-select">
            <option value="">Все темы курса</option>
            ${topicOptions}
          </select>
          <div class="custom-select-arrow"></div>
        </div>

        <input type="text" id="lecture-search" class="custom-input" placeholder="Поиск по лекциям..." style="max-width: 240px;" />

        <div class="found-count">
          Найдено: <span class="found-badge" id="lectures-found-badge">${lectures.length}</span>
        </div>
      </div>

      <div class="filter-right">
        <span style="font-size: 13px; color: var(--text-secondary);">Вид отображения:</span>
        <button id="view-cards-btn" class="btn btn-sm ${currentViewMode === "cards" ? "btn-primary" : "btn-secondary"}">Карточки</button>
        <button id="view-list-btn" class="btn btn-sm ${currentViewMode === "list" ? "btn-primary" : "btn-secondary"}">Список</button>
        <button id="create-lecture-btn" class="btn btn-sm btn-secondary teacher-only" style="display: none;">+ Добавить лекцию</button>
      </div>
    </div>

    <div id="lectures-container" class="${currentViewMode === "cards" ? "lectures-grid" : "lectures-list-view"}">
      ${renderCards(lectures)}
    </div>
  `;

  // элементы фильтра
  const topicSelect = container.querySelector("#topic-filter");
  const searchInput = container.querySelector("#lecture-search");
  const cardsBtn = container.querySelector("#view-cards-btn");
  const listBtn = container.querySelector("#view-list-btn");
  const createBtn = container.querySelector("#create-lecture-btn");

  // переключение вида
  cardsBtn.addEventListener("click", () => {
    currentViewMode = "cards";
    cardsBtn.className = "btn btn-sm btn-primary";
    listBtn.className = "btn btn-sm btn-secondary";
    const box = container.querySelector("#lectures-container");
    box.className = "lectures-grid";
  });

  listBtn.addEventListener("click", () => {
    currentViewMode = "list";
    listBtn.className = "btn btn-sm btn-primary";
    cardsBtn.className = "btn btn-sm btn-secondary";
    const box = container.querySelector("#lectures-container");
    box.className = "lectures-list-view";
  });

  // обработка фильтрации
  const applyFilter = async () => {
    const tid = topicSelect.value ? parseInt(topicSelect.value) : null;
    const query = searchInput.value.trim();
    const filtered = await api.getLectures(tid, query);
    container.querySelector("#lectures-found-badge").textContent = filtered.length;
    container.querySelector("#lectures-container").innerHTML = renderCards(filtered);
    attachCardListeners(container);
    updateCatalogBreadcrumbs(tid, container);
  };

  topicSelect.addEventListener("change", applyFilter);
  searchInput.addEventListener("input", applyFilter);

  // кнопка добавления лекции для преподавателя
  createBtn.addEventListener("click", () => showCreateModal(container, topics));

  attachCardListeners(container);
  checkTeacherRole(container);
}

function updateCatalogBreadcrumbs(selectedTopicId, container) {
  // строим тайловую таблетку для каталога
  if (!selectedTopicId) {
    setBreadcrumbs([{ label: "Каталог лекций", active: true }]);
  } else {
    const topicObj = cachedTopics.find((t) => t.id === selectedTopicId);
    const title = topicObj ? topicObj.title : "Тема";
    setBreadcrumbs([
      {
        label: "Каталог лекций",
        onClick: () => initLectures(container, null),
      },
      {
        label: title,
        active: true,
      },
    ]);
  }
}

function renderCards(lectures) {
  // генерация карточек
  if (lectures.length === 0) {
    return `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">Ничего не найдено</div>`;
  }

  return lectures
    .map((l) => {
      const visitedBadge = l.is_completed
        ? `<span class="badge badge-success">Изучено</span>`
        : l.is_visited
        ? `<span class="badge">В процессе</span>`
        : `<span class="badge badge-outline">Новая</span>`;

      return `
        <div class="lecture-card" data-id="${l.id}">
          <div class="card-top">
            <div>
              <div class="card-title">${l.title}</div>
              <div class="card-topic">${l.topic_title}</div>
            </div>
            ${visitedBadge}
          </div>

          <div class="card-bottom">
            <span>Время: ~${l.reading_time_minutes} мин</span>
            <span>На странице: ${formatSeconds(l.time_spent_seconds)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function attachCardListeners(container) {
  // клик по карточке лекции
  container.querySelectorAll(".lecture-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseInt(card.getAttribute("data-id"));
      openLecture(container, id);
    });
  });
}

async function openLecture(container, id) {
  // загрузка содержимого конкретной лекции
  currentLectureId = id;
  const lecture = await api.getLecture(id);

  secondsSpent = lecture.time_spent_seconds || 0;

  // обновляем тайловую навигацию с хлебными крошками в одну таблетку
  setBreadcrumbs([
    {
      label: "Каталог лекций",
      onClick: () => {
        stopTimer();
        initLectures(container, null);
      },
    },
    {
      label: lecture.topic_title,
      onClick: () => {
        stopTimer();
        initLectures(container, lecture.topic_id);
      },
    },
    {
      label: lecture.title,
      active: true,
    },
  ]);

  const videoBlock = lecture.media_url
    ? `<div style="margin: 20px 0;"><iframe width="100%" height="380" src="${lecture.media_url}" frameborder="0" allowfullscreen style="border-radius: var(--radius-control);"></iframe></div>`
    : "";

  const attachmentBlock = lecture.attachment_name
    ? `<div style="margin-top: 20px;"><a href="#" class="btn btn-secondary btn-sm" onclick="alert('Скачивание файла: ${lecture.attachment_name}'); return false;">Прикрепленный файл: ${lecture.attachment_name}</a></div>`
    : "";

  container.innerHTML = `
    <div class="lecture-reader">
      <div class="reader-toolbar">
        <button id="back-to-catalog" class="btn btn-secondary btn-sm">← Назад к каталогу</button>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="reader-timer-pill">
            <span>Время чтения:</span>
            <strong id="live-timer-text">${formatSeconds(secondsSpent)}</strong>
          </div>
          <button id="mark-done-btn" class="btn btn-sm ${lecture.is_completed ? "btn-secondary" : "btn-primary"}">
            ${lecture.is_completed ? "Изучено" : "Отметить как изученное"}
          </button>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <span class="badge" style="margin-bottom: 8px;">${lecture.topic_title}</span>
        <h1 style="font-size: 24px; font-weight: 700; margin-top: 4px;">${lecture.title}</h1>
      </div>

      ${videoBlock}

      <div class="reading-content">
        ${lecture.content}
      </div>

      ${attachmentBlock}
    </div>
  `;

  // запускаем счетчик
  startTimer(id);

  // кнопка возврата
  container.querySelector("#back-to-catalog").addEventListener("click", () => {
    stopTimer();
    initLectures(container, lecture.topic_id);
  });

  // кнопка завершения чтения
  const doneBtn = container.querySelector("#mark-done-btn");
  doneBtn.addEventListener("click", async () => {
    await api.updateProgress(id, 0, true);
    doneBtn.className = "btn btn-sm btn-secondary";
    doneBtn.textContent = "Изучено";
  });
}

function startTimer(id) {
  stopTimer();
  const timerEl = document.getElementById("live-timer-text");

  timerInterval = setInterval(() => {
    secondsSpent += 1;
    if (timerEl) {
      timerEl.textContent = formatSeconds(secondsSpent);
    }
  }, 1000);

  heartbeatInterval = setInterval(async () => {
    try {
      await api.updateProgress(id, 5, null);
    } catch (e) {}
  }, 5000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  timerInterval = null;
  heartbeatInterval = null;
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function checkTeacherRole(container) {
  try {
    const me = await api.getMe();
    const btn = container.querySelector("#create-lecture-btn");
    if (btn) {
      btn.style.display = me.role_name === "teacher" ? "inline-flex" : "none";
    }
  } catch (e) {}
}

function showCreateModal(container, topics) {
  const topicOpts = topics
    .map((t) => `<option value="${t.id}">${t.title}</option>`)
    .join("");

  const modal = document.createElement("div");
  modal.style.cssText =
    "position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100;";
  modal.innerHTML = `
    <div style="background: white; border-radius: var(--radius-card); padding: 28px; width: 500px; max-width: 90%;">
      <h3 style="margin-bottom: 16px;">Добавление новой лекции</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <select id="modal-topic" class="custom-select">${topicOpts}</select>
        <input type="text" id="modal-title" class="custom-input" placeholder="Название лекции" />
        <textarea id="modal-content" class="custom-input" style="height: 120px; border-radius: 12px; resize: vertical;" placeholder="Содержимое в HTML или тексте"></textarea>
        <input type="text" id="modal-media" class="custom-input" placeholder="Ссылка на видео (опционально)" />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
        <button id="modal-cancel" class="btn btn-secondary btn-sm">Отмена</button>
        <button id="modal-submit" class="btn btn-primary btn-sm">Создать</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#modal-cancel").onclick = () => modal.remove();
  modal.querySelector("#modal-submit").onclick = async () => {
    const tid = parseInt(modal.querySelector("#modal-topic").value);
    const title = modal.querySelector("#modal-title").value.trim();
    const content = modal.querySelector("#modal-content").value.trim();
    const media = modal.querySelector("#modal-media").value.trim() || null;

    if (!title || !content) {
      alert("Заполните заголовок и текст лекции");
      return;
    }

    await api.createLecture({
      topic_id: tid,
      title,
      content,
      media_url: media,
      content_type: "html",
      reading_time_minutes: 5,
    });

    modal.remove();
    initLectures(container);
  };
}
