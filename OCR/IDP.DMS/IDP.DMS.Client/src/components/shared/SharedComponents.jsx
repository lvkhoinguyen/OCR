/**
 * Shared UI components used across multiple screens.
 */

import { useState } from "react";
import { ChevronRight, FileText, Edit, Trash2, Upload, RefreshCw, QrCode, Save, X } from "lucide-react";
import { formatCell } from "../../hooks/useCrud";

/**
 * Displays a color-coded status badge for dossier/document workflow statuses.
 */
export function StatusBadge({ status }) {
  const map = {
    PUBLISHED: { label: "Xuất bản", color: "#16a34a", bg: "#dcfce7" },
    PENDING: { label: "Chờ", color: "#b45309", bg: "#fef3c7" },
    DRAFT: { label: "Nháp", color: "#6b7280", bg: "#f3f4f6" },
    APPROVED: { label: "Duyệt", color: "#16a34a", bg: "#dcfce7" },
    REJECTED: { label: "Từ chối", color: "#dc2626", bg: "#fee2e2" },
    CANCELLED: { label: "Hủy", color: "#6b7280", bg: "#f3f4f6" },
    NEEDS_SUPPLEMENT: { label: "Cần bổ sung", color: "#d97706", bg: "#ffedd5" },
    CONFIRMED: { label: "Xác nhận", color: "#2563eb", bg: "#dbeafe" },
    ACTIVE: { label: "Hoạt động", color: "#2563eb", bg: "#dbeafe" },
    IN_PROGRESS: { label: "Đang xử lý", color: "#7c3aed", bg: "#ede9fe" },
    DONE: { label: "Xong", color: "#16a34a", bg: "#dcfce7" },
  };
  const s = map[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

/**
 * Displays a color-coded OCR status badge.
 */
export function OcrBadge({ status }) {
  const map = {
    DONE: { icon: "✓", label: "Xong", color: "#16a34a", bg: "#dcfce7" },
    PENDING: { icon: "•", label: "Chờ", color: "#b45309", bg: "#fef3c7" },
    PROCESSING: { icon: "…", label: "Xử lý", color: "#7c3aed", bg: "#ede9fe" },
    ERROR: { icon: "!", label: "Lỗi", color: "#dc2626", bg: "#fee2e2" },
  };
  const s = map[status] || { icon: "•", label: status, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.icon} {s.label}
    </span>
  );
}

/**
 * Panel title bar with icon and text.
 */
export function PanelTitle({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontWeight: 700, fontSize: 14, borderBottom: "1px solid #e5e7eb" }}>
      {icon}
      <span>{title}</span>
    </div>
  );
}

/**
 * A simple metric display (label + value pair).
 */
export function Metric({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{value}</span>
      <span style={{ fontSize: 11, color: "#6b7280" }}>{label}</span>
    </div>
  );
}

/**
 * A recursive tree node component for document/dossier hierarchy display.
 */
export function TreeNode({ node, onSelect, level = 0 }) {
  const [open, setOpen] = useState(level < 1);
  const hasChildren = node.children?.length > 0;

  return (
    <div>
      <button
        className="gd21-tree-node"
        style={{ paddingLeft: 8 + level * 14 }}
        onClick={() => {
          if (hasChildren) setOpen((current) => !current);
          onSelect?.(node);
        }}
      >
        {hasChildren ? <ChevronRight size={13} className={open ? "open" : ""} /> : <FileText size={13} />}
        <span>{node.name}</span>
        <small>{node.count}</small>
      </button>
      {open && hasChildren && node.children.map((child) => (
        <TreeNode key={child.id} node={child} onSelect={onSelect} level={level + 1} />
      ))}
    </div>
  );
}

/**
 * Standard two-panel layout for GD2 feature screens.
 * Left panel: configuration form; Right panel: data list.
 */
export function GD2FeatureLayout({
  featureId, featureName, description, actor = "admin", phase = "Giai đoạn 2",
  actionBarLabel, actions,
  leftPanelTitle = "Thông tin cấu hình", rightPanelTitle = "Danh sách dữ liệu",
  leftPanel, rightPanel, midContent, splitRatio = "420px 1fr", className = "",
}) {
  return (
    <div className={`gd2-feature-wrap ${className}`.trim()}>
      <div className="gd2-feature-header">
        <h2 className="gd2-feature-title">{featureId}. {featureName}</h2>
        <div className="gd2-tags">
          <span className="gd2-tag phase">{phase} - Mở rộng nghiệp vụ</span>
          <span className="gd2-tag actor">Theo phân quyền đơn vị</span>
          <span className="gd2-tag role">{actor}</span>
        </div>
        <p className="gd2-feature-desc">{description}</p>
      </div>

      {actionBarLabel && (
        <div className="gd2-action-bar">
          <span className="gd2-action-label">{actionBarLabel}</span>
          <div className="gd2-action-btns">{actions}</div>
        </div>
      )}

      {midContent && <div className="gd2-mid-content">{midContent}</div>}
      <div className="gd2-split-panel" style={{ gridTemplateColumns: splitRatio }}>
        <div className="gd2-left-panel">
          {leftPanelTitle && <div className="gd2-panel-title">{leftPanelTitle}</div>}
          {leftPanel}
        </div>
        <div className="gd2-right-panel">
          {rightPanelTitle && <div className="gd2-panel-title">{rightPanelTitle}</div>}
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic data table with action buttons.
 */
export function DataTable({ rows, columns, onEdit, onDelete, onUpload, onHistory, onLabel }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty-cell">
                Chưa có dữ liệu hoặc chưa khởi tạo DB.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map(([key, , formatter]) => (
                  <td key={key}>{formatter ? formatter(row[key], row) : formatCell(row[key])}</td>
                ))}
                <td>
                  {onLabel && (
                    <button className="icon-btn label-action" onClick={() => onLabel(row)} title="In Mã Vạch / QR Code" style={{ marginRight: 5 }}>
                      <QrCode size={15} />
                    </button>
                  )}
                  {onHistory && (
                    <button className="icon-btn" style={{ color: '#0369a1', marginRight: 5 }} onClick={() => onHistory(row.id)} title="Lịch sử phiên bản">
                      <RefreshCw size={15} />
                    </button>
                  )}
                  {onUpload && (
                    <button className="icon-btn ok" onClick={() => onUpload(row.id)} title="Tải lên file & chạy OCR" style={{ marginRight: 5 }}>
                      <Upload size={15} />
                    </button>
                  )}
                  {onEdit && (
                    <button className="icon-btn primary" onClick={() => onEdit(row)} title="Sửa" style={{ marginRight: 5 }}>
                      <Edit size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-btn danger" onClick={() => onDelete(row.id)} title="Xóa">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Generic field component for forms.
 */
export function Field({ field, value, onChange }) {
  const common = {
    value: value ?? "",
    required: field.required,
    onChange: (event) => onChange(event.target.value)
  };
  return (
    <label className={field.required ? "field required" : "field"}>
      <span>{field.label}</span>
      {field.type === "textarea" ? (
        <textarea {...common} />
      ) : field.type === "select" ? (
        <select {...common}>
          {field.placeholder && <option value="">{field.placeholder}</option>}
          {field.options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onChange(file.name);
            }}
            style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
          />
          {value && (
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
              📄 Đã đính kèm: <strong>{value}</strong>
            </span>
          )}
        </div>
      ) : (
        <input type={field.type ?? "text"} {...common} />
      )}
    </label>
  );
}

/**
 * Generic CRUD screen component with form and data table.
 */
export function CrudScreen({ title, icon, crud, columns, fields, compact = false }) {
  return (
    <section className={compact ? "panel compact" : "panel"}>
      <PanelTitle icon={icon} title={title} />
      <form className="crud-form" onSubmit={crud.save}>
        {fields.map((field) => (
          <Field key={field.key} field={field} value={crud.form[field.key] ?? ""} onChange={(value) => crud.setField(field.key, value)} />
        ))}
        <div className="form-actions">
          <button className="btn primary" type="submit">
            <Save size={16} /> {crud.form.id ? "Cập nhật" : "Thêm mới"}
          </button>
          <button className="btn" type="button" onClick={crud.reset}>
            <X size={16} /> Bỏ qua
          </button>
        </div>
      </form>
      {crud.error && <div className="alert">{crud.error}</div>}
      <DataTable rows={crud.rows} columns={columns} onEdit={crud.edit} onDelete={crud.remove} />
    </section>
  );
}
