from typing import Tuple


def calculate_grade(score: int, total: int) -> Tuple[float, str, str]:
    # если вопросов ноль, то и ловить тут нечего
    if total <= 0:
        return 0.0, "неудовлетворительно", "grade-bad"

    # считаем процент правильных ответов
    percentage = round((score / total) * 100.0, 2)

    # проверяем по шкале из методички
    # от 90% до 100% это отлично
    if percentage >= 90.0:
        grade = "отлично"
        color_class = "grade-excellent"
    # от 75% до 89.99% это хорошо
    elif percentage >= 75.0:
        grade = "хорошо"
        color_class = "grade-good"
    # от 60% до 74.99% это тройка
    elif percentage >= 60.0:
        grade = "удовлетворительно"
        color_class = "grade-satisfactory"
    # меньше 60% это двойка
    else:
        grade = "неудовлетворительно"
        color_class = "grade-bad"

    # возвращаем кортеж с процентом, текстом и css классом
    return percentage, grade, color_class
