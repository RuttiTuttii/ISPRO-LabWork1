import json
import re
from typing import List
from fastapi import APIRouter, HTTPException
from backend.app.database.connection import get_db
from backend.app.api.auth import get_current_user_id
from backend.app.models.schemas import (
    ExerciseListItem,
    ExerciseDetail,
    ExerciseVerifyRequest,
    ExerciseVerifyResult,
)

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=List[ExerciseListItem])
def list_exercises():
    # отдаем список всех интерактивных заданий
    with get_db() as conn:
        rows = conn.execute(
            """
            select id, topic_id, exercise_type, title, description, instruction, order_index
            from interactive_exercises
            order by order_index asc;
            """
        ).fetchall()
        return rows


@router.get("/{exercise_id}", response_model=ExerciseDetail)
def get_exercise(exercise_id: int):
    # отдаем конкретное задание вместе со структурой и прошлым статусом
    user_id = get_current_user_id()
    with get_db() as conn:
        row = conn.execute(
            """
            select id, topic_id, exercise_type, title, description, instruction, payload_json
            from interactive_exercises
            where id = ?;
            """,
            (exercise_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="задание не найдено")

        # парсим json с данными задания
        payload = json.loads(row["payload_json"])

        # смотрим как юзер отвечал в прошлый раз если отвечал вообще
        last_attempt = conn.execute(
            """
            select is_correct, attempted_at, error_details
            from exercise_attempts
            where user_id = ? and exercise_id = ?
            order by attempted_at desc
            limit 1;
            """,
            (user_id, exercise_id),
        ).fetchone()

        return ExerciseDetail(
            id=row["id"],
            topic_id=row["topic_id"],
            exercise_type=row["exercise_type"],
            title=row["title"],
            description=row["description"],
            instruction=row["instruction"],
            payload=payload,
            user_status=dict(last_attempt) if last_attempt else None,
        )


@router.get("/{exercise_id}/hint")
def get_exercise_hint(exercise_id: int):
    # отдаем подсказку по заданию
    with get_db() as conn:
        row = conn.execute(
            "select hint from interactive_exercises where id = ?;", (exercise_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="задание не найдено")
        return {"exercise_id": exercise_id, "hint": row["hint"]}


@router.post("/{exercise_id}/verify", response_model=ExerciseVerifyResult)
def verify_exercise(exercise_id: int, req: ExerciseVerifyRequest):
    # проверяем решение и если что-то не так расписываем ошибки
    user_id = get_current_user_id()
    with get_db() as conn:
        row = conn.execute(
            """
            select id, exercise_type, title, hint, explanation, payload_json
            from interactive_exercises
            where id = ?;
            """,
            (exercise_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="задание не найдено")

        exercise_type = row["exercise_type"]
        payload = json.loads(row["payload_json"])
        hint = row["hint"]
        explanation = row["explanation"]

        is_correct = False
        errors: List[str] = []
        message = ""

        # проверяем задание на перетаскивание по порядку
        if exercise_type == "ordering":
            submitted_order = req.submission
            correct_order = payload.get("correct_order", [])

            if not isinstance(submitted_order, list):
                errors.append("ожидается список шагов")
            elif len(submitted_order) != len(correct_order):
                errors.append(f"выбрано {len(submitted_order)} шагов вместо {len(correct_order)}")
            else:
                items_dict = {item["id"]: item["text"] for item in payload.get("items", [])}
                mismatches = []
                for idx, (sub_id, corr_id) in enumerate(zip(submitted_order, correct_order), start=1):
                    if sub_id != corr_id:
                        mismatches.append(
                            f"шаг {idx}: сейчас стоит «{items_dict.get(sub_id, sub_id)}», а должен быть «{items_dict.get(corr_id, corr_id)}»"
                        )
                if not mismatches:
                    is_correct = True
                    message = "все этапы пайплайна расставлены в правильном порядке"
                else:
                    errors = mismatches
                    message = f"ошибок в порядке: {len(mismatches)}"

        # проверяем распределение по группам
        elif exercise_type == "grouping":
            submitted_mapping = req.submission
            items_list = payload.get("items", [])
            groups_dict = {g["id"]: g["title"] for g in payload.get("groups", [])}

            if not isinstance(submitted_mapping, dict):
                errors.append("ожидается словарь с раскиданными по группам элементами")
            else:
                mismatches = []
                for itm in items_list:
                    iid = itm["id"]
                    corr_grp = itm["correct_group"]
                    sub_grp = submitted_mapping.get(iid)
                    if sub_grp != corr_grp:
                        curr_title = groups_dict.get(sub_grp, "не распределено")
                        corr_title = groups_dict.get(corr_grp, corr_grp)
                        mismatches.append(
                            f"паттерн «{itm['text']}» лежит в «{curr_title}», а должен быть в «{corr_title}»"
                        )
                if not mismatches:
                    is_correct = True
                    message = "все паттерны правильно распределены по группам"
                else:
                    errors = mismatches
                    message = f"ошибок в группах: {len(mismatches)}"

        # проверяем регулярку
        elif exercise_type == "regex":
            raw_input = str(req.submission).strip()
            test_cases = payload.get("test_cases", [])

            # очищаем ввод от пробелов, внешних кавычек и бэктиков
            clean_pat = raw_input.strip("'`\" ").strip()

            # снимаем javascript-обертку /pattern/flags если передали в js-нотации
            js_match = re.match(r"^/(.+)/([a-z]*)$", clean_pat)
            if js_match:
                clean_pat = js_match.group(1).strip()

            # если юзер скопировал строку с двойным экранированием из json или кода, нормализуем
            clean_pat = clean_pat.replace("\\\\", "\\")

            try:
                # компилируем нормализованную регулярку
                compiled = re.compile(clean_pat)
                failed_cases = []
                # проверяем по тест-кейсам через fullmatch
                for tc in test_cases:
                    inp = tc["input"]
                    expected_match = tc["should_match"]
                    # fullmatch строго проверяет всю строку даже если юзер забыл ^ или $
                    actual_match = bool(compiled.fullmatch(inp))
                    if actual_match != expected_match:
                        status = "должно подходить, но regex не пропустил" if expected_match else "не должно подходить, но regex пропустил"
                        failed_cases.append(f"строка '{inp}': {status}")

                if not failed_cases:
                    is_correct = True
                    message = "регулярка успешно прошла все проверки"
                else:
                    errors = failed_cases
                    message = f"тестов провалено: {len(failed_cases)} из {len(test_cases)}"
            except re.error as e:
                errors.append(f"ошибка в синтаксисе регулярки: {str(e)}")
                message = "регулярка не скомпилировалась"

        # пишем результат попытки в базу
        conn.execute(
            """
            insert into exercise_attempts (user_id, exercise_id, submitted_payload, is_correct, error_details)
            values (?, ?, ?, ?, ?);
            """,
            (
                user_id,
                exercise_id,
                json.dumps(req.submission, ensure_ascii=False),
                1 if is_correct else 0,
                json.dumps(errors, ensure_ascii=False) if errors else None,
            ),
        )

        return ExerciseVerifyResult(
            is_correct=is_correct,
            score=100 if is_correct else 0,
            message=message,
            hint=hint if not is_correct else None,
            explanation=explanation,
            errors=errors,
        )
