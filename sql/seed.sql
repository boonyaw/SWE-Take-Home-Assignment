USE salary_app;

INSERT INTO users (name, salary) VALUES
  ('Alex', 3000.00),
  ('Bryan', 3500.00),
  ('Casey', 0.00),
  ('Dana', 4100.00) -- outside 0-4000; still in DB but /users will filter it out
ON DUPLICATE KEY UPDATE salary=VALUES(salary);
