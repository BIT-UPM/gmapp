import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for node data
  const nodesData: Record<string, any> = {};

  // API routes
  app.post("/api/report", (req, res) => {
    const report = req.body;
    nodesData[report.node_name] = {
      last_seen: Date.now() / 1000,
      cpu_load: report.cpu_load || 0,
      ram_usage: report.ram_usage || 0,
      gpus: report.gpus,
    };
    res.json({ status: "success" });
  });

  app.get("/api/nodes", (req, res) => {
    const currentTime = Date.now() / 1000;
    const result = Object.entries(nodesData).map(([node_name, data]) => {
      const is_online = currentTime - data.last_seen < 30;
      return {
        node_name,
        is_online,
        last_seen: data.last_seen,
        cpu_load: data.cpu_load,
        ram_usage: data.ram_usage,
        gpus: data.gpus,
      };
    });
    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
