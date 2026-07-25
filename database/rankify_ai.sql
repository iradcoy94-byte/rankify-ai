CREATE DATABASE IF NOT EXISTS rankify_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rankify_ai;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  role ENUM('guru', 'peserta_didik') NOT NULL DEFAULT 'peserta_didik',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token CHAR(64) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  score DECIMAL(5,2) NULL,
  class_name VARCHAR(120) NULL,
  meeting INT UNSIGNED NULL,
  model VARCHAR(80) NULL,
  pretest DECIMAL(5,2) NULL,
  posttest DECIMAL(5,2) NULL,
  kind ENUM('pretest', 'posttest', 'meeting') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_students_class (class_name),
  INDEX idx_students_kind (kind),
  INDEX idx_students_meeting (meeting)
) ENGINE=InnoDB;

INSERT INTO users (name, email, password_hash, role)
VALUES
  ('Guru Rankify', 'guru@rankify.test', '8514851fc43caaa0483c7a290f9059f0e5641cfa6c2eca661795c47525fc03ab', 'guru'),
  ('Peserta Didik Rankify', 'siswa@rankify.test', '8514851fc43caaa0483c7a290f9059f0e5641cfa6c2eca661795c47525fc03ab', 'peserta_didik')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role);
