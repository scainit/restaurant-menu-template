import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
const apiKey = process.env.MENU_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
const sessionSecret = process.env.MENU_SESSION_SECRET;
const bootstrapSecret = process.env.MENU_BOOTSTRAP_SECRET;
const db = "menu-db";
const tables = {
  categories: "categories",
  products: "products",
  staff: "staff-profiles",
  images: "image-library",
  orders: "orders",
  items: "order-items",
  settings: "restaurant-settings"
};

function json(res, body, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bootstrap-Secret",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin"
  };
  return res.send(JSON.stringify(body), status, headers);
}
function randomId() { return randomBytes(12).toString("hex"); }
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return "scrypt$" + salt + "$" + scryptSync(password, salt, 64).toString("hex");
}
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret).update(encoded).digest("base64url");
  return encoded + "." + sig;
}
function verify(token) {
  if (!token || !sessionSecret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", sessionSecret).update(encoded).digest();
  let actual;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now() || !payload.uid) return null;
    return payload;
  } catch { return null; }
}
function bearer(req) {
  const value = req.headers?.authorization || req.headers?.Authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
async function dbRequest(path, method = "GET", body) {
  const response = await fetch(endpoint + path, {
    method,
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok) throw new Error(data.message || data.error || "Database request failed (" + response.status + ")");
  return data;
}
function rowPath(table, id = "") {
  return "/tablesdb/" + db + "/tables/" + table + "/rows" + (id ? "/" + encodeURIComponent(id) : "");
}
function normalizeRow(row) {
  if (!row || typeof row !== "object") return row;
  if (row.data && typeof row.data === "object") return row;
  const data = Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith("$")));
  return { ...row, data };
}
async function listRows(table, query = null) {
  const params = new URLSearchParams();
  params.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));
  if (query) params.append("queries[]", JSON.stringify(query));
  const result = await dbRequest(rowPath(table) + "?" + params.toString());
  return (result.rows || []).map(normalizeRow);
}
async function getRow(table, id) { return normalizeRow(await dbRequest(rowPath(table, id))); }
async function createRow(table, data, id = randomId()) {
  return normalizeRow(await dbRequest(rowPath(table), "POST", { rowId: id, data }));
}
async function updateRow(table, id, data) { return normalizeRow(await dbRequest(rowPath(table, id), "PATCH", { data })); }
async function deleteRow(table, id) { return dbRequest(rowPath(table, id), "DELETE"); }
function cleanProfile(row) {
  const d = row.data || {};
  return { id: row.$id, username: d.username, displayName: d.displayName, role: d.role, active: d.active, mustChangePassword: d.mustChangePassword, createdAt: row.$createdAt };
}
async function authenticatedProfile(req) {
  const token = verify(bearer(req));
  if (!token) return null;
  try {
    const row = await getRow(tables.staff, token.uid);
    if (!row.data?.active) return null;
    return { row, data: row.data };
  } catch { return null; }
}
async function requireManager(req) {
  const profile = await authenticatedProfile(req);
  if (!profile || profile.data.role !== "manager") return null;
  return profile;
}
async function handle(req, res) {
  const origin = req.headers?.origin || req.headers?.Origin || "";
  if (req.method === "OPTIONS") return json(res, {}, 204, origin);
  if (!endpoint || !projectId || !apiKey || !sessionSecret) return json(res, { error: "Appwrite function environment is incomplete.", missing: { endpoint: !!endpoint, projectId: !!projectId, apiKey: !!apiKey, sessionSecret: !!sessionSecret, bootstrapSecret: !!bootstrapSecret, functionKeyAlt: !!process.env.APPWRITE_FUNCTION_KEY, endpointAlt: !!process.env.APPWRITE_ENDPOINT } }, 500, origin);
  const input = req.bodyJson || (() => { try { return JSON.parse(req.body || "{}"); } catch { return {}; } })();
  const action = String(input.action || "");
  try {
    if (action === "bootstrap") {
      const supplied = req.headers?.["x-bootstrap-secret"] || req.headers?.["X-Bootstrap-Secret"];
      if (!bootstrapSecret || supplied !== bootstrapSecret) return json(res, { error: "Invalid bootstrap secret." }, 403, origin);
      const existing = await listRows(tables.staff);
      if (existing.length) return json(res, { error: "Bootstrap is already complete." }, 409, origin);
      const username = String(input.username || "").trim().toLowerCase();
      const password = String(input.password || "");
      const displayName = String(input.displayName || "Restaurant Manager").trim();
      if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 12) return json(res, { error: "Use a 3-64 character username and a password of at least 12 characters." }, 400, origin);
      const row = await createRow(tables.staff, { userId: "manager", username, displayName, role: "manager", active: true, mustChangePassword: true, passwordHash: hashPassword(password) }, "manager");
      return json(res, { success: true, user: cleanProfile(row) }, 201, origin);
    }
    if (action === "login") {
      const username = String(input.username || "").trim().toLowerCase();
      const matches = await listRows(tables.staff, { method: "equal", attribute: "username", values: [username] });
      const row = matches[0];
      if (!row || !row.data.active || !verifyPassword(String(input.password || ""), row.data.passwordHash)) return json(res, { error: "Invalid username or password." }, 401, origin);
      const token = sign({ uid: row.$id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      return json(res, { success: true, token, user: cleanProfile(row), mustChangePassword: !!row.data.mustChangePassword }, 200, origin);
    }
    if (action === "me") {
      const profile = await authenticatedProfile(req);
      if (!profile) return json(res, { error: "Not signed in." }, 401, origin);
      return json(res, { user: cleanProfile(profile.row), mustChangePassword: !!profile.data.mustChangePassword }, 200, origin);
    }
    if (action === "logout") return json(res, { success: true }, 200, origin);
    if (action === "change-password") {
      const profile = await authenticatedProfile(req);
      const password = String(input.password || "");
      if (!profile) return json(res, { error: "Not signed in." }, 401, origin);
      if (password.length < 12 || password.length > 128) return json(res, { error: "Password must be 12-128 characters." }, 400, origin);
      await updateRow(tables.staff, profile.row.$id, { passwordHash: hashPassword(password), mustChangePassword: false });
      return json(res, { success: true }, 200, origin);
    }
    if (action === "menu") {
      const [categories, products, images, settings] = await Promise.all([
        listRows(tables.categories), listRows(tables.products), listRows(tables.images), listRows(tables.settings)
      ]);
      return json(res, {
        categories: categories.map(r => ({ id: r.$id, ...r.data })).filter(x => x.active !== false),
        products: products.map(r => ({ id: r.$id, ...r.data, sizes: parseJson(r.data.sizes, []) })).filter(x => x.available !== false),
        images: images.map(r => ({ id: r.$id, ...r.data })).filter(x => x.active !== false),
        settings: settings[0]?.data || null
      }, 200, origin);
    }
    if (action.startsWith("admin.")) {
      const manager = await requireManager(req);
      if (!manager) return json(res, { error: "Manager access required." }, 403, origin);
      if (action === "admin.categories.list") {
        const rows = await listRows(tables.categories);
        return json(res, { categories: rows.map(r => ({ id: r.$id, ...r.data })) }, 200, origin);
      }
      if (action === "admin.categories.create") {
        const name = String(input.name || "").trim(), nameAr = String(input.nameAr || "").trim();
        if (!name || !nameAr) return json(res, { error: "Category names are required in both languages." }, 400, origin);
        const row = await createRow(tables.categories, { name, nameAr, sortOrder: Number(input.sortOrder || 0), active: true });
        return json(res, { category: { id: row.$id, ...row.data } }, 201, origin);
      }
      if (action === "admin.products.list") {
        const rows = await listRows(tables.products);
        return json(res, { products: rows.map(r => ({ id: r.$id, ...r.data, sizes: parseJson(r.data.sizes, []) })) }, 200, origin);
      }
      if (action === "admin.products.save") {
        const d = input.product || {};
        if (!d.name || !d.nameAr || !d.categoryId) return json(res, { error: "Product name and category are required." }, 400, origin);
        const data = { categoryId: String(d.categoryId), name: String(d.name), nameAr: String(d.nameAr), description: String(d.description || ""), descriptionAr: String(d.descriptionAr || ""), image: String(d.image || ""), price: d.price === "" || d.price == null ? null : Number(d.price), sizes: JSON.stringify(Array.isArray(d.sizes) ? d.sizes : []), available: d.available !== false, sortOrder: Number(d.sortOrder || 0) };
        const row = d.id ? await updateRow(tables.products, String(d.id), data) : await createRow(tables.products, data);
        return json(res, { product: { id: row.$id, ...row.data, sizes: parseJson(row.data.sizes, []) } }, 200, origin);
      }
      if (action === "admin.products.delete") {
        await deleteRow(tables.products, String(input.id || ""));
        return json(res, { success: true }, 200, origin);
      }
      if (action === "admin.images.list") {
        const rows = await listRows(tables.images, input.categoryId ? { method: "equal", attribute: "categoryId", values: [String(input.categoryId)] } : null);
        return json(res, { images: rows.map(r => ({ id: r.$id, ...r.data })) }, 200, origin);
      }
      if (action === "admin.staff.list") {
        const rows = await listRows(tables.staff);
        return json(res, { users: rows.map(cleanProfile) }, 200, origin);
      }
      if (action === "admin.staff.create") {
        const username = String(input.username || "").trim().toLowerCase();
        const password = String(input.password || "");
        const displayName = String(input.displayName || "").trim();
        if (!/^[a-z0-9._-]{3,64}$/.test(username) || !displayName || password.length < 12) return json(res, { error: "Enter a valid username, employee name and password of at least 12 characters." }, 400, origin);
        const matches = await listRows(tables.staff, { method: "equal", attribute: "username", values: [username] });
        if (matches.length) return json(res, { error: "Username already exists." }, 409, origin);
        const rowId = randomId();
        const row = await createRow(tables.staff, { userId: rowId, username, displayName, role: input.role === "manager" ? "manager" : "staff", active: true, mustChangePassword: true, passwordHash: hashPassword(password) }, rowId);
        return json(res, { user: cleanProfile(row) }, 201, origin);
      }
      if (action === "admin.staff.update") {
        const id = String(input.id || "");
        const row = await getRow(tables.staff, id);
        const patch = {};
        if (typeof input.active === "boolean") patch.active = input.active;
        if (input.role === "manager" || input.role === "staff") patch.role = input.role;
        if (input.password) {
          const password = String(input.password);
          if (password.length < 12 || password.length > 128) return json(res, { error: "Password must be 12-128 characters." }, 400, origin);
          patch.passwordHash = hashPassword(password);
          patch.mustChangePassword = true;
        }
        if (!Object.keys(patch).length) return json(res, { error: "No changes supplied." }, 400, origin);
        if (id === manager.row.$id && patch.active === false) return json(res, { error: "You cannot disable your own manager account." }, 400, origin);
        const updated = await updateRow(tables.staff, id, patch);
        return json(res, { user: cleanProfile(updated) }, 200, origin);
      }
      if (action === "admin.staff.delete") {
        const id = String(input.id || "");
        if (id === manager.row.$id) return json(res, { error: "You cannot delete your own manager account." }, 400, origin);
        await deleteRow(tables.staff, id);
        return json(res, { success: true }, 200, origin);
      }
      if (action === "admin.orders.list") {
        const rows = await listRows(tables.orders);
        return json(res, { orders: rows.map(r => ({ id: r.$id, ...r.data })) }, 200, origin);
      }
      if (action === "admin.settings.save") {
        const rows = await listRows(tables.settings);
        const row = rows[0] ? await updateRow(tables.settings, rows[0].$id, input.settings || {}) : await createRow(tables.settings, input.settings || {});
        return json(res, { settings: row.data }, 200, origin);
      }
    }
    if (action === "order.create") {
      const d = input.order || {};
      const lines = Array.isArray(d.items) ? d.items : [];
      if (!String(d.customerName || "").trim() || !String(d.phone || "").trim() || !lines.length) return json(res, { error: "Customer name, phone and at least one item are required." }, 400, origin);
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
      const total = lines.reduce((sum, x) => sum + Number(x.price || 0) * Number(x.quantity || 0), 0);
      const order = await createRow(tables.orders, { orderNumber, customerName: String(d.customerName), phone: String(d.phone), address: String(d.address || ""), notes: String(d.notes || ""), status: "pending", total, paymentMethod: String(d.paymentMethod || "cash"), createdBy: "customer" });
      for (const item of lines) await createRow(tables.items, { orderId: order.$id, productId: String(item.productId || ""), productName: String(item.productName || ""), quantity: Number(item.quantity || 1), unitPrice: Number(item.price || 0), selectedSize: String(item.selectedSize || ""), lineTotal: Number(item.price || 0) * Number(item.quantity || 1) });
      return json(res, { success: true, orderId: order.$id, orderNumber, total }, 201, origin);
    }
    return json(res, { error: "Unknown action." }, 404, origin);
  } catch (err) {
    return json(res, { error: err instanceof Error ? err.message : "Unexpected server error." }, 500, origin);
  }
}
function parseJson(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }

export default async ({ req, res, log, error }) => {
  log("Restaurant Menu API: " + req.method);
  return handle(req, res);
};
