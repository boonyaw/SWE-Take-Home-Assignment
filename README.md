 SWE Users API

A simple web application built with **Express** and **MySQL** to manage users and salaries via REST endpoints.  

## Features

- **GET /users**
  - Returns list of users in JSON.
  - Supports filtering by `min` and `max` salary.
  - Supports `offset` and `limit` for pagination.
  - Supports sorting by `NAME` or `SALARY` (ascending only).
  - Rejects invalid sort parameters.

- **POST /upload**
  - Accepts CSV data (`application/x-www-form-urlencoded`, field: `file`).
  - CSV rules:
    - First row is treated as header and ignored.
    - Must have exactly two columns: `Name,Salary`.
    - Salary must be a valid floating-point number.
    - Negative salary rows are **skipped**, not errors.
    - If any row is badly formatted (invalid number, bad column count), the entire file is rejected.
    - On duplicate names, the existing record is updated.
  - Transactional: all-or-nothing updates.

- **Database**
  - Table `users(name, salary)` with `name` as primary key.
  - Preloaded with seed data on first run:
    - Alex (3000.0)
    - Bryan (3500.0)
    - Cara (0.0)
    - Derek (4100.0)
    - Eve (200.5)

---
## How to Test the System

### 1. Configure MySQL

Create the database:

```sql
CREATE DATABASE salary_app;

$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASS="yourpassword"
$env:DB_NAME="salary_app"
```
### 2. Install and Run
npm install

npm start
### 3. Test /users (GET)
Default (min=0, max=4000):
  - curl.exe "http://localhost:3000/users"

Filter by salary range:
  - curl.exe "http://localhost:3000/users?min=2000&max=3500"

Pagination with sorting:
  - curl.exe "http://localhost:3000/users?sort=NAME&limit=2&offset=1"

Invalid sort (expect error):
  - curl.exe "http://localhost:3000/users?sort=DESC"
### 4. Prepare CSVs for /upload
sample.csv
```
Name,Salary
John,2500.05
Mary,3000.00
NegUser,-100
```
badsample.csv
```
Name,Salary
Mary,30/00.00
```
### 5. Test /upload (POST)
valid upload
```
curl -X POST "http://localhost:3000/upload" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "file@sample.csv"
# → {"success":1}
```
Invalid upload (should fail, no changes applied):
```
curl -X POST "http://localhost:3000/upload" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "file@badsample.csv"
# → {"error":"CSV parse failed"}
```
