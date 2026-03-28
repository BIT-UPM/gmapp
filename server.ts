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
        gpus: data.gpus,
      };
    });
    res.json(result);
  });

  // --- MOCK DATA GENERATOR FOR PREVIEW ---
  // This simulates agents sending data to the server so the dashboard is populated
  // const mockNodes = ["compute-node-01", "compute-node-02", "compute-node-03", "dgx-a100-01"];
  
  // setInterval(() => {
  //   mockNodes.forEach((node, idx) => {
  //     // Simulate node 3 going offline occasionally
  //     if (node === "compute-node-03" && Math.random() > 0.8) return;
      
  //     const numGpus = node.includes("dgx") ? 8 : 4;
  //     const gpus = Array.from({ length: numGpus }).map((_, i) => {
  //       const isIdle = Math.random() > 0.6;
  //       const memTotal = node.includes("dgx") ? 81920 : 24576;
  //       const memUsed = isIdle ? Math.floor(Math.random() * 1000) : Math.floor(Math.random() * memTotal * 0.9) + 1000;
  //       const util = isIdle ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 80) + 20;
  //       const temp = isIdle ? Math.floor(Math.random() * 10) + 30 : Math.floor(Math.random() * 40) + 40;
  //       const power = isIdle ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 200) + 100;
  //       const users = isIdle ? [] : [
  //         { username: "alice", memory: Math.floor(memUsed * 0.6) },
  //         { username: "bob", memory: Math.floor(memUsed * 0.4) }
  //       ];
        
  //       return {
  //         index: i,
  //         name: node.includes("dgx") ? "NVIDIA A100-SXM4-80GB" : "NVIDIA RTX 3090",
  //         memory_total: memTotal,
  //         memory_used: memUsed,
  //         utilization: util,
  //         temperature: temp,
  //         power: power,
  //         users: users
  //       };
  //     });

  //     nodesData[node] = {
  //       last_seen: Date.now() / 1000,
  //       gpus
  //     };
  //   });
  // }, 5000);
  // // ---------------------------------------

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
