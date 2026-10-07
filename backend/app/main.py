import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.database.connection import init_db
from backend.app.api.auth import router as auth_router
from backend.app.api.lectures import router as lectures_router
from backend.app.api.tests import router as tests_router
from backend.app.api.exercises import router as exercises_router

# определяем пути к папкам проекта
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dir = os.path.join(project_root, "frontend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # при старте сервера проверяем базу и накатываем сиды если пусто
    init_db(force_reseed=False)
    yield


# собираем приложение fastapi
app = FastAPI(
    title="ИС Обучения и Тестирования",
    version="1.0.0",
    lifespan=lifespan,
)

# настраиваем cors чтобы фронт спокойно стучался
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# подключаем роутеры по модулям
app.include_router(auth_router, prefix="/api")
app.include_router(lectures_router, prefix="/api")
app.include_router(tests_router, prefix="/api")
app.include_router(exercises_router, prefix="/api")

# раздаем статику фронта
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    async def serve_index():
        # отдаем главную страницу
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"status": "frontend in progress"}


@app.get("/api/health")
def health_check():
    # простая ручка проверки доступности
    return {"status": "ok", "app": "ISPRO-LabWork1"}
