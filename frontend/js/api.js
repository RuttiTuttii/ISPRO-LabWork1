// модуль общения с сервером через fetch

const api_base = "/api";

async function request(endpoint, options = {}) {
  // базовый хелпер для запросов с обработкой ошибок
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${api_base}${endpoint}`, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `ошибка запроса: ${response.status}`);
  }
  return response.json();
}

// методы профиля и ролей
export const api = {
  // профиль
  getMe: () => request("/auth/me"),
  switchRole: (role_name) =>
    request("/auth/switch-role", {
      method: "POST",
      body: JSON.stringify({ role_name }),
    }),

  // лекции
  getTopics: () => request("/lectures/topics"),
  getLectures: (topicId = null, search = "") => {
    const params = new URLSearchParams();
    if (topicId) params.append("topic_id", topicId);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/lectures${qs}`);
  },
  getLecture: (id) => request(`/lectures/${id}`),
  updateProgress: (id, seconds, completed = null) =>
    request(`/lectures/${id}/progress`, {
      method: "POST",
      body: JSON.stringify({
        additional_seconds: seconds,
        mark_completed: completed,
      }),
    }),
  createLecture: (data) =>
    request("/lectures", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteLecture: (id) =>
    request(`/lectures/${id}`, {
      method: "DELETE",
    }),

  // тесты
  startTest: (poolId = 1) => request(`/tests/${poolId}/start`),
  submitTest: (poolId, payload) =>
    request(`/tests/${poolId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAttempts: () => request("/tests/attempts/history"),

  // интерактив
  getExercises: () => request("/exercises"),
  getExercise: (id) => request(`/exercises/${id}`),
  getHint: (id) => request(`/exercises/${id}/hint`),
  verifyExercise: (id, submission) =>
    request(`/exercises/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ submission }),
    }),
};
