CREATE TYPE user_role AS ENUM ('admin', 'normal_user', 'store_owner');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL CHECK (
        LENGTH(name) BETWEEN 20 AND 60
    ),
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    address VARCHAR(400),
    role user_role NOT NULL DEFAULT 'normal_user',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL CHECK (
        LENGTH(name) BETWEEN 20 AND 60
    ),
    email VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(400),
    owner_id INTEGER REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    UNIQUE (user_id, store_id)
);

-- Helpful views / aggregates
CREATE VIEW store_with_rating AS
SELECT
  s.id,
  s.name,
  s.email,
  s.address,
  COALESCE(AVG(r.rating), 0)::numeric(3,2) AS avg_rating,
  COUNT(r.id) AS ratings_count
FROM stores s
LEFT JOIN ratings r ON r.store_id = s.id
GROUP BY s.id;