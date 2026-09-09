import {
  Save,
  X,
  QrCode,
  RefreshCw,
  Upload,
  Edit,
  Trash2,
  Zap,
  Activity,
  User,
  History,
  FileText,
  GitMerge,
  Settings,
  Shield,
  Search,
  CheckCircle2,
  Archive,
  FileSearch,
  Layers3,
  BookOpen
} from "lucide-react";
import { formatCell } from "../../hooks/useCrud";
import { PanelTitle } from "./SharedComponents";

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

export function Field({ field, value, onChange }) {
  const common = {
    value: value ?? "",
    required: field.required,
    placeholder: field.placeholder,
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

export function iconFor(title) {
  if (!title) return <Layers3 size={18} />;
  // ── 6 nhóm nghiệp vụ chính chuẩn hóa ──────────────────────────────────────
  if (title === "Tạo kho & Thêm dữ liệu" || title.includes("Tạo kho") || title.includes("Thêm dữ liệu")) return <Archive size={18} />;
  if (title === "Chọn kho & Bóc tách dữ liệu" || title.includes("Bóc tách") || title.includes("AI") || title.includes("OCR")) return <Zap size={18} />;
  if (title === "Kiểm duyệt văn bản đã tách" || title.includes("Kiểm duyệt") || title.includes("phê duyệt") || title.includes("Duyệt")) return <CheckCircle2 size={18} />;
  if (title === "Tra cứu & Mượn trả" || title.includes("Tra cứu") || title.includes("mượn")) return <Search size={18} />;
  if (title === "Báo cáo & Thống kê" || title.includes("Báo cáo") || title.includes("Thống kê") || title.includes("Dashboard")) return <Activity size={18} />;
  if (title === "Cấu hình hệ thống" || title.includes("Cấu hình") || title.includes("Quản trị")) return <Settings size={18} />;
  if (title.includes("Hướng dẫn") || title.includes("Trợ giúp") || title.includes("Cẩm nang")) return <BookOpen size={18} />;

  // ── Các nhóm danh mục phụ & tương thích ngược ─────────────────────────────
  if (title.includes("Danh mục") || title.includes("Kho")) return <Archive size={18} />;
  if (title.includes("Số hóa")) return <Zap size={18} />;
  if (title.includes("Quản lý Hồ sơ") || title.includes("Tài liệu") || title.includes("hồ sơ")) return <FileText size={18} />;
  if (title.includes("Tìm")) return <Search size={18} />;
  if (title.includes("hệ thống")) return <Settings size={18} />;
  if (title.includes("Tài khoản")) return <User size={18} />;
  return <Layers3 size={18} />;
}

export default CrudScreen;
