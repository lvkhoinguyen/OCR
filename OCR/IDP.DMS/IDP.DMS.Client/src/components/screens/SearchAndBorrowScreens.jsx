import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import {
  Search,
  FileSearch,
  BookOpen,
  Eye,
  Download,
  X,
  FileText,
  Archive,
  CheckCircle2,
  AlertCircle,
  File,
  RefreshCw,
  Send,
  User,
  Building2,
  Calendar,
  MessageSquare,
  RotateCcw,
  Ban,
  Check
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { emptyDossier, emptyStorage, emptyBorrow } from "../../utils/constants";
import { PanelTitle, StatusBadge, CrudScreen } from "../shared/SharedComponents";
import { formatFileSize, getFileExtension } from "./DocumentPanel";

const ArchiveLabelModal = lazy(() => import("../ArchiveLabelModal"));

/* ─── Helpers ───────────────────────────────────────────── */
export function exploitModeLabel(mode) {
  return {
    ONLINE_READ: "Bản mềm (Xem trực tuyến)",
    SOFT_COPY: "Bản mềm (Tải về)",
    HARD_COPY: "Bản cứng (Mượn gốc)"
  }[mode] || mode || "--";
}

export function borrowStatusLabel(status) {
  return {
    PENDING: "Chờ kiểm duyệt",
    APPROVED: "Đang mượn / Đã duyệt",
    BORROWED: "Đang mượn",
    HANDED_OVER: "Đã bàn giao",
    REJECTED: "Từ chối",
    RETURNED: "Đã trả lại",
    RECALLED: "Đã thu hồi"
  }[status] || status || "--";
}

export function borrowStatusStyle(status) {
  const map = {
    PENDING: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" },
    APPROVED: { background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
    BORROWED: { background: "#e0e7ff", color: "#4338ca", border: "1px solid #a5b4fc" },
    HANDED_OVER: { background: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe" },
    REJECTED: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" },
    RETURNED: { background: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" },
    RECALLED: { background: "#ffedd5", color: "#c2410c", border: "1px solid #fed7aa" }
  };
  return map[status] || { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
}

/* ─── Popup Đăng Ký Mượn ────────────────────────────────── */
export function BorrowModal({ dossier, onClose, onSuccess }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultTo = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    exploitMode: "ONLINE_READ",
    borrower: "",
    borrowerUnit: "",
    purpose: "",
    borrowFrom: today,
    borrowTo: defaultTo
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.borrower.trim()) { setError("Vui lòng nhập tên người mượn."); return; }
    if (!form.purpose.trim()) { setError("Vui lòng nhập mục đích mượn."); return; }
    setSaving(true);
    setError(null);
    try {
      await uiApi.createBorrow({
        dossierId: dossier.id,
        borrower: form.borrower.trim(),
        borrowerUnit: form.borrowerUnit.trim() || null,
        exploitMode: form.exploitMode,
        purpose: form.purpose.trim(),
        borrowFrom: form.borrowFrom || null,
        borrowTo: form.borrowTo || null,
        status: "PENDING"
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ background: "#0f172a", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileSearch size={20} color="#38bdf8" />
            <div>
              <div style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>Đăng ký mượn hồ sơ</div>
              <div style={{ color: "#94a3b8", fontSize: "12px" }}>{dossier.code} — {dossier.title}</div>
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "6px" }}>
              Hình thức khai thác <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { val: "ONLINE_READ", label: "📄 Bản mềm (Xem online)", color: "#0284c7" },
                { val: "HARD_COPY",   label: "📦 Bản cứng (Mượn gốc)", color: "#7c3aed" }
              ].map(opt => (
                <label key={opt.val} style={{
                  flex: 1, display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 12px",
                  border: `2px solid ${form.exploitMode === opt.val ? opt.color : "#e2e8f0"}`,
                  borderRadius: "8px", cursor: "pointer",
                  background: form.exploitMode === opt.val ? `${opt.color}10` : "#f8fafc",
                  fontWeight: "500", fontSize: "13px", color: form.exploitMode === opt.val ? opt.color : "#475569"
                }}>
                  <input type="radio" name="exploitMode" value={opt.val}
                    checked={form.exploitMode === opt.val}
                    onChange={() => set("exploitMode", opt.val)}
                    style={{ accentColor: opt.color }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                Người mượn <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                value={form.borrower}
                onChange={e => set("borrower", e.target.value)}
                placeholder="Họ và tên người mượn"
                style={{ width: "100%", height: "36px", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                Đơn vị / Phòng ban
              </label>
              <input
                value={form.borrowerUnit}
                onChange={e => set("borrowerUnit", e.target.value)}
                placeholder="Tên đơn vị công tác"
                style={{ width: "100%", height: "36px", fontSize: "13px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
              Mục đích mượn <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              value={form.purpose}
              onChange={e => set("purpose", e.target.value)}
              placeholder="Mô tả ngắn mục đích khai thác hồ sơ..."
              rows={2}
              style={{ width: "100%", fontSize: "13px", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                Ngày mượn
              </label>
              <input type="date" value={form.borrowFrom}
                onChange={e => set("borrowFrom", e.target.value)}
                style={{ width: "100%", height: "36px", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "600", fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                Ngày hẹn trả
              </label>
              <input type="date" value={form.borrowTo}
                onChange={e => set("borrowTo", e.target.value)}
                min={form.borrowFrom}
                style={{ width: "100%", height: "36px", fontSize: "13px" }}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "10px 12px", color: "#b91c1c", fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="btn primary" disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Send size={14} />
              {saving ? "Đang gửi..." : "Gửi phiếu mượn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── SearchScreen (Tra cứu & Khai thác) ───────────────── */
export function SearchScreen() {
  const [dossiers, setDossiers] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [storageRows, setStorageRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [statusFilter, setStatusFilter] = useState("AVAILABLE"); // AVAILABLE | PUBLISHED | APPROVED | ALL
  const [viewMode, setViewMode] = useState("DOSSIER"); // DOSSIER | DOCUMENT
  const [labelItem, setLabelItem] = useState(null);
  const [activeDossier, setActiveDossier] = useState(null);
  const [borrowTarget, setBorrowTarget] = useState(null);
  const [borrowSuccess, setBorrowSuccess] = useState(null);
  const [readingDoc, setReadingDoc] = useState(null);
  const [readingUrl, setReadingUrl] = useState(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState(null);

  const storageById = useMemo(
    () => new Map(storageRows.map(r => [Number(r.id), r])),
    [storageRows]
  );

  const storagePath = useCallback((storageId) => {
    if (!storageId) return "--";
    const path = [];
    const visited = new Set();
    let current = storageById.get(Number(storageId));
    while (current && !visited.has(Number(current.id))) {
      visited.add(Number(current.id));
      path.unshift(`${current.name} (${current.code})`);
      current = storageById.get(Number(current.parentId));
    }
    return path.join(" > ") || "Chưa xác định vị trí";
  }, [storageById]);

  const docsByDossierId = useMemo(() => {
    const map = new Map();
    allDocuments.forEach(doc => {
      const dId = Number(doc.dossierId);
      if (!map.has(dId)) map.set(dId, []);
      map.get(dId).push(doc);
    });
    return map;
  }, [allDocuments]);

  const dossierById = useMemo(
    () => new Map(dossiers.map(d => [Number(d.id), d])),
    [dossiers]
  );

  const AVAILABLE_STATUSES = useMemo(() => ["PUBLISHED", "APPROVED", "CONFIRMED", "ACTIVE"], []);

  const loadPublishedData = useCallback(async () => {
    setLoading(true);
    try {
      const [dossierRes, docRes, storageRes] = await Promise.all([
        uiApi.crud("dossiers").list().catch(() => []),
        uiApi.crud("documents").list().catch(() => []),
        uiApi.crud("storage").list().catch(() => [])
      ]);
      const dList = Array.isArray(dossierRes) ? dossierRes : (dossierRes?.items || []);
      const docList = Array.isArray(docRes) ? docRes : (docRes?.items || []);
      const sList = Array.isArray(storageRes) ? storageRes : (storageRes?.items || []);
      setDossiers([...dList].sort((a, b) => Number(b.id) - Number(a.id)));
      setAllDocuments(docList);
      setStorageRows(sList);
    } catch (err) {
      console.error("Lỗi tải dữ liệu tra cứu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPublishedData(); }, [loadPublishedData]);

  const statusFilteredDossiers = useMemo(() => {
    if (statusFilter === "AVAILABLE") {
      return dossiers.filter(d => AVAILABLE_STATUSES.includes(String(d.status || "").toUpperCase()));
    }
    if (statusFilter === "ALL") return dossiers;
    return dossiers.filter(d => String(d.status || "").toUpperCase() === statusFilter);
  }, [dossiers, statusFilter, AVAILABLE_STATUSES]);

  const filteredDossiers = useMemo(() => {
    if (!searchTerm.trim()) return statusFilteredDossiers;
    const query = searchTerm.trim().toLowerCase();
    return statusFilteredDossiers.filter(dossier => {
      const matchDossier = `${dossier.code} ${dossier.title} ${dossier.dossierType || ""} ${dossier.description || ""}`.toLowerCase().includes(query);
      if (matchDossier) return true;
      const childDocs = docsByDossierId.get(Number(dossier.id)) || [];
      return childDocs.some(doc => `${doc.code || ""} ${doc.title || ""} ${doc.description || ""}`.toLowerCase().includes(query));
    });
  }, [statusFilteredDossiers, searchTerm, docsByDossierId]);

  const filteredDocuments = useMemo(() => {
    let list = allDocuments;
    if (statusFilter === "AVAILABLE") {
      list = list.filter(doc => {
        const docStat = String(doc.status || "").toUpperCase();
        const parent = dossierById.get(Number(doc.dossierId));
        const parentStat = String(parent?.status || "").toUpperCase();
        return AVAILABLE_STATUSES.includes(docStat) || AVAILABLE_STATUSES.includes(parentStat);
      });
    } else if (statusFilter === "PUBLISHED" || statusFilter === "APPROVED") {
      list = list.filter(doc => {
        const docStat = String(doc.status || "").toUpperCase();
        const parent = dossierById.get(Number(doc.dossierId));
        const parentStat = String(parent?.status || "").toUpperCase();
        return docStat === statusFilter || parentStat === statusFilter;
      });
    }

    if (!searchTerm.trim()) return list;
    const query = searchTerm.trim().toLowerCase();
    return list.filter(doc => {
      const parent = dossierById.get(Number(doc.dossierId));
      const parentInfo = parent ? `${parent.code} ${parent.title} ${parent.dossierType || ""}` : "";
      return `${doc.code || ""} ${doc.title || ""} ${doc.fileName || ""} ${doc.description || ""} ${parentInfo}`.toLowerCase().includes(query);
    });
  }, [allDocuments, statusFilter, searchTerm, dossierById, AVAILABLE_STATUSES]);

  async function openOnlineReader(doc) {
    setReadingDoc(doc); setReadingLoading(true); setReadingError(null);
    if (readingUrl) { URL.revokeObjectURL(readingUrl); setReadingUrl(null); }
    try {
      const blob = await uiApi.gd2.documentPdfBlob(doc.id, "digitized").catch(() => uiApi.gd2.documentPdfBlob(doc.id, "original"));
      setReadingUrl(URL.createObjectURL(blob));
    } catch (err) {
      setReadingError(`Không thể mở tệp: ${err.message}`);
    } finally {
      setReadingLoading(false);
    }
  }

  function closeOnlineReader() {
    if (readingUrl) { URL.revokeObjectURL(readingUrl); setReadingUrl(null); }
    setReadingDoc(null); setReadingError(null);
  }

  function openDossierLabel(row) {
    setLabelItem({ entityType: "DOSSIER", id: row.id, code: row.code, name: row.title, location: storagePath(row.storageId), createdAt: row.createdAt || row.fromDate });
  }

  return (
    <section className="panel" style={{ background: "#ffffff", borderRadius: "10px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={20} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Tra cứu &amp; Khai thác Hồ sơ trực tuyến</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Tìm kiếm hồ sơ và văn bản đã phê duyệt / xuất bản, xem toàn văn OCR và đăng ký mượn trực tuyến</p>
        </div>
      </div>

      {borrowSuccess && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", padding: "12px 16px", marginBottom: "14px", color: "#15803d", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} />{borrowSuccess}
          <button type="button" onClick={() => setBorrowSuccess(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", color: "#15803d" }}><X size={14} /></button>
        </div>
      )}

      {/* Thanh tìm kiếm */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "10px", color: "#94a3b8" }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && loadPublishedData()}
            placeholder="Gõ từ khóa tên hồ sơ, số ký hiệu văn bản, trích yếu hoặc nội dung OCR cần tra cứu..."
            style={{ width: "100%", paddingLeft: "38px", height: "38px", fontSize: "14px" }} />
        </div>
        <button type="button" className="btn primary" onClick={loadPublishedData} style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px" }}>
          <Search size={16} /><span>Tìm kiếm</span>
        </button>
      </div>

      {/* Thanh công cụ lọc trạng thái và chuyển đổi chế độ xem */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        {/* Chuyển chế độ xem */}
        <div style={{ display: "inline-flex", background: "#e2e8f0", padding: "3px", borderRadius: "8px", gap: "3px" }}>
          <button
            type="button"
            onClick={() => setViewMode("DOSSIER")}
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: viewMode === "DOSSIER" ? "#ffffff" : "transparent",
              color: viewMode === "DOSSIER" ? "#0f172a" : "#64748b",
              boxShadow: viewMode === "DOSSIER" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            <Archive size={15} color={viewMode === "DOSSIER" ? "#059669" : "#64748b"} />
            <span>📁 Theo Hồ sơ lưu trữ ({filteredDossiers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("DOCUMENT")}
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: viewMode === "DOCUMENT" ? "#ffffff" : "transparent",
              color: viewMode === "DOCUMENT" ? "#0f172a" : "#64748b",
              boxShadow: viewMode === "DOCUMENT" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            <FileText size={15} color={viewMode === "DOCUMENT" ? "#0284c7" : "#64748b"} />
            <span>📄 Theo Văn bản chi tiết ({filteredDocuments.length})</span>
          </button>
        </div>

        {/* Lọc trạng thái */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "#475569", fontWeight: "500" }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ height: "34px", fontSize: "13px", padding: "0 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "500", color: "#1e293b" }}
          >
            <option value="AVAILABLE">✓ Tất cả khả dụng (Đã duyệt &amp; Xuất bản)</option>
            <option value="PUBLISHED">● Đã xuất bản (PUBLISHED)</option>
            <option value="APPROVED">✓ Đã phê duyệt (APPROVED)</option>
            <option value="ALL">Tất cả trạng thái (Gồm cả Bản nháp, Chờ duyệt)</option>
          </select>
        </div>
      </div>

      {/* ── CHẾ ĐỘ 1: XEM THEO HỒ SƠ LƯU TRỮ ── */}
      {viewMode === "DOSSIER" && (
        <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
          <table>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: "130px" }}>Mã hồ sơ</th>
                <th>Tên hồ sơ</th>
                <th style={{ width: "150px" }}>Loại hồ sơ</th>
                <th style={{ width: "220px" }}>Vị trí lưu trữ</th>
                <th style={{ width: "80px", textAlign: "center" }}>Văn bản</th>
                <th style={{ width: "120px", textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: "220px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredDossiers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 12px", color: "#64748b" }}>
                  {loading ? "Đang tải dữ liệu hồ sơ..." : "Không tìm thấy hồ sơ nào phù hợp với bộ lọc và từ khóa tìm kiếm."}
                </td></tr>
              ) : (
                filteredDossiers.map(dossier => {
                  const childDocs = docsByDossierId.get(Number(dossier.id)) || [];
                  return (
                    <tr key={dossier.id} style={{ background: activeDossier?.id === dossier.id ? "#f0fdf4" : "inherit", cursor: "pointer" }}
                      onClick={() => setActiveDossier(dossier)}>
                      <td><strong style={{ color: "#059669" }}>{dossier.code}</strong></td>
                      <td>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>{dossier.title}</div>
                        {dossier.description && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{dossier.description}</div>}
                      </td>
                      <td><span style={{ fontSize: "12px", color: "#334155" }}>{dossier.dossierType || "--"}</span></td>
                      <td><span style={{ fontSize: "12px", color: "#475569" }} title={storagePath(dossier.storageId)}>{storagePath(dossier.storageId)}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", background: "#dcfce7", color: "#15803d" }}>
                          {childDocs.length} tệp
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}><StatusBadge status={dossier.status || "PUBLISHED"} /></td>
                      <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button type="button" className="btn primary" onClick={() => setActiveDossier(dossier)}
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#059669", borderColor: "#059669", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <FileText size={13} /><span>Xem tệp ({childDocs.length})</span>
                          </button>
                          <button type="button" onClick={() => setBorrowTarget(dossier)}
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#7c3aed", borderColor: "#7c3aed", color: "#fff", border: "1px solid #7c3aed", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Send size={13} /><span>Đăng ký mượn</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CHẾ ĐỘ 2: XEM THEO VĂN BẢN CHI TIẾT ── */}
      {viewMode === "DOCUMENT" && (
        <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
          <table>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                <th style={{ width: "160px" }}>Số ký hiệu</th>
                <th>Trích yếu nội dung văn bản</th>
                <th style={{ width: "200px" }}>Thuộc hồ sơ</th>
                <th style={{ width: "150px" }}>Tệp số hóa</th>
                <th style={{ width: "110px", textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: "200px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 12px", color: "#64748b" }}>
                  {loading ? "Đang tải dữ liệu văn bản..." : "Không tìm thấy văn bản nào phù hợp với từ khóa tìm kiếm."}
                </td></tr>
              ) : (
                filteredDocuments.map((doc, idx) => {
                  const parent = dossierById.get(Number(doc.dossierId));
                  const ext = getFileExtension(doc.fileName);
                  const isPdf = ext === "pdf";
                  return (
                    <tr key={doc.id}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                      <td><strong style={{ color: "#0284c7" }}>{doc.code}</strong></td>
                      <td>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>{doc.title}</div>
                        {doc.description && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", maxHeight: "2.6em", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.description}</div>}
                      </td>
                      <td>
                        {parent ? (
                          <div>
                            <div style={{ fontWeight: "500", color: "#059669", fontSize: "12px" }}>{parent.code}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>{parent.title}</div>
                          </div>
                        ) : <span style={{ fontSize: "12px", color: "#94a3b8" }}>--</span>}
                      </td>
                      <td>
                        {doc.fileName ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ background: isPdf ? "#fee2e2" : "#e0f2fe", color: isPdf ? "#b91c1c" : "#0369a1", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>{isPdf ? "PDF" : ext.toUpperCase() || "DOC"}</span>
                            <span style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }} title={doc.fileName}>{doc.fileName}</span>
                          </div>
                        ) : <span style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa đính kèm</span>}
                      </td>
                      <td style={{ textAlign: "center" }}><StatusBadge status={doc.status || parent?.status || "APPROVED"} /></td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {doc.fileName ? (
                            <button type="button" className="btn primary" onClick={() => openOnlineReader(doc)}
                              style={{ padding: "4px 10px", fontSize: "12px", background: "#0284c7", borderColor: "#0284c7", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Eye size={13} /><span>Đọc online</span>
                            </button>
                          ) : null}
                          <button type="button" onClick={() => setBorrowTarget(parent || { id: doc.dossierId, code: doc.code, title: doc.title })}
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#7c3aed", borderColor: "#7c3aed", color: "#fff", border: "1px solid #7c3aed", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Send size={13} /><span>Mượn</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeDossier && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9990, padding: "20px" }}
          onClick={() => setActiveDossier(null)}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "920px", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#f0fdf4" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BookOpen size={20} color="#059669" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>Danh mục văn bản: <span style={{ color: "#059669" }}>{activeDossier.code}</span></h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{activeDossier.title}</div>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setActiveDossier(null)} style={{ padding: "6px" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "8px" }}>
              <Archive size={14} color="#059669" />
              <span><strong>Vị trí vật lý:</strong> {storagePath(activeDossier.storageId)}</span>
              <button type="button" onClick={() => { setActiveDossier(null); setBorrowTarget(activeDossier); }}
                style={{ marginLeft: "auto", padding: "4px 12px", fontSize: "12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Send size={12} /> Đăng ký mượn hồ sơ này
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <table>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                      <th style={{ width: "160px" }}>Số ký hiệu</th>
                      <th>Trích yếu nội dung</th>
                      <th style={{ width: "180px" }}>Tệp đính kèm</th>
                      <th style={{ width: "130px", textAlign: "center" }}>Đọc tài liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(docsByDossierId.get(Number(activeDossier.id)) || []).length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Hồ sơ chưa có tệp văn bản nào được tải lên.</td></tr>
                    ) : (
                      (docsByDossierId.get(Number(activeDossier.id)) || []).map((doc, idx) => {
                        const ext = getFileExtension(doc.fileName);
                        const isPdf = ext === "pdf";
                        return (
                          <tr key={doc.id}>
                            <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                            <td><strong style={{ color: "#0369a1" }}>{doc.code}</strong></td>
                            <td><div style={{ fontWeight: "500", color: "#0f172a" }}>{doc.title}</div></td>
                            <td>
                              {doc.fileName ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ background: isPdf ? "#fee2e2" : "#e0f2fe", color: isPdf ? "#b91c1c" : "#0369a1", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>{isPdf ? "PDF" : ext.toUpperCase() || "DOC"}</span>
                                  <span style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }} title={doc.fileName}>{doc.fileName}</span>
                                </div>
                              ) : <span style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có file</span>}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {doc.fileName ? (
                                <button type="button" className="btn primary" onClick={() => openOnlineReader(doc)}
                                  style={{ padding: "4px 10px", fontSize: "12px", background: "#0284c7", borderColor: "#0284c7", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Eye size={13} /><span>Đọc online</span>
                                </button>
                              ) : <span style={{ fontSize: "12px", color: "#cbd5e1" }}>--</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {readingDoc && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}
          onClick={closeOnlineReader}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "1040px", height: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#0f172a", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                <BookOpen size={20} color="#38bdf8" />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Trình đọc trực tuyến: {readingDoc.code} - {readingDoc.title}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Tệp: {readingDoc.fileName}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {readingUrl && <a href={readingUrl} download={readingDoc.fileName || "van-ban"} className="btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px", background: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}><Download size={14} /><span>Tải về</span></a>}
                <button type="button" onClick={closeOnlineReader} style={{ background: "#334155", border: "none", borderRadius: "6px", color: "#ffffff", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ flex: 1, background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {readingLoading && <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b" }}><div className="spinner" style={{ marginBottom: "12px" }}></div><span style={{ fontSize: "14px" }}>Đang tải nội dung văn bản...</span></div>}
              {readingError && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}><div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "20px", color: "#b91c1c", textAlign: "center", maxWidth: "400px" }}><AlertCircle size={32} style={{ marginBottom: "8px" }} /><p>{readingError}</p></div></div>}
              {!readingLoading && !readingError && readingUrl && (
                <div style={{ flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
                  {getFileExtension(readingDoc.fileName) === "pdf" ? (
                    <iframe src={readingUrl} title="PDF" style={{ width: "100%", height: "100%", border: "none", background: "#525659" }} />
                  ) : ["jpg", "jpeg", "png", "bmp", "webp"].includes(getFileExtension(readingDoc.fileName)) ? (
                    <div style={{ flex: 1, height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                      <img src={readingUrl} alt={readingDoc.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)" }} />
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", color: "#475569" }}>
                      <File size={48} color="#94a3b8" style={{ marginBottom: "12px" }} />
                      <p>Định dạng tệp này không hỗ trợ xem trực tiếp trên trình duyệt.</p>
                      <a href={readingUrl} download={readingDoc.fileName} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px" }}><Download size={16} /> Tải tệp về máy</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {borrowTarget && (
        <BorrowModal
          dossier={borrowTarget}
          onClose={() => setBorrowTarget(null)}
          onSuccess={() => setBorrowSuccess(`✅ Đã gửi phiếu mượn hồ sơ "${borrowTarget.code}" thành công! Chờ thủ kho phê duyệt.`)}
        />
      )}

      {labelItem && (
        <Suspense fallback={null}>
          <ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} />
        </Suspense>
      )}
    </section>
  );
}

/* ─── BorrowApprovalScreen (Hàng chờ duyệt mượn) ────────── */
export function BorrowApprovalScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [notice, setNotice] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [readingBorrow, setReadingBorrow] = useState(null);
  const [readingDoc, setReadingDoc] = useState(null);
  const [readingUrl, setReadingUrl] = useState(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState(null);

  const loadRequests = useCallback(async (status) => {
    const s = status !== undefined ? status : filterStatus;
    setLoading(true);
    try {
      const data = await uiApi.borrowRequests(s);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setRequests(list);
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi tải phiếu mượn: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleApprove(req) {
    setApprovingId(req.id);
    try {
      try {
        await uiApi.approveBorrow(req.id, { approver: "Thủ kho / Cán bộ lưu trữ", note: "Đã phê duyệt phiếu mượn" });
      } catch (err1) {
        await uiApi.gd2.approveBorrow(req.id, { actor: "thu-kho", note: "Đã phê duyệt phiếu mượn" });
      }
      setNotice({ type: "success", text: `✅ Đã phê duyệt phiếu mượn #${req.id} (${req.borrower || "Độc giả"}) thành công! Phiếu đã chuyển sang danh sách "Đã duyệt".` });
      await loadRequests(filterStatus);
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi phê duyệt: ${err.message}` });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReturn(req) {
    if (!window.confirm(`Xác nhận nhận trả sách/hồ sơ cho phiếu mượn #${req.id} (${req.borrower})?`)) return;
    setActionLoadingId(req.id);
    try {
      const payload = { actor: "thu-kho", note: "Đã nhận trả hồ sơ hoàn tất về kho" };
      try {
        await uiApi.returnBorrow(req.id, payload);
      } catch {
        await uiApi.gd2.returnBorrow(req.id, payload);
      }
      setNotice({ type: "success", text: `✅ Đã nhận trả hồ sơ cho phiếu #${req.id} (${req.borrower || "Độc giả"}) thành công!` });
      await loadRequests(filterStatus);
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi nhận trả: ${err.message}` });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRecall(req) {
    if (!window.confirm(`Xác nhận thu hồi hồ sơ / quyền truy cập của phiếu mượn #${req.id} (${req.borrower})?`)) return;
    setActionLoadingId(req.id);
    try {
      const payload = { actor: "thu-kho", note: "Đã thu hồi hồ sơ/quyền khai thác" };
      try {
        await uiApi.recallBorrow(req.id, payload);
      } catch {
        await uiApi.gd2.recallBorrow(req.id, payload);
      }
      setNotice({ type: "success", text: `✅ Đã thu hồi phiếu mượn #${req.id} (${req.borrower || "Độc giả"}) thành công!` });
      await loadRequests(filterStatus);
    } catch (err) {
      setNotice({ type: "error", text: `Lỗi thu hồi: ${err.message}` });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function openViewForBorrow(borrowReq) {
    setReadingBorrow(borrowReq); setReadingLoading(true); setReadingError(null); setReadingDoc(null);
    if (readingUrl) { URL.revokeObjectURL(readingUrl); setReadingUrl(null); }
    try {
      const docs = await uiApi.crud("documents").list().catch(() => []);
      const docList = Array.isArray(docs) ? docs : (docs?.items || []);
      const firstDoc = docList.find(d => Number(d.dossierId) === Number(borrowReq.dossierId) && d.fileName);
      if (!firstDoc) throw new Error("Hồ sơ này chưa có tệp văn bản số hóa đính kèm để xem trực tuyến.");
      setReadingDoc(firstDoc);
      const blob = await uiApi.gd2.documentPdfBlob(firstDoc.id, "digitized")
        .catch(() => uiApi.gd2.documentPdfBlob(firstDoc.id, "original"));
      setReadingUrl(URL.createObjectURL(blob));
    } catch (err) {
      setReadingError(err.message);
    } finally {
      setReadingLoading(false);
    }
  }

  function closeReader() {
    if (readingUrl) { URL.revokeObjectURL(readingUrl); setReadingUrl(null); }
    setReadingBorrow(null); setReadingDoc(null); setReadingError(null);
  }

  return (
    <section className="panel" style={{ background: "#ffffff", borderRadius: "10px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={20} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Hàng chờ duyệt & Quản lý mượn trả hồ sơ</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Thủ kho / Cán bộ lưu trữ phê duyệt yêu cầu, nhận trả hồ sơ và thu hồi tài liệu khai thác</p>
        </div>
      </div>

      {notice && (
        <div style={{ background: notice.type === "success" ? "#dcfce7" : "#fef2f2", border: `1px solid ${notice.type === "success" ? "#86efac" : "#fca5a5"}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "14px", color: notice.type === "success" ? "#15803d" : "#b91c1c", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>Lọc:</span>
        {[
          { val: "PENDING", label: "⏳ Chờ duyệt", color: "#d97706" },
          { val: "APPROVED", label: "📖 Đang mượn / Đã duyệt", color: "#059669" },
          { val: "RETURNED", label: "📥 Đã trả lại", color: "#0284c7" },
          { val: "RECALLED", label: "🚫 Đã thu hồi", color: "#ea580c" },
          { val: "", label: "📋 Tất cả", color: "#475569" }
        ].map(opt => (
          <button key={opt.val} type="button"
            onClick={() => { setFilterStatus(opt.val); loadRequests(opt.val); }}
            style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: `1px solid ${filterStatus === opt.val ? opt.color : "#e2e8f0"}`, background: filterStatus === opt.val ? `${opt.color}18` : "#f8fafc", color: filterStatus === opt.val ? opt.color : "#64748b" }}>
            {opt.label}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => loadRequests(filterStatus)} disabled={loading}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
        <table>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ width: "70px" }}>Phiếu #</th>
              <th>Hồ sơ</th>
              <th>Người mượn</th>
              <th style={{ width: "150px" }}>Hình thức</th>
              <th style={{ width: "180px" }}>Mục đích</th>
              <th style={{ width: "95px", textAlign: "center" }}>Ngày mượn</th>
              <th style={{ width: "95px", textAlign: "center" }}>Hẹn trả</th>
              <th style={{ width: "100px", textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: "180px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px 12px", color: "#64748b" }}>
                {loading ? "Đang tải phiếu mượn..." : "Không có phiếu mượn nào."}
              </td></tr>
            ) : (
              requests.map(req => (
                <tr key={req.id}>
                  <td><strong style={{ color: "#7c3aed" }}>#{req.id}</strong></td>
                  <td>
                    <div style={{ fontWeight: "600", color: "#059669", fontSize: "13px" }}>{req.dossierCode || `ID#${req.dossierId}`}</div>
                    {req.dossierTitle && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{req.dossierTitle}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: "500", fontSize: "13px", color: "#0f172a" }}>{req.borrower}</div>
                    {req.borrowerUnit && <div style={{ fontSize: "11px", color: "#64748b" }}>{req.borrowerUnit}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: "11px", fontWeight: "600", background: req.exploitMode === "HARD_COPY" ? "#f3e8ff" : "#e0f2fe", color: req.exploitMode === "HARD_COPY" ? "#7c3aed" : "#0369a1", padding: "2px 8px", borderRadius: "10px" }}>
                      {exploitModeLabel(req.exploitMode)}
                    </span>
                  </td>
                  <td><span style={{ fontSize: "12px", color: "#475569" }}>{req.purpose || "--"}</span></td>
                  <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>
                    {req.borrowFrom ? new Date(req.borrowFrom).toLocaleDateString("vi-VN") : "--"}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>
                    {req.borrowTo ? new Date(req.borrowTo).toLocaleDateString("vi-VN") : "--"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ ...borrowStatusStyle(req.status), fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "10px", display: "inline-block" }}>
                      {borrowStatusLabel(req.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                      {req.status === "PENDING" && (
                        <button type="button" className="btn primary" onClick={() => handleApprove(req)} disabled={approvingId === req.id || actionLoadingId === req.id}
                          style={{ padding: "4px 12px", fontSize: "12px", background: "#059669", borderColor: "#059669", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={13} />{approvingId === req.id ? "..." : "Duyệt mượn"}
                        </button>
                      )}
                      {["APPROVED", "BORROWED", "HANDED_OVER"].includes(req.status) && (
                        <>
                          <button type="button" onClick={() => handleReturn(req)} disabled={actionLoadingId === req.id}
                            title="Xác nhận người mượn đã hoàn tất trả hồ sơ/sách về kho"
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <RotateCcw size={13} />{actionLoadingId === req.id ? "..." : "Nhận trả"}
                          </button>
                          <button type="button" onClick={() => handleRecall(req)} disabled={actionLoadingId === req.id}
                            title="Thu hồi quyền khai thác hoặc thu hồi hồ sơ"
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#ea580c", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Ban size={13} />Thu hồi
                          </button>
                          {(req.exploitMode === "ONLINE_READ" || req.exploitMode === "SOFT_COPY") && (
                            <button type="button" onClick={() => openViewForBorrow(req)}
                              style={{ padding: "4px 10px", fontSize: "12px", background: "#475569", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Eye size={13} />Mở xem tệp
                            </button>
                          )}
                        </>
                      )}
                      {req.status === "RETURNED" && (
                        <span style={{ fontSize: "11px", color: "#0369a1", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <Check size={12} /> Đã trả kho
                        </span>
                      )}
                      {req.status === "RECALLED" && (
                        <span style={{ fontSize: "11px", color: "#c2410c", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <Ban size={12} /> Đã thu hồi
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {readingBorrow && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001, padding: "16px" }}
          onClick={closeReader}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "1040px", height: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: "#0f172a", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Eye size={20} color="#38bdf8" />
                <div>
                  <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>Xem trực tuyến tài liệu: {readingBorrow.dossierCode} — {readingBorrow.dossierTitle}</div>
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>Người mượn: {readingBorrow.borrower}{readingBorrow.borrowerUnit ? ` | ${readingBorrow.borrowerUnit}` : ""} | Phiếu #{readingBorrow.id}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {readingUrl && readingDoc && (
                  <a href={readingUrl} download={readingDoc.fileName} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", background: "#1e293b", color: "#f8fafc", textDecoration: "none", border: "1px solid #334155" }}>
                    <Download size={13} /> Tải về
                  </a>
                )}
                <button type="button" onClick={closeReader} style={{ background: "#334155", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", padding: "6px" }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ flex: 1, background: "#f1f5f9", display: "flex", overflow: "hidden" }}>
              {readingLoading && <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b" }}><div className="spinner" style={{ marginBottom: "12px" }}></div><span>Đang tải tài liệu...</span></div>}
              {readingError && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}><div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "20px", color: "#b91c1c", textAlign: "center", maxWidth: "360px" }}><AlertCircle size={32} style={{ marginBottom: "8px" }} /><p>{readingError}</p><button type="button" className="btn" onClick={closeReader} style={{ marginTop: "8px" }}>Đóng</button></div></div>}
              {!readingLoading && !readingError && readingUrl && readingDoc && (
                <div style={{ flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
                  {getFileExtension(readingDoc.fileName) === "pdf" ? (
                    <iframe src={readingUrl} title="PDF" style={{ width: "100%", height: "100%", border: "none" }} />
                  ) : ["jpg","jpeg","png","bmp","webp"].includes(getFileExtension(readingDoc.fileName)) ? (
                    <div style={{ height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                      <img src={readingUrl} alt={readingDoc.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }} />
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", color: "#475569" }}>
                      <File size={48} color="#94a3b8" style={{ marginBottom: "12px" }} /><p>Định dạng không hỗ trợ xem trực tiếp.</p>
                      <a href={readingUrl} download={readingDoc.fileName} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px" }}><Download size={16} /> Tải về</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── BorrowScreen (legacy fallback) ────────────────────── */
export function BorrowScreen() {
  return <BorrowApprovalScreen />;
}

export default SearchScreen;
