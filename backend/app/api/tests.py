import random
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from backend.app.database.connection import get_db
from backend.app.api.auth import get_current_user_id
from backend.app.core.grading import calculate_grade
from backend.app.models.schemas import (
    TestSessionStartOut,
    TestQuestionOut,
    TestOptionOut,
    TestSubmitRequest,
    TestResultOut,
    QuestionResultDetail,
)

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("/{pool_id}/start", response_model=TestSessionStartOut)
def start_test_session(pool_id: int):
    # начинаем сессию: берем 10 рандомных вопросов из 20 без повторов
    with get_db() as conn:
        pool = conn.execute(
            "select id, title, time_limit_seconds, questions_to_ask from test_pools where id = ?",
            (pool_id,),
        ).fetchone()

        if not pool:
            raise HTTPException(status_code=404, detail="пул тестирования не найден")

        # вытаскиваем все доступные вопросы
        all_questions = conn.execute(
            "select id, question_text from test_questions where pool_id = ?",
            (pool_id,),
        ).fetchall()

        if len(all_questions) < pool["questions_to_ask"]:
            raise HTTPException(
                status_code=500,
                detail=f"мало вопросов в базе, надо {pool['questions_to_ask']}, а есть {len(all_questions)}",
            )

        # рандомим ровно 10 вопросов без дублей
        selected_questions = random.sample(all_questions, pool["questions_to_ask"])
        question_ids = [q["id"] for q in selected_questions]

        # вытаскиваем варианты ответов под эти 10 вопросов
        placeholders = ",".join("?" for _ in question_ids)
        options_rows = conn.execute(
            f"""
            select id, question_id, option_text 
            from test_options 
            where question_id in ({placeholders})
            """,
            question_ids,
        ).fetchall()

        # группируем варианты по id вопроса
        options_by_q = {qid: [] for qid in question_ids}
        for opt in options_rows:
            options_by_q[opt["question_id"]].append(
                TestOptionOut(id=opt["id"], option_text=opt["option_text"], order_index=0)
            )

        # перемешиваем варианты ответов внутри каждого вопроса
        result_questions = []
        for q in selected_questions:
            opts = options_by_q.get(q["id"], [])
            random.shuffle(opts)
            for idx, opt in enumerate(opts, start=1):
                opt.order_index = idx

            result_questions.append(
                TestQuestionOut(
                    id=q["id"],
                    question_text=q["question_text"],
                    options=opts,
                )
            )

        return TestSessionStartOut(
            pool_id=pool["id"],
            title=pool["title"],
            time_limit_seconds=pool["time_limit_seconds"],
            total_questions=len(result_questions),
            questions=result_questions,
        )


@router.post("/{pool_id}/submit", response_model=TestResultOut)
def submit_test(pool_id: int, req: TestSubmitRequest):
    # проверяем присланные ответы и считаем баллы
    user_id = get_current_user_id()
    if not req.answers:
        raise HTTPException(status_code=400, detail="нет ответов")

    with get_db() as conn:
        pool = conn.execute(
            "select id, title from test_pools where id = ?", (pool_id,)
        ).fetchone()
        if not pool:
            raise HTTPException(status_code=404, detail="пул тестирования не найден")

        submitted_qids = [a.question_id for a in req.answers]
        placeholders = ",".join("?" for _ in submitted_qids)

        # достаем сами вопросы и их пояснения
        q_rows = conn.execute(
            f"""
            select id, question_text, explanation 
            from test_questions 
            where id in ({placeholders})
            """,
            submitted_qids,
        ).fetchall()
        q_map = {r["id"]: r for r in q_rows}

        # достаем правильные ответы из базы
        correct_options = conn.execute(
            f"""
            select id, question_id 
            from test_options 
            where question_id in ({placeholders}) and is_correct = 1
            """,
            submitted_qids,
        ).fetchall()
        correct_map = {row["question_id"]: row["id"] for row in correct_options}

        # сверяем каждый ответ
        score = 0
        details = []
        for ans in req.answers:
            qid = ans.question_id
            selected_opt = ans.selected_option_id
            correct_opt = correct_map.get(qid)
            is_correct = bool(selected_opt is not None and selected_opt == correct_opt)

            if is_correct:
                score += 1

            details.append(
                QuestionResultDetail(
                    question_id=qid,
                    question_text=q_map[qid]["question_text"],
                    selected_option_id=selected_opt,
                    correct_option_id=correct_opt if correct_opt else 0,
                    is_correct=is_correct,
                    explanation=q_map[qid]["explanation"],
                )
            )

        # считаем процент и оценку
        total_questions = len(req.answers)
        percentage, grade, color_class = calculate_grade(score, total_questions)

        # пишем попытку в базу
        cursor = conn.execute(
            """
            insert into test_attempts 
                (user_id, pool_id, score, total_questions, percentage, grade, duration_seconds)
            values (?, ?, ?, ?, ?, ?, ?);
            """,
            (
                user_id,
                pool_id,
                score,
                total_questions,
                percentage,
                grade,
                req.duration_seconds,
            ),
        )
        attempt_id = cursor.lastrowid

        # пишем детали по каждому вопросу
        for d in details:
            conn.execute(
                """
                insert into test_attempt_answers (attempt_id, question_id, selected_option_id, is_correct)
                values (?, ?, ?, ?);
                """,
                (attempt_id, d.question_id, d.selected_option_id, 1 if d.is_correct else 0),
            )

        return TestResultOut(
            attempt_id=attempt_id,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            grade=grade,
            color_class=color_class,
            duration_seconds=req.duration_seconds,
            details=details,
        )


@router.get("/attempts/history")
def get_user_attempts():
    # история сдачи тестов
    user_id = get_current_user_id()
    with get_db() as conn:
        rows = conn.execute(
            """
            select a.id, a.score, a.total_questions, a.percentage, a.grade, 
                   a.duration_seconds, a.completed_at, p.title as pool_title
            from test_attempts a
            join test_pools p on a.pool_id = p.id
            where a.user_id = ?
            order by a.completed_at desc;
            """,
            (user_id,),
        ).fetchall()
        return rows
