import { useState, useMemo, lazy, Suspense } from "react";
import { Archive, Layers3, Search, RefreshCw, Save, X, QrCode, Edit, Trash2, Sparkles } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptyStorage } from "../../utils/constants";
import { PanelTitle, StatusBadge } from "../shared/SharedComponents";
import { uiApi } from "../../services/uiApi";

const ArchiveLabelModal = lazy(() => import("../ArchiveLabelModal"));

export default function StorageScreen() {
  const crud = useCrud("storage", emptyStorage);
  const [filterType, setFilterType] = useState("ALL");
  const [keyword, setKeyword] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [labelItem, setLabelItem] = useState(null);

  // Cascading selector state for manual form
  const [selectedKhoId, setSelectedKhoId] = useState("");
  const [selectedKeId, setSelectedKeId] = useState("");
  const [selectedTangId, setSelectedTangId] = useState("");

  // Auto generate modal state
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoForm, setAutoForm] = useState({
    warehouseId: "",
    shelfCode: "KE-01",
    shelfName: "Kệ lưu trữ 01",
    floorCount: 5,
    boxesPerFloor: 10,
    boxCapacity: 20
  });
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState("");
  const [autoSuccess, setAutoSuccess] = useState("");

  const type = crud.form.locationType || "KHO";
  const typeMeta = {
    KHO: { label: "Kho", parent: null, parentLabel: "", color: "blue" },
    KE: { label: "Kệ", parent: "KHO", parentLabel: "Kho trực thuộc", color: "violet" },
    TANG: { label: "Tầng", parent: "KE", parentLabel: "Kệ trực thuộc", color: "amber" },
    HOP: { label: "Hộp", parent: "TANG", parentLabel: "Tầng trực thuộc", color: "green" }
  };

  const rowById = useMemo(() => new Map(crud.rows.map(row => [Number(row.id), row])), [crud.rows]);

  // Hierarchical helper collections
  const khoOptions = useMemo(
    () => crud.rows.filter(row => row.locationType === "KHO"),
    [crud.rows]
  );

  const keOptionsForSelectedKho = useMemo(
    () => selectedKhoId
      ? crud.rows.filter(row => row.locationType === "KE" && Number(row.parentId) === Number(selectedKhoId))
      : [],
    [crud.rows, selectedKhoId]
  );

  const tangOptionsForSelectedKe = useMemo(
    () => selectedKeId
      ? crud.rows.filter(row => row.locationType === "TANG" && Number(row.parentId) === Number(selectedKeId))
      : [],
    [crud.rows, selectedKeId]
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
    setSelectedKhoId("");
    setSelectedKeId("");
    setSelectedTangId("");
  }

  function editStorage(row) {
    crud.edit(row);
    const locType = row.locationType || "KHO";
    setFilterType(locType);

    if (locType === "KHO") {
      setSelectedKhoId("");
      setSelectedKeId("");
      setSelectedTangId("");
    } else if (locType === "KE") {
      setSelectedKhoId(String(row.parentId || ""));
      setSelectedKeId("");
      setSelectedTangId("");
    } else if (locType === "TANG") {
      const shelf = rowById.get(Number(row.parentId));
      setSelectedKhoId(String(shelf?.parentId || ""));
      setSelectedKeId(String(row.parentId || ""));
      setSelectedTangId("");
    } else if (locType === "HOP") {
      const floor = rowById.get(Number(row.parentId));
      const shelf = rowById.get(Number(floor?.parentId));
      setSelectedKhoId(String(shelf?.parentId || ""));
      setSelectedKeId(String(floor?.parentId || ""));
      setSelectedTangId(String(row.parentId || ""));
    }
  }

  function resetForm() {
    crud.reset();
    setSelectedKhoId("");
    setSelectedKeId("");
    setSelectedTangId("");
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

  function openAutoGenerateModal() {
    const firstKho = crud.rows.find(r => r.locationType === "KHO");
    if (firstKho && !autoForm.warehouseId) {
      setAutoForm(prev => ({ ...prev, warehouseId: String(firstKho.id) }));
    }
    setAutoError("");
    setAutoSuccess("");
    setShowAutoModal(true);
  }

  async function handleAutoGenerate(e) {
    e.preventDefault();
    setAutoError("");
    setAutoSuccess("");

    if (!autoForm.warehouseId) {
      setAutoError("Vui lòng chọn Kho lưu trữ đích.");
      return;
    }
    if (!autoForm.shelfCode.trim()) {
      setAutoError("Vui lòng nhập mã Kệ.");
      return;
    }
    if (!autoForm.shelfName.trim()) {
      setAutoError("Vui lòng nhập tên Kệ.");
      return;
    }

    try {
      setAutoLoading(true);
      const res = await uiApi.autoGenerateStorage({
        warehouseId: Number(autoForm.warehouseId),
        shelfCode: autoForm.shelfCode.trim().toUpperCase(),
        shelfName: autoForm.shelfName.trim(),
        floorCount: Number(autoForm.floorCount),
        boxesPerFloor: Number(autoForm.boxesPerFloor),
        boxCapacity: Number(autoForm.boxCapacity)
      });
      setAutoSuccess(res?.message || "Tự động sinh Kệ - Tầng - Hộp thành công!");
      await crud.load();
      setTimeout(() => {
        setShowAutoModal(false);
        setAutoSuccess("");
      }, 1500);
    } catch (err) {
      setAutoError(err.message || "Lỗi khi sinh tự động.");
    } finally {
      setAutoLoading(false);
    }
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
        <button className="btn primary" type="button" onClick={openAutoGenerateModal}>
          <Sparkles size={15}/> Tự động sinh Kệ - Tầng - Hộp
        </button>
        <button className="btn" type="button" onClick={crud.load}><RefreshCw size={15}/> Tải lại</button>
      </div>

      <div className="storage-workspace">
        <form className="storage-form" onSubmit={crud.save}>
          <div className="storage-form-title">
            <span>{crud.form.id ? "Chỉnh sửa vị trí lưu trữ" : `Thêm ${typeMeta[type].label.toLowerCase()} mới`}</span>
            <small>Cấu trúc phân cấp: Kho → Kệ → Tầng → Hộp</small>
          </div>

          <label className="field required">
            <span>Loại vị trí</span>
            <select
              value={type}
              onChange={event => {
                const nextType = event.target.value;
                crud.setField("locationType", nextType);
                crud.setField("parentId", "");
                setSelectedKhoId("");
                setSelectedKeId("");
                setSelectedTangId("");
              }}
            >
              {Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
          </label>

          {/* Cascading selectors depending on location type */}
          {type === "KE" && (
            <label className="field required">
              <span>Kho trực thuộc (*)</span>
              <select
                value={selectedKhoId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedKhoId(val);
                  crud.setField("parentId", val);
                }}
                required
              >
                <option value="">-- Chọn Kho lưu trữ --</option>
                {khoOptions.map(kho => (
                  <option key={kho.id} value={kho.id}>{kho.code} - {kho.name}</option>
                ))}
              </select>
              {!khoOptions.length && <small className="storage-field-note" style={{ color: "#dc2626" }}>Cần tạo Kho trước khi thêm Kệ.</small>}
            </label>
          )}

          {type === "TANG" && (
            <>
              <label className="field required">
                <span>1. Chọn Kho trực thuộc (*)</span>
                <select
                  value={selectedKhoId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedKhoId(val);
                    setSelectedKeId("");
                    crud.setField("parentId", "");
                  }}
                  required
                >
                  <option value="">-- Chọn Kho --</option>
                  {khoOptions.map(kho => (
                    <option key={kho.id} value={kho.id}>{kho.code} - {kho.name}</option>
                  ))}
                </select>
              </label>

              <label className="field required">
                <span>2. Chọn Kệ thuộc Kho (*)</span>
                <select
                  value={selectedKeId}
                  disabled={!selectedKhoId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedKeId(val);
                    crud.setField("parentId", val);
                  }}
                  required
                >
                  <option value="">{selectedKhoId ? "-- Chọn Kệ --" : "-- Hãy chọn Kho trước --"}</option>
                  {keOptionsForSelectedKho.map(ke => (
                    <option key={ke.id} value={ke.id}>{ke.code} - {ke.name}</option>
                  ))}
                </select>
                {selectedKhoId && !keOptionsForSelectedKho.length && (
                  <small className="storage-field-note" style={{ color: "#dc2626" }}>Kho này chưa có Kệ nào. Hãy tạo Kệ trước.</small>
                )}
              </label>
            </>
          )}

          {type === "HOP" && (
            <>
              <label className="field required">
                <span>1. Chọn Kho trực thuộc (*)</span>
                <select
                  value={selectedKhoId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedKhoId(val);
                    setSelectedKeId("");
                    setSelectedTangId("");
                    crud.setField("parentId", "");
                  }}
                  required
                >
                  <option value="">-- Chọn Kho --</option>
                  {khoOptions.map(kho => (
                    <option key={kho.id} value={kho.id}>{kho.code} - {kho.name}</option>
                  ))}
                </select>
              </label>

              <label className="field required">
                <span>2. Chọn Kệ thuộc Kho (*)</span>
                <select
                  value={selectedKeId}
                  disabled={!selectedKhoId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedKeId(val);
                    setSelectedTangId("");
                    crud.setField("parentId", "");
                  }}
                  required
                >
                  <option value="">{selectedKhoId ? "-- Chọn Kệ --" : "-- Hãy chọn Kho trước --"}</option>
                  {keOptionsForSelectedKho.map(ke => (
                    <option key={ke.id} value={ke.id}>{ke.code} - {ke.name}</option>
                  ))}
                </select>
                {selectedKhoId && !keOptionsForSelectedKho.length && (
                  <small className="storage-field-note" style={{ color: "#dc2626" }}>Kho này chưa có Kệ nào.</small>
                )}
              </label>

              <label className="field required">
                <span>3. Chọn Tầng thuộc Kệ (*)</span>
                <select
                  value={selectedTangId}
                  disabled={!selectedKeId}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedTangId(val);
                    crud.setField("parentId", val);
                  }}
                  required
                >
                  <option value="">{selectedKeId ? "-- Chọn Tầng --" : "-- Hãy chọn Kệ trước --"}</option>
                  {tangOptionsForSelectedKe.map(tang => (
                    <option key={tang.id} value={tang.id}>{tang.code} - {tang.name}</option>
                  ))}
                </select>
                {selectedKeId && !tangOptionsForSelectedKe.length && (
                  <small className="storage-field-note" style={{ color: "#dc2626" }}>Kệ này chưa có Tầng nào.</small>
                )}
              </label>
            </>
          )}

          <label className="field required">
            <span>Mã {typeMeta[type].label.toLowerCase()} (*)</span>
            <input value={crud.form.code || ""} onChange={event => crud.setField("code", event.target.value)} required placeholder={`Ví dụ: ${type}-01`} />
          </label>
          <label className="field required">
            <span>Tên {typeMeta[type].label.toLowerCase()} (*)</span>
            <input value={crud.form.name || ""} onChange={event => crud.setField("name", event.target.value)} required placeholder={`Tên ${typeMeta[type].label.toLowerCase()}...`} />
          </label>
          <label className="field">
            <span>Sức chứa dự kiến</span>
            <input type="number" min="0" value={crud.form.capacity || ""} onChange={event => crud.setField("capacity", event.target.value)} placeholder="Số hồ sơ / tài liệu" />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select value={crud.form.status || "ACTIVE"} onChange={event => crud.setField("status", event.target.value)}>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </label>

          <div className="form-actions">
            <button className="btn primary" type="submit"><Save size={15}/> {crud.form.id ? "Cập nhật" : "Thêm mới"}</button>
            <button className="btn" type="button" onClick={resetForm}><X size={15}/> Bỏ qua</button>
          </div>
          {crud.error && <div className="alert">{crud.error}</div>}
        </form>

        <div className="storage-table-panel">
          <div className="storage-list-title"><strong>Cây vị trí lưu trữ</strong><span>{visibleRows.length} / {crud.rows.length} vị trí</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Loại</th><th>Mã</th><th>Đường dẫn phân cấp vị trí</th><th>Sức chứa</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
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
                {!visibleRows.length && <tr><td colSpan={6} className="empty-cell">Chưa có vị trí phù hợp. Hãy tạo theo thứ tự Kho → Kệ → Tầng → Hộp hoặc bấm "Tự động sinh Kệ - Tầng - Hộp".</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Auto-generate Modal */}
      {showAutoModal && (
        <div className="modal-overlay" onClick={() => setShowAutoModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: "100%" }}>
            <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="modal-icon-wrap" style={{ background: "#2563eb", width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center" }}>
                  <Layers3 size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Tự động sinh Kệ - Tầng - Hộp</h3>
                  <span className="muted" style={{ fontSize: 13, display: "block", marginTop: 2 }}>Khởi tạo nhanh cấu trúc phân cấp vật lý theo Kho</span>
                </div>
              </div>
              <button className="icon-btn" type="button" onClick={() => setShowAutoModal(false)}><X size={18} /></button>
            </div>

            {autoError && <div className="alert danger" style={{ marginBottom: 14 }}>{autoError}</div>}
            {autoSuccess && <div className="alert success" style={{ marginBottom: 14 }}>{autoSuccess}</div>}

            <form onSubmit={handleAutoGenerate} style={{ display: "grid", gap: 12 }}>
              <label className="field required">
                <span>Kho lưu trữ đích (*)</span>
                <select
                  value={autoForm.warehouseId}
                  onChange={e => setAutoForm({ ...autoForm, warehouseId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn Kho lưu trữ --</option>
                  {khoOptions.map(kho => (
                    <option key={kho.id} value={kho.id}>{kho.code} - {kho.name}</option>
                  ))}
                </select>
                {!khoOptions.length && (
                  <small style={{ color: "#dc2626", marginTop: 4, display: "block" }}>
                    Chưa có Kho nào trong hệ thống! Hãy tạo 1 Kho trước ở form quản lý.
                  </small>
                )}
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field required">
                  <span>Mã Kệ (*)</span>
                  <input
                    value={autoForm.shelfCode}
                    onChange={e => setAutoForm({ ...autoForm, shelfCode: e.target.value })}
                    required
                    placeholder="Ví dụ: KE-01"
                  />
                </label>
                <label className="field required">
                  <span>Tên Kệ (*)</span>
                  <input
                    value={autoForm.shelfName}
                    onChange={e => setAutoForm({ ...autoForm, shelfName: e.target.value })}
                    required
                    placeholder="Ví dụ: Kệ tài liệu 01"
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label className="field required">
                  <span>Số tầng (*)</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={autoForm.floorCount}
                    onChange={e => setAutoForm({ ...autoForm, floorCount: e.target.value })}
                    required
                  />
                </label>
                <label className="field required">
                  <span>Số hộp / tầng (*)</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={autoForm.boxesPerFloor}
                    onChange={e => setAutoForm({ ...autoForm, boxesPerFloor: e.target.value })}
                    required
                  />
                </label>
                <label className="field required">
                  <span>Sức chứa / hộp (*)</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={autoForm.boxCapacity}
                    onChange={e => setAutoForm({ ...autoForm, boxCapacity: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#166534",
                lineHeight: 1.6
              }}>
                <div><strong>Dự kiến sinh tự động:</strong></div>
                <div>• <strong>1</strong> Kệ (<code>{autoForm.shelfCode || "KE-01"}</code>)</div>
                <div>• <strong>{Number(autoForm.floorCount) || 0}</strong> Tầng (<code>{autoForm.shelfCode || "KE-01"}-T01</code> ... <code>{autoForm.shelfCode || "KE-01"}-T{String(autoForm.floorCount).padStart(2, "0")}</code>)</div>
                <div>• <strong>{(Number(autoForm.floorCount) || 0) * (Number(autoForm.boxesPerFloor) || 0)}</strong> Hộp (mỗi hộp chứa {autoForm.boxCapacity || 0} hồ sơ)</div>
                <div>&rarr; <strong>Tổng cộng: {1 + (Number(autoForm.floorCount) || 0) + (Number(autoForm.floorCount) || 0) * (Number(autoForm.boxesPerFloor) || 0)} vị trí</strong> (Tổng sức chứa toàn kệ: {(Number(autoForm.floorCount) || 0) * (Number(autoForm.boxesPerFloor) || 0) * (Number(autoForm.boxCapacity) || 0)} hồ sơ)</div>
              </div>

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button className="btn" type="button" onClick={() => setShowAutoModal(false)} disabled={autoLoading}>
                  Đóng
                </button>
                <button className="btn primary" type="submit" disabled={autoLoading || !khoOptions.length}>
                  {autoLoading ? <RefreshCw className="spin" size={15}/> : <Sparkles size={15}/>}
                  {autoLoading ? " Đang khởi tạo..." : " Tiến hành sinh tự động"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {labelItem && <Suspense fallback={null}><ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} /></Suspense>}
    </section>
  );
}
