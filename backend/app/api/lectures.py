from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.database.connection import get_db
from backend.app.api.auth import get_current_user_id
from backend.app.models.schemas import (
    LectureListItem,
    LectureDetail,
    LectureCreateUpdate,
    ProgressUpdateRequest,
    TopicOut,
)

router = APIRouter(prefix="/lectures", tags=["lectures"])


@router.get("/topics", response_model=List[TopicOut])
def get_topics():
    # достаем все темы по порядку
    with get_db() as conn:
        rows = conn.execute(
            "select id, title, description, order_index from topics order by order_index asc;"
        ).fetchall()
        return rows


@router.get("", response_model=List[LectureListItem])
def list_lectures(
    topic_id: Optional[int] = Query(None, description="фильтр по теме"),
    search: Optional[str] = Query(None, description="поиск по названию"),
):
    # достаем список лекций сразу с прогрессом текущего студента
    user_id = get_current_user_id()
    query = """
        select 
            l.id, l.topic_id, t.title as topic_title, l.title,
            l.content_type, l.reading_time_minutes, l.media_url, l.attachment_name,
            coalesce(lp.is_visited, 0) as is_visited,
            coalesce(lp.time_spent_seconds, 0) as time_spent_seconds,
            coalesce(lp.is_completed, 0) as is_completed
        from lectures l
        join topics t on l.topic_id = t.id
        left join lecture_progress lp on lp.lecture_id = l.id and lp.user_id = ?
        where 1=1
    """
    params = [user_id]

    # фильтруем по теме если передали
    if topic_id is not None:
        query += " and l.topic_id = ?"
        params.append(topic_id)

    # ищем по ключевым словам если передали строку поиска
    if search:
        query += " and l.title like ?"
        params.append(f"%{search.strip()}%")

    query += " order by l.order_index asc, l.id asc;"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        # преобразуем 0 и 1 в булевы флаги
        result = []
        for r in rows:
            result.append(
                {
                    **r,
                    "is_visited": bool(r["is_visited"]),
                    "is_completed": bool(r["is_completed"]),
                }
            )
        return result


@router.get("/{lecture_id}", response_model=LectureDetail)
def get_lecture(lecture_id: int):
    # открываем конкретную лекцию и сразу метим ее посещенной
    user_id = get_current_user_id()
    with get_db() as conn:
        row = conn.execute(
            """
            select 
                l.id, l.topic_id, t.title as topic_title, l.title,
                l.content_type, l.content, l.reading_time_minutes,
                l.media_url, l.attachment_name,
                coalesce(lp.is_visited, 0) as is_visited,
                coalesce(lp.time_spent_seconds, 0) as time_spent_seconds,
                coalesce(lp.is_completed, 0) as is_completed
            from lectures l
            join topics t on l.topic_id = t.id
            left join lecture_progress lp on lp.lecture_id = l.id and lp.user_id = ?
            where l.id = ?
            """,
            (user_id, lecture_id),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="лекция не найдена")

        # отмечаем в базе что пользователь зашел на страницу
        conn.execute(
            """
            insert into lecture_progress (user_id, lecture_id, is_visited, time_spent_seconds, is_completed, last_visited_at)
            values (?, ?, 1, 0, 0, current_timestamp)
            on conflict(user_id, lecture_id) do update set
                is_visited = 1,
                last_visited_at = current_timestamp;
            """,
            (user_id, lecture_id),
        )

        return {
            **row,
            "is_visited": True,
            "is_completed": bool(row["is_completed"]),
        }


@router.post("/{lecture_id}/progress")
def update_lecture_progress(lecture_id: int, req: ProgressUpdateRequest):
    # фронт шлет пинги пока вкладка открыта и мы накручиваем секунды
    user_id = get_current_user_id()
    with get_db() as conn:
        lecture_check = conn.execute(
            "select id from lectures where id = ?", (lecture_id,)
        ).fetchone()
        if not lecture_check:
            raise HTTPException(status_code=404, detail="лекция не найдена")

        # инкрементим таймер и сохраняем статус завершения
        conn.execute(
            """
            insert into lecture_progress (user_id, lecture_id, is_visited, time_spent_seconds, is_completed, last_visited_at)
            values (?, ?, 1, ?, coalesce(?, 0), current_timestamp)
            on conflict(user_id, lecture_id) do update set
                is_visited = 1,
                time_spent_seconds = time_spent_seconds + ?,
                is_completed = case 
                    when ? is not null then ? 
                    else is_completed 
                end,
                last_visited_at = current_timestamp;
            """,
            (
                user_id,
                lecture_id,
                req.additional_seconds,
                1 if req.mark_completed else 0,
                req.additional_seconds,
                1 if req.mark_completed is not None else None,
                1 if req.mark_completed else 0,
            ),
        )

        # читаем свежее значение чтобы вернуть на фронт
        curr = conn.execute(
            "select is_visited, time_spent_seconds, is_completed from lecture_progress where user_id = ? and lecture_id = ?",
            (user_id, lecture_id),
        ).fetchone()

        return {
            "status": "success",
            "lecture_id": lecture_id,
            "is_visited": bool(curr["is_visited"]),
            "time_spent_seconds": curr["time_spent_seconds"],
            "is_completed": bool(curr["is_completed"]),
        }


@router.post("", response_model=LectureDetail, status_code=201)
def create_lecture(req: LectureCreateUpdate):
    # создание лекции для роли преподавателя
    with get_db() as conn:
        cursor = conn.execute(
            """
            insert into lectures (topic_id, title, content_type, content, media_url, attachment_name, reading_time_minutes)
            values (?, ?, ?, ?, ?, ?, ?);
            """,
            (
                req.topic_id,
                req.title,
                req.content_type,
                req.content,
                req.media_url,
                req.attachment_name,
                req.reading_time_minutes,
            ),
        )
        new_id = cursor.lastrowid
        return get_lecture(new_id)


@router.put("/{lecture_id}", response_model=LectureDetail)
def update_lecture(lecture_id: int, req: LectureCreateUpdate):
    # обновление лекции
    with get_db() as conn:
        row = conn.execute("select id from lectures where id = ?", (lecture_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="лекция не найдена")

        conn.execute(
            """
            update lectures 
            set topic_id = ?, title = ?, content_type = ?, content = ?,
                media_url = ?, attachment_name = ?, reading_time_minutes = ?
            where id = ?;
            """,
            (
                req.topic_id,
                req.title,
                req.content_type,
                req.content,
                req.media_url,
                req.attachment_name,
                req.reading_time_minutes,
                lecture_id,
            ),
        )
        return get_lecture(lecture_id)


@router.delete("/{lecture_id}")
def delete_lecture(lecture_id: int):
    # удаление лекции
    with get_db() as conn:
        row = conn.execute("select id from lectures where id = ?", (lecture_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="лекция не найдена")

        conn.execute("delete from lectures where id = ?", (lecture_id,))
        return {"status": "success", "message": f"лекция #{lecture_id} удалена"}
