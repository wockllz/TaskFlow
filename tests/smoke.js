"use strict";
/* TaskFlow smoke test: real registration, project creation, task board and status moves. */
const { spawn } = require("child_process");
const path = require("path"); const fs = require("fs"); const os = require("os"); const net = require("net");
const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
const ok = (n, c, e) => { c ? (pass++, console.log(`  ✓ ${n}${e ? " — " + e : ""}`)) : (fail++, console.log(`  ✗ ${n}${e ? " — " + e : ""}`)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
function jar() { const m = new Map(); return { h: () => [...m.entries()].map(([k, v]) => `${k}=${v}`).join("; "), take: (r) => { const raw = r.headers.getSetCookie ? r.headers.getSetCookie() : []; for (const c of raw) { const p = c.split(";")[0]; const i = p.indexOf("="); m.set(p.slice(0, i), p.slice(i + 1)); } } }; }
async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tf-smoke-"));
  const dbPath = path.join(tmp, "pm.db");
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  const app = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, DB_PATH: dbPath, PORT: String(port), SESSION_SECRET: "smoke", NODE_ENV: "test" }, stdio: "ignore" });
  const Database = require("better-sqlite3");
  try {
    for (let i = 0; i < 60; i += 1) { try { if ((await fetch(base + "/api/health")).ok) break; } catch {} await sleep(250); }
    const health = await fetch(base + "/api/health");
    ok("health endpoint", health.ok);
    const loginPage = await fetch(base + "/login");
    ok("login page loads", loginPage.status === 200);
    ok("security headers present", loginPage.headers.get("x-content-type-options") === "nosniff" && !!loginPage.headers.get("content-security-policy"));

    const j = jar(); const email = `smoke${Date.now()}@test.local`; const username = "smoke" + Date.now();
    const reg = await fetch(base + "/register", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: j.h() }, body: new URLSearchParams({ username, email, password: "Passw0rd!", confirmPassword: "Passw0rd!" }) });
    j.take(reg);
    ok("register user", reg.status === 302 || reg.status === 200, "status " + reg.status);

    const login = await fetch(base + "/login", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: j.h() }, body: new URLSearchParams({ loginInput: email, password: "Passw0rd!" }) });
    j.take(login);
    ok("login user", login.status === 302, "status " + login.status);

    const dash = await fetch(base + "/dashboard", { headers: { Cookie: j.h() } });
    ok("dashboard loads", dash.status === 200);

    const pname = "Smoke Project " + Date.now();
    const proj = await fetch(base + "/projects", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: j.h() }, body: new URLSearchParams({ name: pname, description: "created by smoke test" }) });
    ok("create project", proj.status === 302, "status " + proj.status);

    const dash2 = await fetch(base + "/dashboard", { headers: { Cookie: j.h() } });
    const dhtml = await dash2.text();
    ok("project appears on dashboard", dhtml.includes(pname));

    const db = new Database(dbPath, { readonly: true });
    const project = db.prepare("SELECT id FROM projects WHERE name = ?").get(pname);
    ok("project persisted", !!project, project ? "id " + project.id : "not found");

    if (project) {
      const board = await fetch(base + "/projects/" + project.id, { headers: { Cookie: j.h() } });
      ok("project board loads", board.status === 200);

      const tname = "Smoke task " + Date.now();
      const task = await fetch(base + `/projects/${project.id}/tasks`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: j.h() }, body: new URLSearchParams({ title: tname, status: "todo", priority: "high" }) });
      ok("create task", task.status === 302, "status " + task.status);

      const row = db.prepare("SELECT id, status FROM tasks WHERE title = ?").get(tname);
      ok("task persisted", !!row, row ? "id " + row.id : "not found");

      if (row) {
        const move = await fetch(base + `/tasks/${row.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: j.h(), Accept: "application/json" }, body: JSON.stringify({ status: "done" }) });
        const mj = await move.json().catch(() => ({}));
        ok("drag-and-drop status update", move.status === 200 && mj.success === true, "status " + move.status);

        const after = db.prepare("SELECT status FROM tasks WHERE id = ?").get(row.id);
        ok("status persisted in database", after && after.status === "done", after ? after.status : "?");

        const boardAfter = await fetch(base + "/projects/" + project.id, { headers: { Cookie: j.h() } });
        const boardHtml = await boardAfter.text();
        ok("progress bar renders", boardHtml.includes("progress-fill"));
        ok("progress reflects completion", boardHtml.includes("100%") && boardHtml.includes("1/1 tasks"));
      }
    }

    const nf = await fetch(base + "/nope");
    ok("404 handler works", nf.status === 404);
    let limited = false;
    for (let i = 0; i < 12; i += 1) { const r = await fetch(base + "/login", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ loginInput: "x@y.z", password: "wrong" }) }); if (r.status === 429) { limited = true; break; } }
    ok("login rate limiting kicks in", limited);
    db.close();
  } finally { app.kill(); await sleep(300); fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log("");
  console.log(fail === 0 ? `== TaskFlow smoke PASSED — ${pass}/${pass + fail} checks ==` : `== TaskFlow smoke FAILED — ${fail} failed ==`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
