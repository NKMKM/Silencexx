-- TABLES
CREATE TABLE user_description (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    surname VARCHAR(64),
    phone VARCHAR(64),
    avatar VARCHAR(64),
    email VARCHAR(64),
    registration TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role VARCHAR(64),
    till TIMESTAMP,
    autorefresh BOOLEAN
);

CREATE TABLE session (
    id SERIAL PRIMARY KEY,
    session_ip VARCHAR,
    session_key VARCHAR,
    device_type VARCHAR
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_desc_id INT,
    user_role INT,
    session_id INT,
    FOREIGN KEY (user_desc_id) REFERENCES user_description(id),
    FOREIGN KEY (user_role) REFERENCES roles(id),
    FOREIGN KEY (session_id) REFERENCES session(id)
);

CREATE TABLE language (
    id SERIAL PRIMARY KEY,
    language_id INT UNIQUE,
    language_name VARCHAR(64)
);

CREATE TABLE user_default_settings (
    id SERIAL PRIMARY KEY,
    language_id INT,
    FOREIGN KEY (language_id) REFERENCES language(language_id)
);

CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    user_id INT,
    theme INT,
    language_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (language_id) REFERENCES language(language_id)
);

CREATE TABLE chat_id (
    id SERIAL PRIMARY KEY,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_chat (
    id SERIAL PRIMARY KEY,
    chat_id INT,
    message VARCHAR,
    senddate TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_id(id)
);

CREATE TABLE ai_response (
    id SERIAL PRIMARY KEY,
    chat_id INT,
    message VARCHAR,
    senddate TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_id(id)
);

CREATE TABLE diary (
    id SERIAL PRIMARY KEY,
    user_id INT,
    diary_date TIMESTAMP,
    diary_content VARCHAR,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default language
INSERT INTO language (language_id, language_name) VALUES (1, 'English');
INSERT INTO language (language_id, language_name) VALUES (2, 'Russian');

-- Insert default settings template
INSERT INTO user_default_settings (language_id) VALUES (1);

