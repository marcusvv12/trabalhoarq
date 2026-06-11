const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const instanceId = process.env.INSTANCE_ID || "local-instance";
const port = Number(process.env.PORT || 3000);

const pool = new Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "appuser",
  password: process.env.PGPASSWORD || "secret",
  database: process.env.PGDATABASE || "academic",
});

const app = express();
let requestCount = 0;
let totalResponseMs = 0;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.setHeader("x-instance-id", instanceId);

  res.on("finish", () => {
    requestCount += 1;
    totalResponseMs += Date.now() - start;
  });

  next();
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", instanceId, db: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.get("/metrics", (req, res) => {
  const averageResponseMs =
    requestCount === 0
      ? 0
      : Number((totalResponseMs / requestCount).toFixed(2));
  res.json({
    instanceId,
    requestCount,
    averageResponseMs,
    note: "Use o balanceador em localhost:8080 para ver o tráfego distribuído entre instâncias.",
  });
});

app.get("/records", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM records ORDER BY id");
    res.json({ instanceId, records: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM records WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Registro não encontrado" });
    }

    res.json({ instanceId, record: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/records", async (req, res) => {
  try {
    const { name, type, detail } = req.body;

    if (!name || !type) {
      return res
        .status(400)
        .json({ error: 'Os campos "name" e "type" são obrigatórios.' });
    }

    const result = await pool.query(
      "INSERT INTO records (name, type, detail) VALUES ($1, $2, $3) RETURNING *",
      [name, type, detail || ""],
    );

    res.status(201).json({ instanceId, record: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, detail } = req.body;

    const result = await pool.query(
      "UPDATE records SET name = $1, type = $2, detail = $3 WHERE id = $4 RETURNING *",
      [name, type, detail || "", id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Registro não encontrado para atualização" });
    }

    res.json({ instanceId, record: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM records WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Registro não encontrado para remoção" });
    }

    res.json({ instanceId, removed: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado" });
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        detail TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      )
    `);
  } catch (error) {
    // 23505 = unique_violation: outra instância criou a tabela simultaneamente
    if (error.code !== "23505") throw error;
  }

  app.listen(port, () => {
    console.log(
      `API academic listening on port ${port} (instance=${instanceId})`,
    );
  });
}

init().catch((error) => {
  console.error("Falha ao iniciar a aplicação:", error.message);
  process.exit(1);
});
