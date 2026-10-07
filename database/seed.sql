-- базовые роли пользователей
insert into roles (id, name, description) values
(1, 'student', 'студент: учит лекции, сдает тесты, делает интерактив'),
(2, 'teacher', 'преподаватель: смотрит успеваемость и рулит контентом');

-- пользователи по умолчанию
insert into users (id, role_id, username, email, password_hash, full_name) values
(1, 1, 'egor_radin', 'radin.egor@edu.ru', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Радин Егор Дмитриевич'),
(2, 2, 'sergey_petrov', 'petrov.si@college.ru', '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb', 'Петров Сергей Иванович');

-- темы учебного каталога
insert into topics (id, title, description, order_index) values
(1, 'Архитектура и структура современного ПО', 'базовые принципы декомпозиции кодовой базы и разделения слоев', 1),
(2, 'Проектирование баз данных и ORM', 'реляционные схемы, нормализация, транзакции и оптимизация доступа к данным', 2),
(3, 'Жизненный цикл разработки и CI/CD', 'пайплайны сборки, автоматизация тестов и доставка релизов', 3),
(4, 'Тестирование и обеспечение качества ПО', 'пирамида тестирования, модульные и интеграционные проверки', 4);

-- расширенный каталог лекционных материалов
insert into lectures (id, topic_id, title, content_type, content, media_url, attachment_name, reading_time_minutes, order_index) values
(1, 1, 'Структура проекта: от монолита к чистой архитектуре', 'html', 
'<article class="lecture-body">
    <h3>1. Понятие структуры программного проекта</h3>
    <p>Структура проекта определяет организацию файлов, модулей и границы ответственности в кодовой базе:</p>
    <ul>
        <li><strong>Low Coupling (низкая связность):</strong> модули слабо зависят от внутренней реализации друг друга;</li>
        <li><strong>High Cohesion (высокая связность):</strong> классы внутри модуля решают строго одну задачу;</li>
        <li><strong>Изоляция ядра:</strong> правила бизнеса не зависят от базы данных и внешних веб-фреймворков.</li>
    </ul>

    <h3>2. Сравнение архитектурных подходов</h3>
    <table class="minimal-table">
        <thead>
            <tr>
                <th>Архитектурный стиль</th>
                <th>Преимущества</th>
                <th>Сложности и риски</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Слоистый монолит</strong></td>
                <td>быстрый старт и простота локальной отладки</td>
                <td>риск превращения в Big Ball of Mud</td>
            </tr>
            <tr>
                <td><strong>Чистая архитектура</strong></td>
                <td>бизнес-логика полностью независима от СУБД и UI</td>
                <td>больше шаблонных классов и DTO</td>
            </tr>
            <tr>
                <td><strong>Микросервисы</strong></td>
                <td>независимое масштабирование сервисов командами</td>
                <td>накладные расходы на сетевые вызовы и оркестрацию</td>
            </tr>
        </tbody>
    </table>

    <h3>3. Принцип инверсии зависимостей (DIP)</h3>
    <p>Бизнес-логика оперирует интерфейсами-репозиториями, а конкретные реализации на SQL или NoSQL подключаются снаружи через механизмы внедрения зависимостей.</p>
</article>',
null, 'Metodichka_Arch_Part1.pdf', 8, 1),

(2, 1, 'Паттерны проектирования GoF в архитектуре приложений', 'html',
'<article class="lecture-body">
    <h3>Классификация паттернов банды четырех (GoF)</h3>
    <p>Шаблоны проектирования делятся на три базовые категории:</p>
    
    <div class="pattern-cards">
        <div class="pattern-box">
            <h4>1. Порождающие</h4>
            <p>гибкое создание объектов без привязки к конкретным классам:</p>
            <ul>
                <li><code>Singleton</code> — гарантирует единственный экземпляр;</li>
                <li><code>Factory Method</code> — делегирует создание наследникам;</li>
                <li><code>Builder</code> — пошагово собирает сложные структуры.</li>
            </ul>
        </div>
        <div class="pattern-box">
            <h4>2. Структурные</h4>
            <p>компоновка объектов в устойчивые системы:</p>
            <ul>
                <li><code>Adapter</code> — стыкует несовместимые интерфейсы;</li>
                <li><code>Decorator</code> — динамически расширяет функциональность;</li>
                <li><code>Facade</code> — предоставляет простой фасад к сложной подсистеме.</li>
            </ul>
        </div>
        <div class="pattern-box">
            <h4>3. Поведенческие</h4>
            <p>алгоритмы взаимодействия и распределение обязанностей:</p>
            <ul>
                <li><code>Observer</code> — уведомляет подписчиков о событиях;</li>
                <li><code>Strategy</code> — инкапсулирует взаимозаменяемые алгоритмы;</li>
                <li><code>Command</code> — упаковывает запрос в самостоятельный объект.</li>
            </ul>
        </div>
    </div>
</article>',
'https://www.youtube.com/embed/dQw4w9WgXcQ', 'GoF_Patterns_Cheatsheet.pdf', 12, 2),

(3, 1, 'Принципы SOLID и модульная декомпозиция', 'html',
'<article class="lecture-body">
    <h3>Практическое применение принципов SOLID</h3>
    <p>Качественная структура проекта базируется на пяти ключевых правилах проектирования:</p>
    <ul>
        <li><strong>S (Single Responsibility):</strong> один класс отвечает за один аспект системы;</li>
        <li><strong>O (Open-Closed):</strong> модули открыты для расширения, но закрыты для модификации;</li>
        <li><strong>L (Liskov Substitution):</strong> подклассы обязаны сохранять поведение базового типа;</li>
        <li><strong>I (Interface Segregation):</strong> мелкие целевые интерфейсы лучше одного раздутого;</li>
        <li><strong>D (Dependency Inversion):</strong> зависимость от абстракций, а не от деталей.</li>
    </ul>
</article>',
null, 'SOLID_Principles_Guide.pdf', 10, 3),

(4, 2, 'Реляционное моделирование и нормальные формы', 'html',
'<article class="lecture-body">
    <h3>Проектирование схемы базы данных</h3>
    <p>Основой серверной архитектуры является правильно спроектированная база данных:</p>
    <ul>
        <li><strong>1NF:</strong> атомарность атрибутов и отсутствие повторяющихся групп;</li>
        <li><strong>2NF:</strong> полная функциональная зависимость неключевых полей от первичного ключа;</li>
        <li><strong>3NF:</strong> устранение транзитивных зависимостей между неключевыми атрибутами.</li>
    </ul>
    <p>Использование внешних ключей с директивой <code>ON DELETE CASCADE</code> гарантирует ссылочную целостность данных при удалении сущностей верхнего уровня.</p>
</article>',
null, 'DB_Normalization_Reference.pdf', 7, 1),

(5, 2, 'Паттерны Data Mapper, Active Record и Repository', 'html',
'<article class="lecture-body">
    <h3>Сравнение подходов к организации слоя доступа к данным</h3>
    <p>При организации доступа к базе данных применяются разные уровни абстракции:</p>
    <ul>
        <li><strong>Active Record:</strong> объект инкапсулирует как данные строки, так и методы сохранения в БД;</li>
        <li><strong>Data Mapper / ORM:</strong> полная изоляция доменной модели от схемы реляционных таблиц;</li>
        <li><strong>Repository:</strong> коллекцие-подобный интерфейс для поиска и фильтрации доменных объектов.</li>
    </ul>
</article>',
null, 'ORM_Patterns_Summary.docx', 9, 2),

(6, 3, 'Автоматизация CI/CD пайплайнов и сборка артефактов', 'markdown',
'# Непрерывная интеграция и доставка (CI/CD)

В структурированных проектах каждый коммит автоматически верифицируется конвейером:
1. Линтер и форматирование кода.
2. Юнит-тесты с подсчетом покрытия.
3. Сборка контейнеров Docker и wheel-пакетов.
4. Прогон интеграционных тестов.
5. Автоматическая поставка в прод.
',
null, 'CI_CD_Best_Practices.docx', 6, 1),

(7, 3, 'Контейнеризация сервисов и организация окружений', 'html',
'<article class="lecture-body">
    <h3>Изоляция приложений через Docker</h3>
    <p>Многоэтапная сборка (Multi-stage build) позволяет разделить среду компиляции и релизный легковесный образ, уменьшая размер дистрибутива и закрывая векторы уязвимостей.</p>
</article>',
null, 'Docker_Multistage_Cheat.pdf', 8, 2),

(8, 4, 'Пирамида тестирования и модульные проверки', 'html',
'<article class="lecture-body">
    <h3>Уровни проверки качества программного кода</h3>
    <p>Рациональная стратегия тестирования строится по принципу пирамиды:</p>
    <ul>
        <li><strong>Unit-тесты (основание пирамиды):</strong> сотни быстрых тестов отдельных функций и методов;</li>
        <li><strong>Интеграционные тесты (середина):</strong> проверка связки сервисов с базой данных и очередями;</li>
        <li><strong>E2E / Сквозные тесты (вершина):</strong> полная проверка пользовательских сценариев через интерфейс.</li>
    </ul>
</article>',
null, 'Testing_Pyramid_Notes.pdf', 8, 1);

-- начальный прогресс студента
insert into lecture_progress (user_id, lecture_id, is_visited, time_spent_seconds, is_completed) values
(1, 1, 1, 370, 1),
(1, 2, 1, 120, 0),
(1, 4, 1, 95, 0);

-- пул вопросов
insert into test_pools (id, topic_id, title, description, time_limit_seconds, total_pool_size, questions_to_ask) values
(1, 1, 'Контрольный тест: Архитектура и структура ПО', 
 'тест по принципам декомпозиции и паттернам. выбирается 10 вопросов из 20, 4 варианта, таймер 10 минут.', 
 600, 20, 10);

-- банк из 20 вопросов с вариантами
insert into test_questions (id, pool_id, question_text, explanation) values
(1, 1, 'Что такое «структура проекта» при разработке ПО?', 'структура определяет как разложены файлы, модули и как они друг от друга зависят');
insert into test_options (question_id, option_text, is_correct, order_index) values
(1, 'логическая и физическая организация файлов, модулей и зависимостей в кодовой базе', 1, 1),
(1, 'просто цветовая тема в VS Code', 0, 2),
(1, 'список установленных программ на компе', 0, 3),
(1, 'вес скомпилированного экзешника на диске', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(2, 1, 'Какой принцип нарушается если бизнес-логика напрямую строчит SQL в базу?', 'нарушается DIP и SRP, логика жестко завязывается на конкретную СУБД');
insert into test_options (question_id, option_text, is_correct, order_index) values
(2, 'принцип единственной ответственности (SRP) и инверсии зависимостей (DIP)', 1, 1),
(2, 'принцип полиморфизма', 0, 2),
(2, 'наследование интерфейсов', 0, 3),
(2, 'инкапсуляция строк', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(3, 1, 'К какому типу паттернов относится Builder?', 'строитель пошагово создает сложный объект, поэтому он порождающий');
insert into test_options (question_id, option_text, is_correct, order_index) values
(3, 'порождающие паттерны (Creational)', 1, 1),
(3, 'структурные паттерны (Structural)', 0, 2),
(3, 'поведенческие паттерны (Behavioral)', 0, 3),
(3, 'паттерны работы с сетью', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(4, 1, 'Зачем нужен паттерн Adapter?', 'адаптер оборачивает несовместимый интерфейс чтобы подружить его с нужным');
insert into test_options (question_id, option_text, is_correct, order_index) values
(4, 'обеспечивает совместную работу классов с несовместимыми интерфейсами', 1, 1),
(4, 'гарантирует единственный экземпляр класса', 0, 2),
(4, 'кэширует сетевые запросы', 0, 3),
(4, 'шифрует пароли', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(5, 1, 'Что значит High Cohesion (высокая связность модуля)?', 'высокая связность означает что код модуля сфокусирован на одной задаче');
insert into test_options (question_id, option_text, is_correct, order_index) values
(5, 'элементы модуля решают единую узкую задачу и логически неразделимы', 1, 1),
(5, 'модуль тянет за собой максимум сторонних либ', 0, 2),
(5, 'код написан на трех языках сразу', 0, 3),
(5, 'в классе больше тысячи строк кода', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(6, 1, 'Главное правило зависимостей в Clean Architecture?', 'зависимости должны смотреть только внутрь к бизнес-правилам');
insert into test_options (question_id, option_text, is_correct, order_index) values
(6, 'зависимости исходного кода должны быть направлены только внутрь, к бизнес-правилам', 1, 1),
(6, 'бизнес-логика обязана зависеть от ORM и SQL', 0, 2),
(6, 'все классы наследуются от одного родителя', 0, 3),
(6, 'интерфейс генерируется базой данных', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(7, 1, 'Что такое DTO (Data Transfer Object)?', 'простая структура без логики чисто для перегонки данных между слоями');
insert into test_options (question_id, option_text, is_correct, order_index) values
(7, 'объект-контейнер без поведения для передачи данных между слоями', 1, 1),
(7, 'драйвер прямого подключения к базе', 0, 2),
(7, 'конфиг для nginx', 0, 3),
(7, 'генератор токенов', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(8, 1, 'Какой паттерн уведомляет кучу подписчиков об изменениях?', 'наблюдатель (Observer) как раз этим и занимается');
insert into test_options (question_id, option_text, is_correct, order_index) values
(8, 'наблюдатель (Observer)', 1, 1),
(8, 'одиночка (Singleton)', 0, 2),
(8, 'фасад (Facade)', 0, 3),
(8, 'прототип (Prototype)', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(9, 1, 'Чем опасен «большой комок грязи» (Big Ball of Mud)?', 'все путается, появляются циклические зависимости и любой фикс ломает полсистемы');
insert into test_options (question_id, option_text, is_correct, order_index) values
(9, 'появление циклических зависимостей, багов и невозможность изолированного тестирования', 1, 1),
(9, 'слишком быстрая компиляция кода', 0, 2),
(9, 'система сама удаляет файлы', 0, 3),
(9, 'редактор не открывает проект', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(10, 1, 'Зачем обычно заводят папку core или common?', 'туда кладут общие конфиги, хелперы, типы и базовые утилиты');
insert into test_options (question_id, option_text, is_correct, order_index) values
(10, 'для глобальных настроек, общих типов и утилит безопасности', 1, 1),
(10, 'только для кэша браузера', 0, 2),
(10, 'для исходников линукса', 0, 3),
(10, 'для скомпилированных драйверов', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(11, 1, 'Что из этого относится к поведенческим паттернам?', 'стратегия позволяет менять алгоритм на лету');
insert into test_options (question_id, option_text, is_correct, order_index) values
(11, 'стратегия (Strategy)', 1, 1),
(11, 'фабричный метод (Factory Method)', 0, 2),
(11, 'декоратор (Decorator)', 0, 3),
(11, 'компоновщик (Composite)', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(12, 1, 'Что означает принцип DRY?', 'не дублируй логику, выноси общее в переиспользуемые места');
insert into test_options (question_id, option_text, is_correct, order_index) values
(12, 'каждый фрагмент знания должен иметь единственное представление в системе', 1, 1),
(12, 'нельзя использовать циклы в коде', 0, 2),
(12, 'копируй код везде чтобы модули были независимы', 0, 3),
(12, 'пиши каждый класс на двух языках', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(13, 1, 'Зачем нужен паттерн Repository?', 'репозиторий прячет конкретные запросы к базе за удобными методами get/save');
insert into test_options (question_id, option_text, is_correct, order_index) values
(13, 'инкапсулирует работу с данными, изолируя логику от конкретной СУБД', 1, 1),
(13, 'рисует html страницы в браузере', 0, 2),
(13, 'делает анимации кнопок', 0, 3),
(13, 'поднимает git сервер', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(14, 1, 'Что такое Dependency Injection (внедрение зависимостей)?', 'зависимости прокидываются снаружи в конструктор или метод, а не создаются через new');
insert into test_options (question_id, option_text, is_correct, order_index) values
(14, 'передача сервисов объекту снаружи вместо их жесткого создания через new', 1, 1),
(14, 'установка плагинов в браузер', 0, 2),
(14, 'инъекция вредоносного кода', 0, 3),
(14, 'скачивание пакетов без интернета', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(15, 1, 'В каких файлах в python фиксируют зависимости?', 'зависимости пишут в requirements.txt или pyproject.toml');
insert into test_options (question_id, option_text, is_correct, order_index) values
(15, 'requirements.txt или pyproject.toml', 1, 1),
(15, 'package.config.exe', 0, 2),
(15, 'system32.dll', 0, 3),
(15, 'dependencies.docx', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(16, 1, 'Что такое миграция базы данных?', 'миграция это версионированный скрипт изменения схемы таблиц');
insert into test_options (question_id, option_text, is_correct, order_index) values
(16, 'скрипт контролируемого накатывания или отката изменений структуры БД', 1, 1),
(16, 'перевозка серверов в другой город', 0, 2),
(16, 'удаление базы при сбое питания', 0, 3),
(16, 'переход на блокнот вместо sql', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(17, 1, 'За что отвечает контроллер в схеме MVC?', 'контроллер принимает входящий запрос от пользователя, дергает модель и отдает ответ');
insert into test_options (question_id, option_text, is_correct, order_index) values
(17, 'принимает входящие запросы, дергает модель и собирает ответ', 1, 1),
(17, 'хранит файлы на диске', 0, 2),
(17, 'стилизует шрифт в браузере', 0, 3),
(17, 'управляет кулером сервера', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(18, 1, 'Что проверяют юнит-тесты?', 'юнит-тесты проверяют отдельные функции и методы в полной изоляции');
insert into test_options (question_id, option_text, is_correct, order_index) values
(18, 'работу изолированных методов и функций без внешних зависимостей', 1, 1),
(18, 'скорость вращения вентилятора', 0, 2),
(18, 'цветопередачу монитора', 0, 3),
(18, 'задержку кабеля интернета', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(19, 1, 'К какому типу относится паттерн Decorator?', 'декоратор оборачивает объект и расширяет его, значит он структурный');
insert into test_options (question_id, option_text, is_correct, order_index) values
(19, 'структурные паттерны (Structural)', 1, 1),
(19, 'порождающие паттерны (Creational)', 0, 2),
(19, 'поведенческие паттерны (Behavioral)', 0, 3),
(19, 'сетевые протоколы', 0, 4);

insert into test_questions (id, pool_id, question_text, explanation) values
(20, 1, 'Какая оценка ставится за результат от 75% до 89.99%?', 'по заданию: от 75% до 89.99% это «хорошо»');
insert into test_options (question_id, option_text, is_correct, order_index) values
(20, '«хорошо»', 1, 1),
(20, '«отлично»', 0, 2),
(20, '«удовлетворительно»', 0, 3),
(20, '«неудовлетворительно»', 0, 4);

-- интерактивные задания
insert into interactive_exercises (id, topic_id, exercise_type, title, description, instruction, hint, explanation, payload_json, order_index) values
(1, 3, 'ordering', 
 'Пайплайн жизненного цикла разработки ПО (SDLC / CI-CD)',
 'расставьте этапы разработки в правильном хронологическом порядке',
 'перетащите карточки мышкой сверху вниз от идеи к деплою',
 'сначала требования и архитектура, потом код и тесты, потом сборка и релиз',
 'правильный порядок: 1) сбор требований и ТЗ -> 2) архитектура и БД -> 3) разработка кода -> 4) тестирование -> 5) CI сборка артефактов -> 6) деплой и мониторинг',
 '{
   "items": [
     {"id": "step_build", "text": "5. Сборка артефактов и контейнеризация (CI)"},
     {"id": "step_deploy", "text": "6. Эксплуатация, деплой и мониторинг"},
     {"id": "step_code", "text": "3. Разработка программных модулей и бизнес-логики"},
     {"id": "step_test", "text": "4. Модульное и интеграционное тестирование"},
     {"id": "step_tz", "text": "1. Сбор требований, анализ предметной области и ТЗ"},
     {"id": "step_arch", "text": "2. Проектирование архитектуры и схемы БД"}
   ],
   "correct_order": [
     "step_tz",
     "step_arch",
     "step_code",
     "step_test",
     "step_build",
     "step_deploy"
   ]
 }',
 1);

insert into interactive_exercises (id, topic_id, exercise_type, title, description, instruction, hint, explanation, payload_json, order_index) values
(2, 1, 'grouping',
 'Классификация паттернов проектирования GoF',
 'раскидайте паттерны по трем семействам банды четырех',
 'перетащите карточки в нужную колонку: порождающие, структурные или поведенческие',
 'фабрики создают объекты, адаптеры связывают классы, стратегии определяют поведение',
 'порождающие: Singleton, Factory, Builder. структурные: Adapter, Decorator, Facade. поведенческие: Observer, Strategy, Command.',
 '{
   "groups": [
     {"id": "creational", "title": "Порождающие"},
     {"id": "structural", "title": "Структурные"},
     {"id": "behavioral", "title": "Поведенческие"}
   ],
   "items": [
     {"id": "p_singleton", "text": "Одиночка (Singleton)", "correct_group": "creational"},
     {"id": "p_factory", "text": "Фабричный метод (Factory Method)", "correct_group": "creational"},
     {"id": "p_builder", "text": "Строитель (Builder)", "correct_group": "creational"},
     {"id": "p_adapter", "text": "Адаптер (Adapter)", "correct_group": "structural"},
     {"id": "p_decorator", "text": "Декоратор (Decorator)", "correct_group": "structural"},
     {"id": "p_facade", "text": "Фасад (Facade)", "correct_group": "structural"},
     {"id": "p_observer", "text": "Наблюдатель (Observer)", "correct_group": "behavioral"},
     {"id": "p_strategy", "text": "Стратегия (Strategy)", "correct_group": "behavioral"},
     {"id": "p_command", "text": "Команда (Command)", "correct_group": "behavioral"}
   ]
 }',
 2);

insert into interactive_exercises (id, topic_id, exercise_type, title, description, instruction, hint, explanation, payload_json, order_index) values
(3, 3, 'regex',
 'Валидация строки версии SemVer',
 'напишите регулярку для проверки тегов версий релиза в Git',
 'введите регулярку, которая валидирует форматы v1.2.3 или 1.2.3',
 'нужны якоря начала и конца строки, опциональная v и три числа через точку',
 'эталонная регулярка: ^v?\\d+\\.\\d+\\.\\d+$',
 '{
   "pattern": "^v?\\\\d+\\\\.\\\\d+\\\\.\\\\d+$",
   "test_cases": [
     {"input": "v1.0.0", "should_match": true},
     {"input": "1.2.3", "should_match": true},
     {"input": "v10.20.30", "should_match": true},
     {"input": "1.0", "should_match": false},
     {"input": "version-1", "should_match": false},
     {"input": "v1.a.3", "should_match": false}
   ]
 }',
 3);
