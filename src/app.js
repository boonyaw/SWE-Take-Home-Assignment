import express from "express";
import { getDb, initDb } from "./db.js";
import { parse } from "csv-parse/sync";

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

let pool;
initDb().then((p) => {
  pool = p;
});

app.get("/users", async (req, res) => {
  const min = parseFloat(req.query.min ?? 0);
  const max = parseFloat(req.query.max ?? 4000);
  const offset = parseInt(req.query.offset ?? 0);
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const sort = req.query.sort ? String(req.query.sort).toUpperCase() : null;

  let sql = `SELECT name, salary FROM users WHERE salary BETWEEN ? AND ?`;
  const params = [min, max];
  if (sort === "NAME") sql += " ORDER BY name ASC";
  else if (sort === "SALARY") sql += " ORDER BY salary ASC";
  else if (sort) return res.status(400).json({ error: "Invalid sort param" });

  if (limit !== null) {
    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);
  } else if (offset) {
    sql += " LIMIT 18446744073709551615 OFFSET ?"; // MySQL trick for "offset without limit"
    params.push(offset);
  }

  try {
    const [rows] = await pool.query(sql, params);
    res.json({ results: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/upload", async (req, res) => {
  const csvText = req.body.file;
  if (!csvText) return res.status(400).json({ error: "file field missing" });

  let records;
  try {
    records = parse(csvText, {
      trim: true,
      skip_empty_lines: true,
    });
  } catch (e) {
    return res.status(400).json({ error: "CSV parse failed" });
  }
  const dataRecords = records.slice(1);

  const validRows = [];
  for (const row of dataRecords) {
    if (row.length !== 2) return res.status(400).json({ error: "Bad columns" });
    const [nameRaw, salaryRaw] = row;
    const name = String(nameRaw ?? "").trim();
    let s = String(salaryRaw ?? "").trim();

    if (!name) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }
    // STRICT number check: digits with optional single decimal part, no commas/letters/slashes/etc.
    // Accepts: 0, 0.0, 12, 12.34
    // Rejects: 12a, 12,, 12/34, 1_000, 1,000.00, 1e3
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(s)) {
      return res.status(400).json({ error: `Invalid salary for "${name}"` });
    }

    const salary = Number(s);
    if (!Number.isFinite(salary)) {
      return res.status(400).json({ error: `Invalid salary for "${name}"` });
    }

    // Per spec: negative rows are skipped (not an error)
    if (salary < 0) continue;

    validRows.push([name, salary]);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [name, salary] of validRows) {
      await conn.query(
        `
        INSERT INTO users (name, salary) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE salary = VALUES(salary)
      `,
        [name, salary]
      );
    }
    await conn.commit();
    res.json({ success: 1 });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: "Upload failed, no changes applied" });
  } finally {
    conn.release();
  }
});

app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
