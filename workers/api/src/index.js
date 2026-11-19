const RESTAURANT_ID = "demo";
const SESSION_DAYS = 7;
const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
const bytesToHex = (bytes) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex) => new Uint8Array((hex.match(/.{1,2}/g) || []).map(x => parseInt(x, 16)));
async function sha256(value) { return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
async function checkLoginLimit(env, ipHash) {
  const row = await env.DB.prepare("SELECT attempts,window_started,blocked_until FROM login_attempts WHERE ip_hash=?").bind(ipHash).first();
  const now = Date.now();
  if (row?.blocked_until && Date.parse(row.blocked_until) > now) return false;
  if (!row || now - Date.parse(row.window_started) > 15 * 60 * 1000) {
    await env.DB.prepare("INSERT INTO login_attempts(ip_hash,attempts,window_started,blocked_until) VALUES(?,0,?,NULL) ON CONFLICT(ip_hash) DO UPDATE SET attempts=0,window_started=excluded.window_started,blocked_until=NULL").bind(ipHash,new Date(now).toISOString()).run();
  }
  return true;
}
async function recordLoginFailure(env, ipHash) {
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO login_attempts(ip_hash,attempts,window_started) VALUES(?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET attempts=attempts+1,blocked_until=CASE WHEN attempts+1>=10 THEN ? ELSE blocked_until END").bind(ipHash,now,new Date(Date.now()+15*60*1000).toISOString()).run();
}
async function passwordHash(password, saltHex, iterations) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBytes(saltHex), iterations, hash: "SHA-256" }, key, 256);
  return bytesToHex(bits);
}
function randomHex(size = 32) { const b = crypto.getRandomValues(new Uint8Array(size)); return bytesToHex(b); }
function cookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const part = raw.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}
function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin === "https://restaurant-menu-site.scan-it500.workers.dev" || origin === "https://restaurant-menu-template.pages.dev" || origin.startsWith("http://localhost:");
  return {
    "access-control-allow-origin": allowed ? origin : "null",
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type, X-Bootstrap-Secret",
    "vary": "Origin"
  };
}
async function requireUser(request, env) {
  const token = cookie(request, "sid");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare("SELECT u.id,u.username,u.display_name,u.role,u.must_change_password,s.id AS session_id FROM sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.restaurant_id=? AND s.expires_at>? AND u.is_active=1 LIMIT 1")
    .bind(tokenHash, RESTAURANT_ID, new Date().toISOString()).first();
  return row || null;
}
function cleanProduct(row) {
  const imageKey = row.image_key || "";
  return { ...row, image_url: imageKey ? "https://raw.githubusercontent.com/scainit/restaurant-menu-template/main/public/images/menu/" + imageKey + ".svg" : "", sizes: row.sizes_json ? JSON.parse(row.sizes_json) : [], sizes_json: undefined, is_available: !!row.is_available };
}
export default {
 async fetch(request, env) {
  const headers = cors(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = origin === "https://restaurant-menu-site.scan-it500.workers.dev" || origin === "https://restaurant-menu-template.pages.dev" || origin.startsWith("http://localhost:");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !allowedOrigin) return json({ error: "Origin not allowed" }, 403, headers);
  try {
   if (path === "/health") return json({ ok: true, service: "restaurant-menu-api" }, 200, headers);
   if (path === "/api/menu" && request.method === "GET") {
    const cats = await env.DB.prepare("SELECT id,name,name_ar,sort_order FROM categories WHERE restaurant_id=? AND is_visible=1 ORDER BY sort_order,name").bind(RESTAURANT_ID).all();
    const prods = await env.DB.prepare("SELECT id,category_id,name,name_ar,description,description_ar,image_key,price,sizes_json,is_available,sort_order FROM products WHERE restaurant_id=? AND is_available=1 ORDER BY sort_order,name").bind(RESTAURANT_ID).all();
    return json({ categories: cats.results, products: (prods.results || []).map(cleanProduct) }, 200, headers);
   }
   if (path === "/api/auth/login" && request.method === "POST") {
    const body = await request.json();
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await sha256(ip);
    if (!(await checkLoginLimit(env, ipHash))) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429, headers);
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!username || !password || username.length > 64 || password.length > 256) return json({ error: "Invalid username or password" }, 400, headers);
    const user = await env.DB.prepare("SELECT * FROM admin_users WHERE restaurant_id=? AND username=? AND is_active=1 LIMIT 1").bind(RESTAURANT_ID, username).first();
    if (!user) { await passwordHash(password, "00000000000000000000000000000000", 1000); await recordLoginFailure(env, ipHash); return json({ error: "Invalid username or password" }, 401, headers); }
    const candidate = await passwordHash(password, user.password_salt, user.password_iterations);
    if (candidate !== user.password_hash) { await recordLoginFailure(env, ipHash); return json({ error: "Invalid username or password" }, 401, headers); }
    await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash=?").bind(ipHash).run();
    const token = randomHex(32);
    const tokenHash = await sha256(token);
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await env.DB.prepare("INSERT INTO sessions (id,user_id,restaurant_id,token_hash,expires_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), user.id, RESTAURANT_ID, tokenHash, expires).run();
    return json({ user: { username: user.username, displayName: user.display_name || "", role: user.role }, mustChangePassword: !!user.must_change_password }, 200, { ...headers, "set-cookie": "sid=" + token + "; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=" + (SESSION_DAYS * 86400) });
   }
   if (path === "/api/auth/logout" && request.method === "POST") {
    const token = cookie(request, "sid");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { ...headers, "set-cookie": "sid=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0" });
   }
   if (path === "/api/auth/bootstrap" && request.method === "POST") {
    if (!env.BOOTSTRAP_SECRET) return json({ error: "Bootstrap is not configured" }, 503, headers);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await sha256("bootstrap|" + ip);
    if (!(await checkLoginLimit(env, ipHash))) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429, headers);
    const suppliedSecret = request.headers.get("X-Bootstrap-Secret") || "";
    const expectedHash = await sha256(env.BOOTSTRAP_SECRET);
    const suppliedHash = await sha256(suppliedSecret);
    if (!constantTimeEqual(suppliedHash, expectedHash)) {
      await recordLoginFailure(env, ipHash);
      return json({ error: "Invalid bootstrap credential" }, 401, headers);
    }
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const displayName = String(body.display_name || "").trim().slice(0, 100);
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{3,64}$/.test(username) || !displayName || password.length < 12 || password.length > 128) {
      return json({ error: "A valid username, display name, and 12-128 character password are required" }, 400, headers);
    }
    const salt = randomHex(16);
    const hash = await passwordHash(password, salt, 100000);
    const claim = randomHex(16);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE bootstrap_state SET consumed_at=?,claim_token=? WHERE id='initial-manager' AND consumed_at IS NULL").bind(now, claim),
      env.DB.prepare("INSERT INTO admin_users(id,restaurant_id,username,display_name,password_hash,password_salt,password_iterations,role,must_change_password,is_active) SELECT ?,?,?,?,?,?,100000,'manager',1,1 WHERE EXISTS (SELECT 1 FROM bootstrap_state WHERE id='initial-manager' AND consumed_at=? AND claim_token=?)").bind(id, RESTAURANT_ID, username, displayName, hash, salt, now, claim)
    ]);
    if (!results?.[1]?.meta?.changes) return json({ error: "Bootstrap has already been used or the account could not be created" }, 409, headers);
    await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash=?").bind(ipHash).run();
    return json({ ok: true, user: { username, displayName, role: "manager" }, mustChangePassword: true }, 201, headers);
   }
   const user = await requireUser(request, env);
   if (path === "/api/auth/me" && request.method === "GET") {
    if (!user) return json({ error: "Unauthorized" }, 401, headers);
    return json({ user: { username: user.username, displayName: user.display_name || "", role: user.role }, mustChangePassword: !!user.must_change_password }, 200, headers);
   }
   if (!user) return json({ error: "Unauthorized" }, 401, headers);
   const isManager = user.role === "manager";
   if (path.startsWith("/api/admin/") && ["POST", "PUT", "DELETE", "PATCH"].includes(request.method) && !isManager) return json({ error: "Manager permission required" }, 403, headers);
   if (user.must_change_password && path !== "/api/auth/change-password") return json({ error: "Password change required" }, 403, headers);
   if (path === "/api/auth/change-password" && request.method === "POST") {
    const body = await request.json(); const password = String(body.password || "");
    if (password.length < 12 || password.length > 128) return json({ error: "Password must be 12-128 characters" }, 400, headers);
    const salt = randomHex(16); const hash = await passwordHash(password, salt, 100000);
    await env.DB.prepare("UPDATE admin_users SET password_hash=?,password_salt=?,password_iterations=100000,must_change_password=0 WHERE id=? AND restaurant_id=?").bind(hash,salt,user.id,RESTAURANT_ID).run();
    return json({ ok: true }, 200, headers);
   }
   if (path === "/api/admin/users" && request.method === "GET") {
    if (!isManager) return json({ error: "Manager permission required" }, 403, headers);
    const result = await env.DB.prepare("SELECT id,username,display_name,role,is_active,must_change_password,created_at FROM admin_users WHERE restaurant_id=? ORDER BY created_at,username").bind(RESTAURANT_ID).all();
    return json({ users: (result.results || []).map(u => ({ ...u, is_active: !!u.is_active, must_change_password: !!u.must_change_password })) }, 200, headers);
   }
   if (path === "/api/admin/users" && request.method === "POST") {
    if (!isManager) return json({ error: "Manager permission required" }, 403, headers);
    const b = await request.json();
    const username = String(b.username || "").trim().toLowerCase();
    const displayName = String(b.display_name || "").trim().slice(0, 100);
    const password = String(b.password || "");
    const role = String(b.role || "staff").toLowerCase();
    if (!/^[a-z0-9._-]{3,64}$/.test(username) || !displayName || password.length < 12 || password.length > 128 || !["manager", "staff"].includes(role)) {
      return json({ error: "Enter a valid name, username, role, and 12-128 character password" }, 400, headers);
    }
    const salt = randomHex(16); const hash = await passwordHash(password, salt, 100000); const id = crypto.randomUUID();
    try {
      await env.DB.prepare("INSERT INTO admin_users(id,restaurant_id,username,display_name,password_hash,password_salt,password_iterations,role,must_change_password,is_active) VALUES(?,?,?,?,?,?,100000,?,1,1)").bind(id,RESTAURANT_ID,username,displayName,hash,salt,role).run();
    } catch { return json({ error: "Username already exists or account could not be created" }, 409, headers); }
    return json({ id, username, display_name: displayName, role, is_active: true, must_change_password: true }, 201, headers);
   }
   const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
   if (userMatch && request.method === "PATCH") {
    if (!isManager) return json({ error: "Manager permission required" }, 403, headers);
    const targetId = userMatch[1]; const b = await request.json();
    const target = await env.DB.prepare("SELECT id,role,is_active FROM admin_users WHERE id=? AND restaurant_id=?").bind(targetId,RESTAURANT_ID).first();
    if (!target) return json({ error: "User not found" }, 404, headers);
    if (b.action === "reset-password") {
      const password = String(b.password || "");
      if (password.length < 12 || password.length > 128) return json({ error: "Password must be 12-128 characters" }, 400, headers);
      const salt = randomHex(16); const hash = await passwordHash(password, salt, 100000);
      await env.DB.batch([
        env.DB.prepare("UPDATE admin_users SET password_hash=?,password_salt=?,password_iterations=100000,must_change_password=1 WHERE id=? AND restaurant_id=?").bind(hash,salt,targetId,RESTAURANT_ID),
        env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND restaurant_id=?").bind(targetId,RESTAURANT_ID)
      ]);
      return json({ ok: true, must_change_password: true }, 200, headers);
    }
    if (b.action === "set-active") {
      const active = b.is_active === true;
      if (targetId === user.id && !active) return json({ error: "You cannot deactivate your own account" }, 400, headers);
      if (!active && target.role === "manager" && target.is_active) {
        const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM admin_users WHERE restaurant_id=? AND role='manager' AND is_active=1").bind(RESTAURANT_ID).first();
        if ((count?.total || 0) <= 1) return json({ error: "At least one active manager must remain" }, 409, headers);
      }
      await env.DB.prepare("UPDATE admin_users SET is_active=? WHERE id=? AND restaurant_id=?").bind(active?1:0,targetId,RESTAURANT_ID).run();
      if (!active) await env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND restaurant_id=?").bind(targetId,RESTAURANT_ID).run();
      return json({ ok: true, is_active: active }, 200, headers);
    }
    if (b.action === "set-role") {
      const role = String(b.role || "").toLowerCase();
      if (!["manager","staff"].includes(role)) return json({ error: "Invalid role" }, 400, headers);
      if (targetId === user.id && role !== "manager") return json({ error: "You cannot remove your own manager role" }, 400, headers);
      if (role !== "manager" && target.role === "manager" && target.is_active) {
        const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM admin_users WHERE restaurant_id=? AND role='manager' AND is_active=1").bind(RESTAURANT_ID).first();
        if ((count?.total || 0) <= 1) return json({ error: "At least one active manager must remain" }, 409, headers);
      }
      await env.DB.prepare("UPDATE admin_users SET role=? WHERE id=? AND restaurant_id=?").bind(role,targetId,RESTAURANT_ID).run();
      return json({ ok: true, role }, 200, headers);
    }
    if (b.action === "update-profile") {
      const displayName = String(b.display_name || "").trim().slice(0,100);
      if (!displayName) return json({ error: "Display name is required" }, 400, headers);
      await env.DB.prepare("UPDATE admin_users SET display_name=? WHERE id=? AND restaurant_id=?").bind(displayName,targetId,RESTAURANT_ID).run();
      return json({ ok: true, display_name: displayName }, 200, headers);
    }
    return json({ error: "Unsupported user action" }, 400, headers);
   }
   if (path === "/api/admin/categories" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT * FROM categories WHERE restaurant_id=? ORDER BY sort_order,name").bind(RESTAURANT_ID).all();
    return json({ categories: result.results }, 200, headers);
   }
   if (path === "/api/admin/categories" && request.method === "POST") {
    const b = await request.json(); if (!b.name || !b.name_ar) return json({ error: "Category names are required" }, 400, headers);
    const id = crypto.randomUUID(); await env.DB.prepare("INSERT INTO categories(id,restaurant_id,name,name_ar,sort_order,is_visible) VALUES(?,?,?,?,?,?)").bind(id,RESTAURANT_ID,String(b.name).slice(0,100),String(b.name_ar).slice(0,100),Number(b.sort_order)||0,b.is_visible===false?0:1).run();
    return json({ id }, 201, headers);
   }
   const catMatch = path.match(/^\/api\/admin\/categories\/([^/]+)$/);
   if (catMatch && request.method === "PUT") {
    const b = await request.json(); await env.DB.prepare("UPDATE categories SET name=?,name_ar=?,sort_order=?,is_visible=? WHERE id=? AND restaurant_id=?").bind(String(b.name||"").slice(0,100),String(b.name_ar||"").slice(0,100),Number(b.sort_order)||0,b.is_visible===false?0:1,catMatch[1],RESTAURANT_ID).run(); return json({ok:true},200,headers);
   }
   if (catMatch && request.method === "DELETE") { await env.DB.prepare("DELETE FROM categories WHERE id=? AND restaurant_id=?").bind(catMatch[1],RESTAURANT_ID).run(); return json({ok:true},200,headers); }
   if (path === "/api/admin/products" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT * FROM products WHERE restaurant_id=? ORDER BY sort_order,name").bind(RESTAURANT_ID).all(); return json({ products: (result.results||[]).map(cleanProduct) },200,headers);
   }
   if (path === "/api/admin/products" && request.method === "POST") {
    const b=await request.json(); if(!b.name||!b.name_ar||!b.category_id) return json({error:"Product name and category are required"},400,headers);
    const id=crypto.randomUUID(); const sizes=Array.isArray(b.sizes)&&b.sizes.length?JSON.stringify(b.sizes):null; const price=sizes?null:Number(b.price);
    if(!sizes&&(!Number.isFinite(price)||price<0)) return json({error:"A valid price is required"},400,headers);
    await env.DB.prepare("INSERT INTO products(id,restaurant_id,category_id,name,name_ar,description,description_ar,image_key,price,sizes_json,is_available,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,RESTAURANT_ID,b.category_id,String(b.name).slice(0,120),String(b.name_ar).slice(0,120),String(b.description||"").slice(0,500),String(b.description_ar||"").slice(0,500),String(b.image_key||"").slice(0,80),price,sizes,b.is_available===false?0:1,Number(b.sort_order)||0).run();
    return json({id},201,headers);
   }
   const productMatch=path.match(/^\/api\/admin\/products\/([^/]+)$/);
   if(productMatch&&request.method==="PUT"){
    const b=await request.json(); const sizes=Array.isArray(b.sizes)&&b.sizes.length?JSON.stringify(b.sizes):null; const price=sizes?null:Number(b.price);
    await env.DB.prepare("UPDATE products SET category_id=?,name=?,name_ar=?,description=?,description_ar=?,image_key=?,price=?,sizes_json=?,is_available=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND restaurant_id=?").bind(b.category_id,String(b.name||"").slice(0,120),String(b.name_ar||"").slice(0,120),String(b.description||"").slice(0,500),String(b.description_ar||"").slice(0,500),String(b.image_key||"").slice(0,80),price,sizes,b.is_available===false?0:1,Number(b.sort_order)||0,productMatch[1],RESTAURANT_ID).run(); return json({ok:true},200,headers);
   }
   if(productMatch&&request.method==="DELETE"){await env.DB.prepare("DELETE FROM products WHERE id=? AND restaurant_id=?").bind(productMatch[1],RESTAURANT_ID).run();return json({ok:true},200,headers);}
   return json({error:"Not found"},404,headers);
  } catch (error) { return json({error:"Internal server error"},500,headers); }
 }
};
