import { useState, useMemo, lazy, Suspense } from "react";
import { Archive, Layers3, Search, RefreshCw, Save, X, QrCode, Edit, Trash2 } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptyStorage } from "../../utils/constants";
import { PanelTitle, StatusBadge } from "../shared/SharedComponents";

const ArchiveLabelModal = lazy(() => import("../ArchiveLabelModal"));

export default function StorageScreen() {
  const crud = useCrud("storage", emptyStorage);
  const [filterType, setFilterType] = useState("ALL");
  const [keyword, setKeyword] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [labelItem, setLabelItem] = useState(null);
  const type = crud.form.locationType || "KHO";
  const typeMeta = {
    KHO: { label: "Kho", parent: null, parentLabel: "", color: "blue" },
    KE: { label: "Kệ", parent: "KHO", parentLabel: "Kho trực thuộc", color: "violet" },
    TANG: { label: "Tầng", parent: "KE", parentLabel: "Kệ trực thuộc", color: "amber" },
    HOP: { label: "Hộp", parent: "TANG", parentLabel: "Tầng trực thuộc", color: "green" }
  };
  const rowById = useMemo(() => new Map(crud.rows.map(row => [Number(row.id), row])), [crud.rows]);
  const parentOptions = useMemo(
    () => crud.rows.filter(row => row.locationType === typeMeta[type].parent),
    [crud.rows, type]
  );
  const visibleRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return crud.rows.filter(row => {
      const matchesType = filterType === "ALL" || row.locationType === filterType;
      const matchesKeyword = !normalizedKeyword || `${row.code} ${row.name}`.toLowerCase().includes(normalizedKeyword);
      return matchesType && matchesKeyword;
    });
  }, [crud.rows, filterType, keyword]);

  function hierarchyPath(row) {
    const path = [];
    const visited = new Set();
    let current = row;
    while (current && !visited.has(Number(current.id))) {
      visited.add(Number(current.id));
      path.unshift(current.name);
      current = rowById.get(Number(current.parentId));
    }
    return path.join(" / ");
  }

  function selectLocationType(nextType) {
    setFilterType(nextType);
    crud.setField("locationType", nextType);
    crud.setField("parentId", "");
  }

  function editStorage(row) {
    crud.edit(row);
    setFilterType(row.locationType || "ALL");
  }

  function openBoxLabel(row) {
    setLabelItem({
      entityType: "BOX",
      id: row.id,
      code: row.code,
      name: row.name,
      location: hierarchyPath(row),
      createdAt: row.createdAt
    });
  }

  return (
    <section className="panel storage-management">
      <div className="storage-heading">
        <PanelTitle icon={<Archive />} title="Danh mục Kho - Kệ - Tầng - Hộp" />
        <p>Thiết lập đúng cây vị trí vật lý để hồ sơ, tài liệu OCR được lưu và tra cứu theo từng cấp.</p>
      </div>

      <div className="storage-type-grid">
        {Object.entries(typeMeta).map(([key, meta]) => {
          const count = crud.rows.filter(row => row.locationType === key).length;
          return (
            <button key={key} type="button" className={`storage-type-card ${meta.color} ${filterType === key ? "active" : ""}`} onClick={() => selectLocationType(key)}>
              <span>{key === "KHO" ? <Archive size={20}/> : <Layers3 size={20}/>}</span>
              <strong>{count}</strong>
              <small>{meta.label} lưu trữ</small>
            </button>
          );
        })}
      </div>

      <div className="storage-toolbar">
        <div className="storage-search"><Search size={16}/><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm theo mã hoặc tên vị trí..." /></div>
        <select value={filterType} onChange={event => setFilterType(event.target.value)}>
          <option value="ALL">Tất cả cấp lưu trữ</option>
          {Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <button className="btn" type="button" onClick={crud.load}><RefreshCw size={15}/> Tải lại</button>
      </div>

      <div className="storage-workspace">
        <form className="storage-form" onSubmit={crud.save}>
          <div className="storage-form-title">
            <span>{crud.form.id ? "Chỉnh sửa vị trí lưu trữ" : `Thêm ${typeMeta[type].label.toLowerCase()} mới`}</span>
            <small>Cấu trúc: Kho → Kệ → Tầng → Hộp</small>
          </div>
          <label className="field required">
            <span>Loại vị trí</span>
            <select value={type} onChange={event => { crud.setField("locationType", event.target.value); crud.setField("parentId", ""); }}>
              {Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
          </label>
          {typeMeta[type].parent && (
            <label className="field required">
              <span>{typeMeta[type].parentLabel}</span>
              <select value={crud.form.parentId || ""} onChange={event => crud.setField("parentId", event.target.value)} required>
                <option value="">-- Chọn {typeMeta[type].parentLabel.toLowerCase()} --</option>
                {parentOptions.map(row => <option key={row.id} value={row.id}>{row.code} - {hierarchyPath(row)}</option>)}
              </select>
              {!parentOptions.length && <small className="storage-field-note">Cần tạo {typeMeta[typeMeta[type].parent].label.toLowerCase()} cha trước.</small>}
            </label>
          )}
          <label className="field required"><span>Mã {typeMeta[type].label.toLowerCase()}</span><input value={crud.form.code || ""} onChange={event => crud.setField("code", event.target.value)} required placeholder={`Ví dụ: ${type}-01`} /></label>
          <label className="field required"><span>Tên {typeMeta[type].label.toLowerCase()}</span><input value={crud.form.name || ""} onChange={event => crud.setField("name", event.target.value)} required /></label>
          <label className="field"><span>Sức chứa dự kiến</span><input type="number" min="0" value={crud.form.capacity || ""} onChange={event => crud.setField("capacity", event.target.value)} placeholder="Số hồ sơ / tài liệu" /></label>
          <label className="field"><span>Trạng thái</span><select value={crud.form.status || "ACTIVE"} onChange={event => crud.setField("status", event.target.value)}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
          <div className="form-actions">
            <button className="btn primary" type="submit"><Save size={15}/> {crud.form.id ? "Cập nhật" : "Thêm mới"}</button>
            <button className="btn" type="button" onClick={crud.reset}><X size={15}/> Bỏ qua</button>
          </div>
          {crud.error && <div className="alert">{crud.error}</div>}
        </form>

        <div className="storage-table-panel">
          <div className="storage-list-title"><strong>Cây vị trí lưu trữ</strong><span>{visibleRows.length} / {crud.rows.length} vị trí</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Loại</th><th>Mã</th><th>Đường dẫn vị trí</th><th>Sức chứa</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {visibleRows.map(row => (
                  <tr key={row.id}>
                    <td><span className={`storage-kind ${typeMeta[row.locationType]?.color || "blue"}`}>{typeMeta[row.locationType]?.label || row.locationType}</span></td>
                    <td><span className="gd2-code">{row.code}</span></td>
                    <td><strong>{hierarchyPath(row)}</strong>{row.parentId && <small className="storage-parent">Cấp cha: {rowById.get(Number(row.parentId))?.code || row.parentId}</small>}</td>
                    <td>{row.capacity || 0}</td>
                    <td><StatusBadge status={row.status || "ACTIVE"}/></td>
                    <td>
                      {row.locationType === "HOP" && <button className="icon-btn label-action" type="button" onClick={() => openBoxLabel(row)} title="In Mã Vạch / QR Code"><QrCode size={14}/></button>}
                      <button className="icon-btn primary" type="button" onClick={() => editStorage(row)} title="Sửa"><Edit size={14}/></button>
                      <button className="icon-btn danger" type="button" onClick={() => crud.remove(row.id)} title="Xóa"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && <tr><td colSpan={6} className="empty-cell">Chưa có vị trí phù hợp. Hãy tạo theo thứ tự Kho → Kệ → Tầng → Hộp.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {labelItem && <Suspense fallback={null}><ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} /></Suspense>}
    </section>
  );
}
