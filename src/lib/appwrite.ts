const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "pizza-royal-menu";
const FUNCTION_ID = "menu-api";
const TOKEN_KEY = "restaurant-menu-session";

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function saveMenuToken(value: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, value);
}
export function clearMenuToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export async function callMenuApi(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch(ENDPOINT + "/functions/" + FUNCTION_ID + "/executions", {
    method: "POST",
    headers: {
      "X-Appwrite-Project": PROJECT_ID,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      body: JSON.stringify({ action, ...payload }),
      async: false,
      path: "/",
      method: "POST",
      headers: token() ? { Authorization: "Bearer " + token() } : {}
    })
  });
  const execution = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(execution.message || execution.error || "Appwrite request failed.");
  let result: any = {};
  try {
    result = typeof execution.responseBody === "string"
      ? JSON.parse(execution.responseBody || "{}")
      : (execution.responseBody || {});
  } catch {
    throw new Error("Appwrite returned an invalid response.");
  }
  if (execution.status === "failed" || (execution.responseStatusCode && execution.responseStatusCode >= 400)) {
    throw new Error(result.error || "Appwrite request failed.");
  }
  return result;
}

function mapCategory(c: any) {
  return { id: c.id, name: c.name, name_ar: c.nameAr, sort_order: c.sortOrder || 0, is_visible: c.active === false ? 0 : 1 };
}
function mapProduct(p: any) {
  return {
    id: p.id, category_id: p.categoryId, name: p.name, name_ar: p.nameAr,
    description: p.description || "", description_ar: p.descriptionAr || "",
    image_url: p.image || "", image: p.image || "", price: p.price,
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    is_available: p.available !== false, sort_order: p.sortOrder || 0
  };
}
function mapUser(u: any) {
  return {
    id: u.id, username: u.username, display_name: u.displayName,
    role: u.role, is_active: u.active !== false,
    must_change_password: !!u.mustChangePassword, created_at: u.createdAt
  };
}

export async function api(path: string, options: RequestInit = {}) {
  const method = String(options.method || "GET").toUpperCase();
  let body: any = {};
  if (typeof options.body === "string") {
    try { body = JSON.parse(options.body); } catch { body = {}; }
  }
  if (path === "/api/auth/me") {
    const d = await callMenuApi("me");
    return { user: d.user ? { ...d.user, display_name: d.user.displayName } : null, mustChangePassword: d.mustChangePassword };
  }
  if (path === "/api/auth/login") {
    const d = await callMenuApi("login", body);
    if (d.token) saveMenuToken(d.token);
    return { ...d, user: d.user ? { ...d.user, display_name: d.user.displayName } : null };
  }
  if (path === "/api/auth/change-password") return callMenuApi("change-password", body);
  if (path === "/api/auth/logout") {
    try { return await callMenuApi("logout"); } finally { clearMenuToken(); }
  }
  if (path === "/api/admin/categories" && method === "GET") {
    const d = await callMenuApi("admin.categories.list");
    return { categories: (d.categories || []).map(mapCategory) };
  }
  if (path === "/api/admin/categories" && method === "POST") {
    const d = await callMenuApi("admin.categories.create", { name: body.name, nameAr: body.name_ar });
    return { category: mapCategory(d.category) };
  }
  if (path === "/api/admin/products" && method === "GET") {
    const d = await callMenuApi("admin.products.list");
    return { products: (d.products || []).map(mapProduct) };
  }
  if (path === "/api/admin/products" || path.startsWith("/api/admin/products/")) {
    const id = path.split("/").pop() || "";
    if (method === "DELETE") return callMenuApi("admin.products.delete", { id });
    const product = {
      id: method === "PUT" ? id : undefined,
      name: body.name, nameAr: body.name_ar, categoryId: body.category_id,
      description: body.description, descriptionAr: body.description_ar,
      price: body.price, sizes: body.sizes, image: body.image || body.image_url || "",
      available: body.is_available !== false, sortOrder: body.sort_order || 0
    };
    const d = await callMenuApi("admin.products.save", { product });
    return { product: mapProduct(d.product) };
  }
  if (path === "/api/admin/users" && method === "GET") {
    const d = await callMenuApi("admin.staff.list");
    return { users: (d.users || []).map(mapUser) };
  }
  if (path === "/api/admin/users" && method === "POST") {
    const d = await callMenuApi("admin.staff.create", { username: body.username, displayName: body.display_name, password: body.password, role: body.role });
    return { user: mapUser(d.user) };
  }
  if (path.startsWith("/api/admin/users/") && method === "DELETE") return callMenuApi("admin.staff.delete", { id: path.split("/").pop() });
  if (path.startsWith("/api/admin/users/") && method === "PATCH") {
    const id = path.split("/").pop() || "";
    const patch: any = { id };
    if (body.action === "set-active") patch.active = body.is_active;
    if (body.action === "set-role") patch.role = body.role;
    if (body.action === "reset-password") patch.password = body.password;
    const d = await callMenuApi("admin.staff.update", patch);
    return { user: mapUser(d.user) };
  }
  if (path.startsWith("/api/admin/users/") && method === "DELETE") {
    return callMenuApi("admin.staff.delete", { id: path.split("/").pop() });
  }
  if (path === "/api/menu") {
    const d = await callMenuApi("menu");
    return { ...d, categories: (d.categories || []).map(mapCategory), products: (d.products || []).map(mapProduct) };
  }
  throw new Error("Unsupported Appwrite API route: " + path);
}
