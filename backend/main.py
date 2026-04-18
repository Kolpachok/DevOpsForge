from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager, contextmanager
import sqlite3


DATABASE = "tasks.db"


class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str  # todo, in_progress, done
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "title": "Сделать отчёт",
                    "description": "Подготовить отчёт по проекту",
                    "status": "todo",
                    "assigned_to": "Иван",
                    "created_at": "2026-04-19T12:00:00",
                    "updated_at": "2026-04-19T12:00:00",
                }
            ]
        }
    }


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Создаём таблицу tasks при старте, если её ещё нет."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                assigned_to TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            """
        )
        conn.commit()


# Lifespan вместо старого @app.on_event("startup")
@asynccontextmanager
async def lifespan(app: FastAPI):
    # при старте приложения
    init_db()
    yield
    # при завершении (опционально)


app = FastAPI(
    title="Kanban задачи API",
    description="REST API для Kanban‑доски задач",
    lifespan=lifespan
)


@app.get("/tasks", response_model=list[Task])
def get_tasks():
    """Получить все задачи из базы данных."""
    with get_db() as conn:
        result = conn.execute("SELECT * FROM tasks ORDER BY id")
        rows = result.fetchall()
        return [dict(row) for row in rows]


@app.post(
    "/tasks",
    response_model=Task,
    summary="Создать новую задачу",
    description="Создаёт задачу с указанным названием, статусом и исполнителем. "
                "Поле id, created_at, updated_at создаются автоматически.",
)
def create_task(title: str, status: str = "todo", assigned_to: Optional[str] = None):
    """Добавить новую задачу в базу данных."""
    if status not in ["todo", "in_progress", "done"]:
        raise HTTPException(status_code=422, detail="Недопустимый статус")

    with get_db() as conn:
        cur = conn.cursor()
        now = datetime.now()
        cur.execute(
            """
            INSERT INTO tasks (
                title,
                description,
                status,
                assigned_to,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, "Описание задачи", status, assigned_to, now, now)
        )
        task_id = cur.lastrowid
        conn.commit()
        return {
            "id": task_id,
            "title": title,
            "description": "Описание задачи",
            "status": status,
            "assigned_to": assigned_to,
            "created_at": now,
            "updated_at": now,
        }


@app.put("/tasks/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
):
    """Обновить задачу по id."""
    if status and status not in ["todo", "in_progress", "done"]:
        raise HTTPException(status_code=422, detail="Недопустимый статус")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Задача не найдена")

        old = dict(row)
        updated = {
            "title": title or old["title"],
            "description": description or old["description"],
            "status": status or old["status"],
            "assigned_to": assigned_to or old["assigned_to"],
            "created_at": old["created_at"],
            "updated_at": datetime.now(),
        }

        cur.execute(
            """
            UPDATE tasks SET
                title = ?,
                description = ?,
                status = ?,
                assigned_to = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                updated["title"],
                updated["description"],
                updated["status"],
                updated["assigned_to"],
                updated["updated_at"],
                task_id,
            ),
        )
        conn.commit()
        return updated


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    """Удалить задачу по id."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Задача не найдена")

        cur.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
    return {"ok": True, "message": f"Задача {task_id} удалена"}