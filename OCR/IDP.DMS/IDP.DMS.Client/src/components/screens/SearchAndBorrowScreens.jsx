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
  Layers,
  Box,
  CheckCircle2,
  AlertCircle,
  File,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { emptyDossier, emptyStorage, emptyBorrow } from "../../utils/constants";
import { PanelTitle, StatusBadge, CrudScreen } from "../shared/SharedComponents";
import { formatFileSize, getFileExtension } from "./DocumentPanel";

const ArchiveLabelModal = lazy(() => import("../ArchiveLabelModal"));

export function SearchScreen() {
  const [dossiers, setDossiers] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [storageRows, setStorageRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [labelItem, setLabelItem] = useState(null);

  // Selected dossier for viewing child documents
  const [activeDossier, setActiveDossier] = useState(null);

  // Online Reader State (PDF / Image)
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

  // Documents grouped by dossier ID
  const docsByDossierId = useMemo(() => {
    const map = new Map();
    allDocuments.forEach(doc => {
      const dId = Number(doc.dossierId);
      if (!map.has(dId)) map.set(dId, []);
      map.get(dId).push(doc);
    });
    return map;
  }, [allDocuments]);

  // Load published dossiers & documents
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

      // LỌC CHỈ LẤY CÁC HỒ SƠ ĐÃ Ở TRẠNG THÁI 'PUBLISHED'
      const published = dList.filter(d => String(d.status || "").toUpperCase() === "PUBLISHED");

      setDossiers([...published].sort((a, b) => Number(b.id) - Number(a.id)));
      setAllDocuments(docList);
      setStorageRows(sList);
    } catch (err) {
      console.error("Lỗi tải dữ liệu tra cứu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublishedData();
  }, [loadPublishedData]);

  // Lọc theo từ khóa: tên hồ sơ HOẶC trích yếu văn bản thành phần bên trong
  const filteredDossiers = useMemo(() => {
    if (!searchTerm.trim()) return dossiers;
    const query = searchTerm.trim().toLowerCase();

    return dossiers.filter(dossier => {
      // Khớp trực tiếp thông tin hồ sơ
      const matchDossier = `${dossier.code} ${dossier.title} ${dossier.dossierType || ""} ${dossier.description || ""}`
        .toLowerCase()
        .includes(query);

      if (matchDossier) return true;

      // Khớp trích yếu hoặc metadata của các văn bản con
      const childDocs = docsByDossierId.get(Number(dossier.id)) || [];
      const matchChildDoc = childDocs.some(doc =>
        `${doc.code || ""} ${doc.title || ""} ${doc.description || ""}`
          .toLowerCase()
          .includes(query)
      );

      return matchChildDoc;
    });
  }, [dossiers, searchTerm, docsByDossierId]);

  // Mở trình đọc PDF / Ảnh trực tuyến
  async function openOnlineReader(doc) {
    setReadingDoc(doc);
    setReadingLoading(true);
    setReadingError(null);

    if (readingUrl) {
      URL.revokeObjectURL(readingUrl);
      setReadingUrl(null);
    }

    try {
      const blob = await uiApi.gd2.documentPdfBlob(doc.id, "digitized").catch(async () => {
        return await uiApi.gd2.documentPdfBlob(doc.id, "original");
      });
      const url = URL.createObjectURL(blob);
      setReadingUrl(url);
    } catch (err) {
      setReadingError(`Không thể mở tệp trực tuyến: ${err.message}`);
    } finally {
      setReadingLoading(false);
    }
  }

  function closeOnlineReader() {
    if (readingUrl) {
      URL.revokeObjectURL(readingUrl);
      setReadingUrl(null);
    }
    setReadingDoc(null);
    setReadingError(null);
  }

  function openDossierLabel(row) {
    setLabelItem({
      entityType: "DOSSIER",
      id: row.id,
      code: row.code,
      name: row.title,
      location: storagePath(row.storageId),
      createdAt: row.createdAt || row.fromDate
    });
  }

  return (
    <section className="panel" style={{ background: "#ffffff", borderRadius: "10px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#ecfdf5",
            color: "#059669",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <BookOpen size={20} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
            Tra cứu &amp; Khai thác Hồ sơ trực tuyến
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
            Tìm kiếm các hồ sơ đã xuất bản chính thức, xem danh mục văn bản và đọc toàn văn PDF/ảnh trực tiếp
          </p>
        </div>
      </div>

      {/* Thanh tìm kiếm gợi nhớ thông minh */}
      <div
        className="search-strip"
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          background: "#f8fafc",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "10px", color: "#94a3b8" }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Gõ từ khóa tên hồ sơ hoặc trích yếu nội dung văn bản cần tra cứu..."
            style={{ width: "100%", paddingLeft: "38px", height: "38px", fontSize: "14px" }}
          />
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={loadPublishedData}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px" }}
        >
          <Search size={16} />
          <span>Tìm kiếm</span>
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
          Hồ sơ đã xuất bản ({filteredDossiers.length} hồ sơ)
        </span>
        <span style={{ fontSize: "12px", color: "#059669", fontWeight: "500" }}>
          ● Chỉ hiển thị hồ sơ đã xuất bản (PUBLISHED)
        </span>
      </div>

      {/* Bảng danh sách hồ sơ xuất bản */}
      <div className="table-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
        <table>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ width: "130px" }}>Mã hồ sơ</th>
              <th>Tên hồ sơ</th>
              <th style={{ width: "160px" }}>Loại hồ sơ</th>
              <th style={{ width: "240px" }}>Vị trí lưu trữ</th>
              <th style={{ width: "95px", textAlign: "center" }}>Văn bản</th>
              <th style={{ width: "120px", textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: "160px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredDossiers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 12px", color: "#64748b" }}>
                  {loading
                    ? "Đang tải dữ liệu hồ sơ..."
                    : "Không tìm thấy hồ sơ đã xuất bản nào phù hợp với từ khóa tìm kiếm."}
                </td>
              </tr>
            ) : (
              filteredDossiers.map(dossier => {
                const childDocs = docsByDossierId.get(Number(dossier.id)) || [];
                const docCount = childDocs.length;

                return (
                  <tr
                    key={dossier.id}
                    style={{
                      background: activeDossier?.id === dossier.id ? "#f0fdf4" : "inherit",
                      cursor: "pointer"
                    }}
                    onClick={() => setActiveDossier(dossier)}
                  >
                    <td>
                      <strong style={{ color: "#059669" }}>{dossier.code}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{dossier.title}</div>
                      {dossier.description && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          {dossier.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#334155" }}>{dossier.dossierType || "--"}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#475569" }} title={storagePath(dossier.storageId)}>
                        {storagePath(dossier.storageId)}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: "#dcfce7",
                          color: "#15803d"
                        }}
                      >
                        {docCount} tệp
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <StatusBadge status="PUBLISHED" />
                    </td>
                    <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => setActiveDossier(dossier)}
                          title="Mở xem danh mục tài liệu con"
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            background: "#059669",
                            borderColor: "#059669",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <FileText size={13} />
                          <span>Xem tệp</span>
                        </button>

                        <button
                          type="button"
                          className="btn"
                          onClick={() => openDossierLabel(dossier)}
                          title="In nhãn lưu trữ hồ sơ"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                        >
                          Nhãn
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

      {/* Drawer / Modal Danh sách văn bản con của hồ sơ đang chọn */}
      {activeDossier && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9990,
            padding: "20px"
          }}
          onClick={() => setActiveDossier(null)}
        >
          <div
            className="modal-content"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "920px",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f0fdf4"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BookOpen size={20} color="#059669" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                    Danh mục văn bản: <span style={{ color: "#059669" }}>{activeDossier.code}</span>
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {activeDossier.title}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setActiveDossier(null)}
                style={{ padding: "6px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Thông tin vị trí lưu trữ */}
            <div
              style={{
                padding: "10px 20px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Archive size={14} color="#059669" />
              <span><strong>Vị trí vật lý:</strong> {storagePath(activeDossier.storageId)}</span>
            </div>

            {/* Bảng văn bản con */}
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
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                          Hồ sơ chưa có tệp văn bản nào được tải lên.
                        </td>
                      </tr>
                    ) : (
                      (docsByDossierId.get(Number(activeDossier.id)) || []).map((doc, idx) => {
                        const ext = getFileExtension(doc.fileName);
                        const isPdf = ext === "pdf";

                        return (
                          <tr key={doc.id}>
                            <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                            <td><strong style={{ color: "#0369a1" }}>{doc.code}</strong></td>
                            <td>
                              <div style={{ fontWeight: "500", color: "#0f172a" }}>{doc.title}</div>
                            </td>
                            <td>
                              {doc.fileName ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span
                                    style={{
                                      background: isPdf ? "#fee2e2" : "#e0f2fe",
                                      color: isPdf ? "#b91c1c" : "#0369a1",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "10px",
                                      fontWeight: "700"
                                    }}
                                  >
                                    {isPdf ? "PDF" : ext.toUpperCase() || "DOC"}
                                  </span>
                                  <span style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }} title={doc.fileName}>
                                    {doc.fileName}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Chưa có file</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {doc.fileName ? (
                                <button
                                  type="button"
                                  className="btn primary"
                                  onClick={() => openOnlineReader(doc)}
                                  title="Mở Trình đọc PDF/ảnh trực tiếp trên web"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: "12px",
                                    background: "#0284c7",
                                    borderColor: "#0284c7",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                >
                                  <Eye size={13} />
                                  <span>Đọc online</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: "12px", color: "#cbd5e1" }}>--</span>
                              )}
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

      {/* Modal Trình đọc PDF trực tiếp trên web (Online Document Reader) */}
      {readingDoc && (
        <div
          className="online-reader-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px"
          }}
          onClick={closeOnlineReader}
        >
          <div
            className="online-reader-dialog"
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "1040px",
              height: "94vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              overflow: "hidden"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Reader Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#0f172a",
                color: "#ffffff"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                <BookOpen size={20} color="#38bdf8" />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Trình đọc trực tuyến: {readingDoc.code} - {readingDoc.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Tệp: {readingDoc.fileName}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {readingUrl && (
                  <a
                    href={readingUrl}
                    download={readingDoc.fileName || "van-ban"}
                    className="btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      padding: "6px 12px",
                      background: "#1e293b",
                      borderColor: "#334155",
                      color: "#f8fafc"
                    }}
                  >
                    <Download size={14} />
                    <span>Tải về</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={closeOnlineReader}
                  style={{
                    background: "#334155",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    cursor: "pointer",
                    padding: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Đóng trình đọc"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Reader Body */}
            <div style={{ flex: 1, background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {readingLoading && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  <div className="spinner" style={{ marginBottom: "12px" }}></div>
                  <span style={{ fontSize: "14px" }}>Đang tải nội dung văn bản trực tuyến...</span>
                </div>
              )}

              {readingError && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      padding: "20px",
                      color: "#b91c1c",
                      textAlign: "center",
                      maxWidth: "400px"
                    }}
                  >
                    <AlertCircle size={32} style={{ marginBottom: "8px" }} />
                    <p>{readingError}</p>
                  </div>
                </div>
              )}

              {!readingLoading && !readingError && readingUrl && (
                <div style={{ flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
                  {getFileExtension(readingDoc.fileName) === "pdf" ? (
                    <iframe
                      src={readingUrl}
                      title="Trình đọc văn bản PDF trực tuyến"
                      style={{ width: "100%", height: "100%", border: "none", background: "#525659" }}
                    />
                  ) : ["jpg", "jpeg", "png", "bmp", "webp"].includes(getFileExtension(readingDoc.fileName)) ? (
                    <div style={{ flex: 1, height: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                      <img
                        src={readingUrl}
                        alt={readingDoc.title}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)" }}
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", color: "#475569" }}>
                      <File size={48} color="#94a3b8" style={{ marginBottom: "12px" }} />
                      <p>Định dạng tệp này không hỗ trợ xem trực tiếp trên trình duyệt.</p>
                      <a href={readingUrl} download={readingDoc.fileName} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                        <Download size={16} /> Tải tệp về máy
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {labelItem && (
        <Suspense fallback={null}>
          <ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} />
        </Suspense>
      )}
    </section>
  );
}

export function BorrowScreen() {
  const crud = useCrud("borrow", emptyBorrow);
  const dossiers = useCrud("dossiers", emptyDossier);
  const dossierOptions = useMemo(
    () => dossiers.rows.map((row) => ({
      value: String(row.id),
      label: `${row.code} - ${row.title}`
    })),
    [dossiers.rows]
  );
  const dossierById = useMemo(
    () => new Map(dossiers.rows.map((row) => [Number(row.id), row])),
    [dossiers.rows]
  );
  const formatDossier = (value) => {
    const dossier = dossierById.get(Number(value));
    return dossier ? `${dossier.code} - ${dossier.title}` : `Hồ sơ #${value}`;
  };

  return (
    <CrudScreen
      title="Quy trình mượn, tra, khai thác hồ sơ"
      icon={<FileSearch />}
      crud={crud}
      columns={[
        ["dossierId", "Hồ sơ", formatDossier],
        ["borrower", "Người mượn"],
        ["borrowFrom", "Từ ngày"],
        ["borrowTo", "Đến ngày"],
        ["status", "Trạng thái"],
        ["approver", "Người duyệt"]
      ]}
      fields={[
        {
          key: "dossierId",
          label: "Hồ sơ",
          type: "select",
          required: true,
          placeholder: dossiers.rows.length ? "Chọn hồ sơ cần mượn" : "Chưa có hồ sơ trong DB",
          options: dossierOptions
        },
        { key: "borrower", label: "Người mượn", required: true },
        { key: "borrowFrom", label: "Từ ngày", type: "date" },
        { key: "borrowTo", label: "Đến ngày", type: "date" },
        { key: "status", label: "Trạng thái", type: "select", options: ["PENDING", "APPROVED", "REJECTED", "RETURNED"] },
        { key: "approver", label: "Người duyệt" },
        { key: "note", label: "Ghi chú", type: "textarea" }
      ]}
    />
  );
}

export default SearchScreen;
