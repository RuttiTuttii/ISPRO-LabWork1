from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# схема пользователя для фронта
class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role_name: str
    role_id: int


# запрос на смену роли между студентом и преподом
class RoleSwitchRequest(BaseModel):
    role_name: str = Field(..., description="student или teacher")


# тема лекций
class TopicOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    order_index: int


# краткая карточка лекции в списке
class LectureListItem(BaseModel):
    id: int
    topic_id: int
    topic_title: str
    title: str
    content_type: str
    reading_time_minutes: int
    media_url: Optional[str] = None
    attachment_name: Optional[str] = None
    is_visited: bool = False
    time_spent_seconds: int = 0
    is_completed: bool = False


# полная лекция с содержимым и прогрессом
class LectureDetail(BaseModel):
    id: int
    topic_id: int
    topic_title: str
    title: str
    content_type: str
    content: str
    reading_time_minutes: int
    media_url: Optional[str] = None
    attachment_name: Optional[str] = None
    is_visited: bool = False
    time_spent_seconds: int = 0
    is_completed: bool = False


# данные для создания и обновления лекции
class LectureCreateUpdate(BaseModel):
    topic_id: int
    title: str
    content_type: str = "html"
    content: str
    media_url: Optional[str] = None
    attachment_name: Optional[str] = None
    reading_time_minutes: int = 5


# обновление счетчика секунд на странице
class ProgressUpdateRequest(BaseModel):
    additional_seconds: int = Field(default=5, ge=0)
    mark_completed: Optional[bool] = None


# вариант ответа в вопросе
class TestOptionOut(BaseModel):
    id: int
    option_text: str
    order_index: int


# вопрос теста со скрытым правильным ответом
class TestQuestionOut(BaseModel):
    id: int
    question_text: str
    options: List[TestOptionOut]


# сессия старта теста с рандомными вопросами
class TestSessionStartOut(BaseModel):
    pool_id: int
    title: str
    time_limit_seconds: int
    total_questions: int
    questions: List[TestQuestionOut]


# один выбранный ответ на вопрос
class AnswerSubmission(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None


# отправка всего теста на проверку
class TestSubmitRequest(BaseModel):
    duration_seconds: int = 0
    answers: List[AnswerSubmission]


# разбор правильности по каждому вопросу
class QuestionResultDetail(BaseModel):
    question_id: int
    question_text: str
    selected_option_id: Optional[int]
    correct_option_id: int
    is_correct: bool
    explanation: Optional[str]


# итоговый результат теста с оценкой
class TestResultOut(BaseModel):
    attempt_id: int
    score: int
    total_questions: int
    percentage: float
    grade: str
    color_class: str
    duration_seconds: int
    details: List[QuestionResultDetail]


# элемент списка интерактива
class ExerciseListItem(BaseModel):
    id: int
    topic_id: int
    exercise_type: str
    title: str
    description: str
    instruction: str
    order_index: int


# полные данные интерактивного задания
class ExerciseDetail(BaseModel):
    id: int
    topic_id: int
    exercise_type: str
    title: str
    description: str
    instruction: str
    payload: Dict[str, Any]
    user_status: Optional[Dict[str, Any]] = None


# ответ на интерактивное задание
class ExerciseVerifyRequest(BaseModel):
    submission: Any = Field(..., description="ответ юзера")


# вердикт проверки интерактива
class ExerciseVerifyResult(BaseModel):
    is_correct: bool
    score: int
    message: str
    hint: Optional[str] = None
    explanation: Optional[str] = None
    errors: List[str] = []
