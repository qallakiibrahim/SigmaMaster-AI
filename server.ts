import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("projects.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    user_id TEXT,
    user_name TEXT,
    change_summary TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());
  
  app.set('trust proxy', 1);

  // We'll use a custom token-based session system because cookies are unreliable in IFrames
  const tokenStore = new Map<string, { userId: string, userName: string, expires: number }>();

  app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    if (token && tokenStore.has(token)) {
      const sessionData = tokenStore.get(token)!;
      if (Date.now() < sessionData.expires) {
        (req as any).user = sessionData;
        // Refresh expiry
        sessionData.expires = Date.now() + (24 * 60 * 60 * 1000);
      } else {
        tokenStore.delete(token);
      }
    }
    
    console.log(`${req.method} ${req.url} - Auth: ${!!(req as any).user}`);
    next();
  });

  // Default Initial Data
  const defaultProject = {
    id: '1',
    name: 'Optimering av Svetsprocess',
    problemStatement: 'Svetsprocessen på linje 3 har en kasseringsgrad på 12%, vilket överstiger målet på 2%.',
    businessCase: 'Hög kasseringsgrad leder till ökade materialkostnader på 500k SEK/år samt flaskhalsar i produktionen.',
    stakeholders: 'Produktionschef, Kvalitetsansvarig, Linjeoperatörer',
    goal: '',
    scope: '',
    measurements: [100.2, 101.5, 99.8, 100.5, 102.1, 98.9, 100.0, 101.2, 100.8, 99.5, 103.2, 98.4, 100.1, 101.0],
    rootCauses: [],
    improvements: [],
    selectedTools: ['t_charter', 't_sipoc', 't_stakeholder', 't_data_plan', 't_msa', 't_capability', 't_ishikawa', 't_5why', 't_pareto', 't_fmea', 't_brainstorm', 't_pilot', 't_spc', 't_control_plan', 't_sop'],
    toolData: {},
    tollgateStatus: {
      'Define': 'In Progress',
      'Measure': 'Not Started',
      'Analyze': 'Not Started',
      'Improve': 'Not Started',
      'Control': 'Not Started',
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { username, password, name } = req.body;
    console.log(`[AUTH] Signup attempt for user: "${username}"`);
    try {
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const trimmedUsername = username.trim().toLowerCase();
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = Math.random().toString(36).substr(2, 9);
      db.prepare("INSERT INTO users (id, username, password, name) VALUES (?, ?, ?, ?)").run(id, trimmedUsername, hashedPassword, name);
      console.log(`[AUTH] Signup SUCCESS for user: "${trimmedUsername}" (ID: ${id})`);
      res.json({ success: true });
    } catch (err) {
      console.error(`[AUTH] Signup FAILED for user: "${username}":`, err);
      res.status(400).json({ error: "Username already exists or invalid data" });
    }
  });

  app.post("/api/auth/reset", async (req, res) => {
    const { username, newPassword } = req.body;
    console.log(`[AUTH] Password reset attempt for user: "${username}"`);
    try {
      if (!username || !newPassword) {
        return res.status(400).json({ error: "Username and new password required" });
      }
      const trimmedUsername = username.trim().toLowerCase();
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(trimmedUsername) as any;
      if (!user) {
        return res.status(404).json({ error: "Användaren kunde inte hittas" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hashedPassword, trimmedUsername);
      console.log(`[AUTH] Password reset SUCCESS for user: "${trimmedUsername}"`);
      res.json({ success: true });
    } catch (err) {
      console.error("[AUTH] Error in password reset:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.use((req, res, next) => {
    // Helpful log to see if the custom token auth is working
    console.log(`${req.method} ${req.url} - Auth: ${!!(req as any).user}`);
    next();
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt for user: "${username}"`);
    try {
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const trimmedUsername = username.trim().toLowerCase();
      let user = db.prepare("SELECT * FROM users WHERE username = ?").get(trimmedUsername) as any;
      
      if (!user) {
        console.log(`[AUTH] User "${trimmedUsername}" not found. Auto-creating user for frictionless access.`);
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = Math.random().toString(36).substr(2, 9);
        const displayName = trimmedUsername.charAt(0).toUpperCase() + trimmedUsername.slice(1);
        db.prepare("INSERT INTO users (id, username, password, name) VALUES (?, ?, ?, ?)").run(id, trimmedUsername, hashedPassword, displayName);
        user = { id, username: trimmedUsername, password: hashedPassword, name: displayName };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (isMatch) {
        const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
        tokenStore.set(token, {
          userId: user.id,
          userName: user.name,
          expires: Date.now() + (24 * 60 * 60 * 1000)
        });
        
        console.log(`[AUTH] Login SUCCESS: "${trimmedUsername}", Token created`);
        res.json({ success: true, token, user: { id: user.id, name: user.name } });
      } else {
        console.warn(`[AUTH] Login FAILED: Password mismatch for "${trimmedUsername}"`);
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err) {
      console.error("[AUTH] Error in login route:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if ((req as any).user) {
      res.json({ user: { id: (req as any).user.userId, name: (req as any).user.userName } });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      tokenStore.delete(token);
    }
    res.json({ success: true });
  });

  // Project Logic
  const getProject = db.prepare("SELECT data FROM projects WHERE id = ?");
  const saveProject = db.prepare("INSERT OR REPLACE INTO projects (id, owner_id, data) VALUES (?, ?, ?)");
  const addHistory = db.prepare("INSERT INTO history (project_id, user_id, user_name, change_summary) VALUES (?, ?, ?, ?)");
  const getHistory = db.prepare("SELECT * FROM history WHERE project_id = ? ORDER BY timestamp DESC LIMIT 50");
  const listProjects = db.prepare("SELECT id, data FROM projects WHERE owner_id = ?");
  const deleteProject = db.prepare("DELETE FROM projects WHERE id = ? AND owner_id = ?");

  // API Routes for Projects
  app.get("/api/projects", (req, res) => {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const projects = listProjects.all(userId).map((p: any) => ({
      id: p.id,
      ...JSON.parse(p.data)
    }));
    res.json({ projects });
  });

  app.post("/api/projects", (req, res) => {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { name } = req.body;
    const projectId = Math.random().toString(36).substr(2, 9);
    const newProject = { ...defaultProject, id: projectId, name: name || "Nytt Projekt" };
    saveProject.run(projectId, userId, JSON.stringify(newProject));
    res.json({ success: true, project: newProject });
  });

  app.get("/api/projects/:id", (req, res) => {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const projectData = getProject.get(req.params.id) as any;
    if (projectData) {
      res.json({ success: true, project: JSON.parse(projectData.data) });
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  });

  app.put("/api/projects/:id", (req, res) => {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    
    const projectDataObj = getProject.get(req.params.id) as any;
    if (!projectDataObj) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const oldState = JSON.parse(projectDataObj.data);
    const newState = { ...oldState, ...req.body };
    saveProject.run(req.params.id, userId, JSON.stringify(newState));
    
    // Broadcast state update to WS sockets in this project group
    const broadcastMsg = JSON.stringify({ type: "SYNC_STATE", payload: newState });
    projectClients.get(req.params.id)?.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcastMsg);
      }
    });

    res.json({ success: true, project: newState });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    deleteProject.run(req.params.id, userId);
    res.json({ success: true });
  });

  const projectClients = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws, req) => {
    let currentProjectId: string | null = null;
    let userId: string | null = null;
    let userName: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "JOIN_PROJECT") {
          const { projectId, user } = message;
          if (currentProjectId) {
            projectClients.get(currentProjectId)?.delete(ws);
          }
          currentProjectId = projectId;
          userId = user.id;
          userName = user.name;

          if (!projectClients.has(projectId)) {
            projectClients.set(projectId, new Set());
          }
          projectClients.get(projectId)!.add(ws);

          const projectData = getProject.get(projectId) as any;
          if (projectData) {
            ws.send(JSON.stringify({ type: "SYNC_STATE", payload: JSON.parse(projectData.data) }));
          } else {
            ws.send(JSON.stringify({ type: "ERROR", payload: "Project not found: " + projectId }));
          }
        } else if (message.type === "UPDATE_PROJECT") {
          if (!currentProjectId || !userId) return;
          
          const projectData = getProject.get(currentProjectId) as any;
          if (projectData) {
            const state = JSON.parse(projectData.data);
            const newState = { ...state, ...message.payload };
            saveProject.run(currentProjectId, userId, JSON.stringify(newState));
            
            const broadcastMsg = JSON.stringify({ type: "SYNC_STATE", payload: newState });
            projectClients.get(currentProjectId)?.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(broadcastMsg);
              }
            });
          }
        } else if (message.type === "SAVE_VERSION") {
          if (currentProjectId && userId && userName) {
            const summary = message.comment || "Manuell versionssparande";
            addHistory.run(currentProjectId, userId, userName, summary);
            
            const history = getHistory.all(currentProjectId);
            const historyMsg = JSON.stringify({ type: "HISTORY_UPDATE", payload: history });
            projectClients.get(currentProjectId)?.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(historyMsg);
              }
            });
          }
        } else if (message.type === "GET_HISTORY") {
          if (currentProjectId) {
            const history = getHistory.all(currentProjectId);
            ws.send(JSON.stringify({ type: "HISTORY_UPDATE", payload: history }));
          }
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on("close", () => {
      if (currentProjectId) {
        projectClients.get(currentProjectId)?.delete(ws);
      }
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('path');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
