pragma foreign_keys = on;

-- роли пользователей
create table if not exists roles (
    id integer primary key autoincrement,
    name text not null unique,
    description text not null
);

-- учетки пользователей
create table if not exists users (
    id integer primary key autoincrement,
    role_id integer not null,
    username text not null unique,
    email text not null unique,
    password_hash text not null,
    full_name text not null,
    created_at datetime not null default current_timestamp,
    foreign key (role_id) references roles(id) on delete restrict
);

-- темы лекций и занятий
create table if not exists topics (
    id integer primary key autoincrement,
    title text not null,
    description text,
    order_index integer not null default 0,
    created_at datetime not null default current_timestamp
);

-- сами материалы и лекции
create table if not exists lectures (
    id integer primary key autoincrement,
    topic_id integer not null,
    title text not null,
    content_type text not null default 'html',
    content text not null,
    media_url text,
    attachment_name text,
    reading_time_minutes integer not null default 5,
    order_index integer not null default 0,
    created_at datetime not null default current_timestamp,
    foreign key (topic_id) references topics(id) on delete cascade
);

-- трекинг прогресса и времени на странице
create table if not exists lecture_progress (
    id integer primary key autoincrement,
    user_id integer not null,
    lecture_id integer not null,
    is_visited boolean not null default 0,
    time_spent_seconds integer not null default 0,
    is_completed boolean not null default 0,
    last_visited_at datetime not null default current_timestamp,
    unique(user_id, lecture_id),
    foreign key (user_id) references users(id) on delete cascade,
    foreign key (lecture_id) references lectures(id) on delete cascade
);

-- банк тестов
create table if not exists test_pools (
    id integer primary key autoincrement,
    topic_id integer not null,
    title text not null,
    description text,
    time_limit_seconds integer not null default 600,
    total_pool_size integer not null default 20,
    questions_to_ask integer not null default 10,
    created_at datetime not null default current_timestamp,
    foreign key (topic_id) references topics(id) on delete cascade
);

-- вопросы к тесту
create table if not exists test_questions (
    id integer primary key autoincrement,
    pool_id integer not null,
    question_text text not null,
    explanation text,
    foreign key (pool_id) references test_pools(id) on delete cascade
);

-- варианты ответов
create table if not exists test_options (
    id integer primary key autoincrement,
    question_id integer not null,
    option_text text not null,
    is_correct boolean not null default 0,
    order_index integer not null default 0,
    foreign key (question_id) references test_questions(id) on delete cascade
);

-- результаты прохождения тестов
create table if not exists test_attempts (
    id integer primary key autoincrement,
    user_id integer not null,
    pool_id integer not null,
    score integer not null default 0,
    total_questions integer not null default 10,
    percentage real not null default 0.0,
    grade text not null,
    duration_seconds integer not null default 0,
    completed_at datetime not null default current_timestamp,
    foreign key (user_id) references users(id) on delete cascade,
    foreign key (pool_id) references test_pools(id) on delete cascade
);

-- ответы на каждый вопрос внутри попытки
create table if not exists test_attempt_answers (
    id integer primary key autoincrement,
    attempt_id integer not null,
    question_id integer not null,
    selected_option_id integer,
    is_correct boolean not null default 0,
    foreign key (attempt_id) references test_attempts(id) on delete cascade,
    foreign key (question_id) references test_questions(id) on delete cascade,
    foreign key (selected_option_id) references test_options(id) on delete set null
);

-- интерактивные задания
create table if not exists interactive_exercises (
    id integer primary key autoincrement,
    topic_id integer not null,
    exercise_type text not null,
    title text not null,
    description text not null,
    instruction text not null,
    hint text not null,
    explanation text not null,
    payload_json text not null,
    order_index integer not null default 0,
    foreign key (topic_id) references topics(id) on delete cascade
);

-- попытки решения интерактива
create table if not exists exercise_attempts (
    id integer primary key autoincrement,
    user_id integer not null,
    exercise_id integer not null,
    submitted_payload text not null,
    is_correct boolean not null default 0,
    error_details text,
    attempted_at datetime not null default current_timestamp,
    foreign key (user_id) references users(id) on delete cascade,
    foreign key (exercise_id) references interactive_exercises(id) on delete cascade
);

-- индексы чтобы выборки не тупили
create index if not exists idx_lectures_topic on lectures(topic_id);
create index if not exists idx_progress_user on lecture_progress(user_id);
create index if not exists idx_questions_pool on test_questions(pool_id);
create index if not exists idx_options_question on test_options(question_id);
create index if not exists idx_attempts_user on test_attempts(user_id);
