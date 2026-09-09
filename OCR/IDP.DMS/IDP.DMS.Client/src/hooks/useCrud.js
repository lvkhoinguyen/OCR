import { useState, useEffect } from "react";
import { uiApi } from "../services/uiApi";

/**
 * Generic CRUD hook for simple resource screens.
 * Handles list loading, form state, save (create/update), and delete.
 *
 * @param {string} type - API resource type (e.g. "dossiers", "documents")
 * @param {object} emptyForm - Shape of an empty form (used for reset)
 */
export function useCrud(type, emptyForm) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const api = uiApi.crud(type);

  async function load() {
    try {
      setError("");
      setRows(await api.list());
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(row) {
    setForm(toForm(row, emptyForm));
  }

  async function save(event) {
    event.preventDefault();
    try {
      setError("");
      const payload = toPayload(form);
      if (form.id) {
        await api.update(form.id, payload);
      } else {
        await api.create(payload);
      }
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Xóa bản ghi đã chọn?")) return;
    try {
      setError("");
      await api.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return { rows, form, error, load, setField, edit, save, remove, reset: () => setForm(emptyForm) };
}

/** Converts a form state object to an API payload (strips id, coerces types). */
export function toPayload(form) {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    if (key === "id") return;
    if (value === "") payload[key] = null;
    else if (["parentId", "capacity", "storageId", "dossierId"].includes(key)) payload[key] = Number(value);
    else payload[key] = value;
  });
  return payload;
}

/** Converts a row from the API back into a form state object. */
export function toForm(row, emptyForm) {
  const next = { ...emptyForm, id: row.id };
  Object.keys(emptyForm).forEach((key) => {
    const value = row[key];
    if (value == null) {
      next[key] = "";
    } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      next[key] = value.slice(0, 10);
    } else {
      next[key] = String(value);
    }
  });
  return next;
}

const statusTranslations = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ kiểm duyệt",
  WAITING_APPROVAL: "Chờ kiểm duyệt",
  APPROVED: "Đã phê duyệt",
  NEEDS_SUPPLEMENT: "Cần bổ sung",
  REJECTED: "Từ chối",
  PUBLISHED: "Đã xuất bản",
  CONFIRMED: "Đã xác nhận",
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
  DONE: "Đã bóc tách",
  PROCESSING: "Đang xử lý...",
  ERROR: "Lỗi xử lý",
  CANCELLED: "Đã hủy"
};

/** Formats a table cell value for display. */
export function formatCell(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "string") {
    if (value.includes("T00:00:00")) return value.slice(0, 10);
    const upper = value.trim().toUpperCase();
    if (statusTranslations[upper]) return statusTranslations[upper];
  }
  return String(value);
}

/** Returns a user-friendly label for the first extra field based on resource type. */
export function extraLabel1(resource) {
  if (resource === "users") return "Email";
  if (resource === "dossier-types") return "Thời hạn bảo quản";
  if (["org-units", "departments", "admin-units"].includes(resource)) return "Cấp/loại đơn vị";
  if (["permission-groups", "roles", "user-groups"].includes(resource)) return "Phạm vi quyền";
  if (["reports", "report-groups"].includes(resource)) return "Loại báo cáo";
  if (resource.includes("ticket") || resource.includes("request")) return "Người yêu cầu";
  if (resource.includes("import")) return "File nguồn";
  return "Thông tin 1";
}

/** Returns a user-friendly label for the second extra field based on resource type. */
export function extraLabel2(resource) {
  if (resource === "users") return "Số điện thoại";
  if (["org-units", "departments", "admin-units"].includes(resource)) return "Địa chỉ";
  if (["permission-groups", "roles", "user-groups"].includes(resource)) return "Vai trò/nhóm";
  if (["reports", "report-groups"].includes(resource)) return "File mẫu";
  if (resource.includes("ticket") || resource.includes("request")) return "Người xử lý";
  if (resource.includes("import")) return "Kết quả import";
  return "Thông tin 2";
}
