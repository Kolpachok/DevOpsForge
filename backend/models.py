from enum import Enum
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class СтатусЗадачи(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"

class Задача(BaseModel):
    id: int
    title: str          # Название задачи
    description: Optional[str] = None  # Описание (необязательно)
    status: СтатусЗадачи  # Статус задачи
    assigned_to: str    # Кому назначено
    created_at: datetime  # Когда создана
    updated_at: datetime  # Когда обновлена