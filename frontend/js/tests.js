import { api } from "./api.js";

// модуль прохождения тестов и подсчета оценок

let testSession = null;
let currentQuestionIndex = 0;
let userAnswers = {}; // question_id -> selected_option_id
let countdownInterval = null;
let secondsRemaining = 600;
let timeSpentSeconds = 0;

export async function initTests(container) {
  // показываем стартовый экран с правилами
  stopCountdown();
  renderTestWelcome(container);
}

function renderTestWelcome(container) {
  container.innerHTML = `
    <div class="test-container" style="text-align: center; max-width: 680px;">
      <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px;">Контрольное тестирование</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 15px;">
        Проверка знаний по структуре программного обеспечения, чистой архитектуре и паттернам GoF.
      </p>

      <div style="background-color: var(--bg-card-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-control); padding: 20px; text-align: left; margin-bottom: 28px;">
        <h4 style="margin-bottom: 10px; font-size: 14px;">Регламент оценивания (п. 5.4.2):</h4>
        <ul style="padding-left: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
          <li>Случайная выборка <strong>10 вопросов из пула 20</strong> (без повторов)</li>
          <li>В каждом вопросе 4 варианта ответа с перемешиванием порядка</li>
          <li>Лимит времени: <strong>10 минут</strong></li>
          <li><span style="color: var(--grade-green); font-weight: 600;">90% – 100%</span> — «отлично»</li>
          <li><span style="color: var(--grade-blue); font-weight: 600;">75% – 89.99%</span> — «хорошо»</li>
          <li><span style="color: var(--grade-yellow); font-weight: 600;">60% – 74.99%</span> — «удовлетворительно»</li>
          <li><span style="color: var(--grade-red); font-weight: 600;">менее 60%</span> — «неудовлетворительно»</li>
        </ul>
      </div>

      <div style="display: flex; justify-content: center; gap: 14px;">
        <button id="start-test-btn" class="btn btn-primary" style="padding: 12px 32px; font-size: 15px;">Начать тестирование</button>
        <button id="view-history-btn" class="btn btn-secondary">История попыток</button>
      </div>
    </div>
  `;

  container.querySelector("#start-test-btn").addEventListener("click", () => {
    startTestRun(container);
  });

  container.querySelector("#view-history-btn").addEventListener("click", () => {
    renderHistory(container);
  });
}

async function startTestRun(container) {
  // дергаем апи для получения 10 рандомных вопросов
  testSession = await api.startTest(1);
  currentQuestionIndex = 0;
  userAnswers = {};
  secondsRemaining = testSession.time_limit_seconds || 600;
  timeSpentSeconds = 0;

  renderActiveTest(container);
  startCountdown(container);
}

function renderActiveTest(container) {
  const q = testSession.questions[currentQuestionIndex];
  const total = testSession.total_questions;

  // рисуем круглые шаги навигации
  const stepsHtml = testSession.questions
    .map((item, idx) => {
      const isCurrent = idx === currentQuestionIndex ? "active" : "";
      const isAnswered = userAnswers[item.id] !== undefined ? "answered" : "";
      return `<button class="step-pill ${isCurrent} ${isAnswered}" data-idx="${idx}">${idx + 1}</button>`;
    })
    .join("");

  // рисуем варианты ответов
  const optionsHtml = q.options
    .map((opt) => {
      const isChecked = userAnswers[q.id] === opt.id;
      return `
        <label class="custom-radio ${isChecked ? "checked" : ""}" data-opt-id="${opt.id}">
          <input type="radio" name="question_opt" value="${opt.id}" ${isChecked ? "checked" : ""} />
          <span style="font-size: 14px;">${opt.option_text}</span>
        </label>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="test-container">
      <div class="test-header">
        <div>
          <span class="badge" style="margin-bottom: 4px;">Вопрос ${currentQuestionIndex + 1} из ${total}</span>
          <div style="font-size: 13px; color: var(--text-secondary);">${testSession.title}</div>
        </div>

        <div class="timer-badge" id="test-timer-badge">
          ${formatTimer(secondsRemaining)}
        </div>
      </div>

      <div class="question-stepper">
        ${stepsHtml}
      </div>

      <div class="question-card">
        <div class="question-text">${q.question_text}</div>
        <div id="options-box">
          ${optionsHtml}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 20px;">
        <button id="prev-btn" class="btn btn-secondary btn-sm" ${currentQuestionIndex === 0 ? "disabled" : ""}>
          ← Назад
        </button>

        <div style="display: flex; gap: 10px;">
          ${
            currentQuestionIndex === total - 1
              ? `<button id="finish-btn" class="btn btn-primary btn-sm" style="background: #235438;">Завершить тест</button>`
              : `<button id="next-btn" class="btn btn-primary btn-sm">Далее →</button>`
          }
        </div>
      </div>
    </div>
  `;

  // переключение по шагам сверху
  container.querySelectorAll(".step-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentQuestionIndex = parseInt(btn.getAttribute("data-idx"));
      renderActiveTest(container);
    });
  });

  // выбор варианта ответа
  container.querySelectorAll(".custom-radio").forEach((label) => {
    label.addEventListener("click", () => {
      const optId = parseInt(label.getAttribute("data-opt-id"));
      userAnswers[q.id] = optId;
      renderActiveTest(container);
    });
  });

  // кнопки назад и вперед
  const prevBtn = container.querySelector("#prev-btn");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderActiveTest(container);
      }
    });
  }

  const nextBtn = container.querySelector("#next-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentQuestionIndex < total - 1) {
        currentQuestionIndex++;
        renderActiveTest(container);
      }
    });
  }

  const finishBtn = container.querySelector("#finish-btn");
  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      submitTestRun(container);
    });
  }
}

function startCountdown(container) {
  stopCountdown();
  countdownInterval = setInterval(() => {
    secondsRemaining--;
    timeSpentSeconds++;

    const badge = document.getElementById("test-timer-badge");
    if (badge) {
      badge.textContent = formatTimer(secondsRemaining);
      if (secondsRemaining <= 60) {
        badge.style.backgroundColor = "var(--grade-red)";
      }
    }

    // время вышло — автосдача
    if (secondsRemaining <= 0) {
      stopCountdown();
      alert("Время вышло! Тест автоматически отправляется на проверку.");
      submitTestRun(container);
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = null;
}

function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function submitTestRun(container) {
  stopCountdown();

  // формируем пейлоад ответов
  const answersPayload = testSession.questions.map((q) => ({
    question_id: q.id,
    selected_option_id: userAnswers[q.id] || null,
  }));

  // отправляем на проверку
  const result = await api.submitTest(testSession.pool_id, {
    duration_seconds: timeSpentSeconds,
    answers: answersPayload,
  });

  renderResult(container, result);
}

function renderResult(container, result) {
  // генерим блок детального разбора ошибок
  const detailsHtml = result.details
    .map((d, idx) => {
      const statusIcon = d.is_correct ? "[верно]" : "[ошибка]";
      const statusColor = d.is_correct ? "var(--grade-green)" : "var(--grade-red)";
      return `
        <div style="background-color: var(--bg-card-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-control); padding: 16px; margin-bottom: 12px; text-align: left;">
          <div style="font-weight: 600; margin-bottom: 8px;">
            <span style="color: ${statusColor}; font-weight: bold; margin-right: 6px;">${statusIcon}</span>
            Вопрос ${idx + 1}: ${d.question_text}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">
            ${d.explanation || ""}
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="test-container" style="text-align: center;">
      <div class="test-result-box">
        <span class="badge" style="margin-bottom: 12px;">Результат тестирования</span>
        <div class="result-percentage" style="color: var(--${result.color_class.replace("grade-", "grade-")});">
          ${result.percentage}%
        </div>
        <div class="result-score-text">
          Правильных ответов: <strong>${result.score} из ${result.total_questions}</strong> | Время: ${formatTimer(result.duration_seconds)}
        </div>
        <div>
          <span class="grade-badge ${result.color_class}">Оценка: ${result.grade}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: center; gap: 12px; margin: 24px 0;">
        <button id="retry-test-btn" class="btn btn-primary btn-sm">Пройти еще раз</button>
        <button id="history-btn" class="btn btn-secondary btn-sm">История попыток</button>
      </div>

      <div style="margin-top: 32px; border-top: 1px solid var(--border-light); padding-top: 24px;">
        <h4 style="margin-bottom: 16px; text-align: left;">Подробный разбор вопросов:</h4>
        ${detailsHtml}
      </div>
    </div>
  `;

  container.querySelector("#retry-test-btn").addEventListener("click", () => {
    startTestRun(container);
  });

  container.querySelector("#history-btn").addEventListener("click", () => {
    renderHistory(container);
  });
}

async function renderHistory(container) {
  // смотрим историю сдачи
  const attempts = await api.getAttempts();

  const rows = attempts
    .map(
      (a) => `
      <tr>
        <td>${a.pool_title}</td>
        <td><strong>${a.percentage}%</strong> (${a.score}/${a.total_questions})</td>
        <td><span class="badge">${a.grade}</span></td>
        <td>${formatTimer(a.duration_seconds)}</td>
        <td style="color: var(--text-secondary); font-size: 12px;">${a.completed_at}</td>
      </tr>
    `
    )
    .join("");

  container.innerHTML = `
    <div class="test-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3>История попыток тестирования</h3>
        <button id="back-to-test" class="btn btn-secondary btn-sm">← К тесту</button>
      </div>

      <table class="minimal-table">
        <thead>
          <tr>
            <th>Тест</th>
            <th>Результат</th>
            <th>Оценка</th>
            <th>Время</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" style="text-align:center;">Попыток еще не было</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector("#back-to-test").addEventListener("click", () => {
    renderTestWelcome(container);
  });
}
