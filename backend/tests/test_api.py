import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.connection import init_db
from backend.app.core.grading import calculate_grade

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    # перед запуском тестов гарантируем что база создана
    init_db(force_reseed=False)


def test_health():
    # дергаем проверку здоровья
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_grading_boundaries():
    # проверяем пограничные баллы по шкале
    # ровно 100% и ровно 90% это отлично
    pct, grade, _ = calculate_grade(10, 10)
    assert pct == 100.0 and grade == "отлично"

    pct, grade, _ = calculate_grade(9, 10)
    assert pct == 90.0 and grade == "отлично"

    # 80% и 75% это хорошо
    pct, grade, _ = calculate_grade(8, 10)
    assert pct == 80.0 and grade == "хорошо"

    pct, grade, _ = calculate_grade(75, 100)
    assert pct == 75.0 and grade == "хорошо"

    # 70% и 60% это удовлетворительно
    pct, grade, _ = calculate_grade(7, 10)
    assert pct == 70.0 and grade == "удовлетворительно"

    pct, grade, _ = calculate_grade(6, 10)
    assert pct == 60.0 and grade == "удовлетворительно"

    # меньше 60% это неудовлетворительно
    pct, grade, _ = calculate_grade(5, 10)
    assert pct == 50.0 and grade == "неудовлетворительно"

    pct, grade, _ = calculate_grade(0, 10)
    assert pct == 0.0 and grade == "неудовлетворительно"


def test_auth_and_roles():
    # проверяем получение пользователя и переключение на препода и обратно
    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 200
    data = res_me.json()
    assert data["role_name"] in ("student", "teacher")

    # переключаем роль на препода
    res_switch = client.post("/api/auth/switch-role", json={"role_name": "teacher"})
    assert res_switch.status_code == 200
    assert res_switch.json()["role_name"] == "teacher"

    # возвращаем студента
    res_back = client.post("/api/auth/switch-role", json={"role_name": "student"})
    assert res_back.status_code == 200
    assert res_back.json()["role_name"] == "student"


def test_lectures_and_progress_tracking():
    # проверяем список лекций и тиканье секунд на странице
    res = client.get("/api/lectures")
    assert res.status_code == 200
    lectures = res.json()
    assert len(lectures) >= 3

    first_id = lectures[0]["id"]
    # заходим в лекцию
    detail_res = client.get(f"/api/lectures/{first_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["is_visited"] is True

    # шлем пинг с секундами
    hb_res = client.post(
        f"/api/lectures/{first_id}/progress",
        json={"additional_seconds": 15, "mark_completed": True},
    )
    assert hb_res.status_code == 200
    assert hb_res.json()["is_completed"] is True


def test_test_generation_random_10_of_20():
    # проверяем что выдается ровно 10 случайных вопросов без повторов
    res = client.get("/api/tests/1/start")
    assert res.status_code == 200
    data = res.json()
    assert data["total_questions"] == 10
    questions = data["questions"]
    assert len(questions) == 10

    q_ids = [q["id"] for q in questions]
    # смотрим чтобы не было дублей
    assert len(set(q_ids)) == 10

    # смотрим чтобы у каждого вопроса было по 4 варианта
    for q in questions:
        assert len(q["options"]) == 4


def test_interactive_exercises_verification():
    # проверяем подсказку и решение заданий
    ex1_hint = client.get("/api/exercises/1/hint")
    assert ex1_hint.status_code == 200
    assert len(ex1_hint.json()["hint"]) > 0

    # проверяем неправильный порядок
    wrong_order_res = client.post(
        "/api/exercises/1/verify",
        json={"submission": ["step_deploy", "step_code", "step_tz"]},
    )
    assert wrong_order_res.status_code == 200
    assert wrong_order_res.json()["is_correct"] is False
    assert len(wrong_order_res.json()["errors"]) > 0

    # проверяем правильный порядок
    correct_order_res = client.post(
        "/api/exercises/1/verify",
        json={
            "submission": [
                "step_tz",
                "step_arch",
                "step_code",
                "step_test",
                "step_build",
                "step_deploy",
            ]
        },
    )
    assert correct_order_res.status_code == 200
    assert correct_order_res.json()["is_correct"] is True

    # проверяем регулярку semver
    regex_res = client.post(
        "/api/exercises/3/verify",
        json={"submission": r"^v?\d+\.\d+\.\d+$"},
    )
    assert regex_res.status_code == 200
    assert regex_res.json()["is_correct"] is True


def test_regex_exercise_variations():
    # проверяем все варианты написания эталона пользователем
    valid_variations = [
        r"^v?\d+\.\d+\.\d+$",
        r"v?\d+\.\d+\.\d+",
        r"/^v?\d+\.\d+\.\d+$/",
        r"/^v?\d+\.\d+\.\d+/g",
        r"^v?\d+\.\d+\.\d+",
        r"^v?[0-9]+\.[0-9]+\.[0-9]+$",
        r"v?[0-9]+\.[0-9]+\.[0-9]+",
        r"^v?\d+(\.\d+){2}$",
        r"v?(\d+)\.(\d+)\.(\d+)",
        "^v?\\\\d+\\\\.\\\\d+\\\\.\\\\d+$",
        "  ^v?\\d+\\.\\d+\\.\\d+$  ",
        "`^v?\\d+\\.\\d+\\.\\d+$`",
        "'^v?\\d+\\.\\d+\\.\\d+$'",
    ]

    for pat in valid_variations:
        res = client.post("/api/exercises/3/verify", json={"submission": pat})
        assert res.status_code == 200, f"запрос упал на паттерне: {pat}"
        data = res.json()
        assert data["is_correct"] is True, f"не прошел валидный паттерн: {pat}, ошибки: {data.get('errors')}"

    # проверяем заведомо неверные варианты
    invalid_variations = [
        r"hello_world",
        r"^\d+$",
        r"[a-z]+",
        r"(invalid_regex[",
    ]

    for bad_pat in invalid_variations:
        res = client.post("/api/exercises/3/verify", json={"submission": bad_pat})
        assert res.status_code == 200
        data = res.json()
        assert data["is_correct"] is False

