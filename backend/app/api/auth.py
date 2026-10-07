from fastapi import APIRouter, HTTPException
from backend.app.database.connection import get_db
from backend.app.models.schemas import UserOut, RoleSwitchRequest

router = APIRouter(prefix="/auth", tags=["auth"])

# храним id активного пользователя прямо в памяти стенда
current_user_state = {"user_id": 1}


def get_current_user_id() -> int:
    # отдаем id текущего активного юзера
    return current_user_state["user_id"]


@router.get("/me", response_model=UserOut)
def get_current_user():
    # достаем данные активного юзера из базы
    uid = get_current_user_id()
    with get_db() as conn:
        # цепляем роль чтобы фронт знал студент это или препод
        row = conn.execute(
            """
            select u.id, u.username, u.email, u.full_name, r.name as role_name, u.role_id
            from users u
            join roles r on u.role_id = r.id
            where u.id = ?
            """,
            (uid,),
        ).fetchone()

        # если юзера нет то 404
        if not row:
            raise HTTPException(status_code=404, detail="пользователь не найден")
        return row


@router.post("/switch-role", response_model=UserOut)
def switch_active_role(req: RoleSwitchRequest):
    # переключаем роль на лету чтобы удобно было тестировать
    target_role = req.role_name.lower().strip()
    if target_role not in ("student", "teacher"):
        raise HTTPException(
            status_code=400,
            detail="роль может быть только student или teacher",
        )

    # находим подходящего тестового пользователя с такой ролью
    with get_db() as conn:
        user_row = conn.execute(
            """
            select u.id, u.username, u.email, u.full_name, r.name as role_name, u.role_id
            from users u
            join roles r on u.role_id = r.id
            where r.name = ?
            limit 1
            """,
            (target_role,),
        ).fetchone()

        if not user_row:
            raise HTTPException(
                status_code=404,
                detail=f"пользователь с ролью {target_role} не найден",
            )

        # сохраняем в текущее состояние
        current_user_state["user_id"] = user_row["id"]
        return user_row
