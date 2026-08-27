import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, History, GitMerge, Eye, RefreshCw, Save } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { useCrud } from "../../hooks/useCrud";
import { emptyDocument } from "../../utils/constants";
import { StatusBadge, OcrBadge, GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD211DocumentVersionScreen() {
  const documentsCrud = useCrud("documents", emptyDocument);
  const [activeTab, setActiveTab] = useState("screen");
  const [detailTab, setDetailTab] = useState("history");
  const [keyword, setKeyword] = useState("");
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [compareResult, setCompareResult] = useState(null);
  const [notice, setNotice] = useState(null);

  const documents = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return documentsCrud.rows;
    return documentsCrud.rows.filter(row => `${row.code} ${row.title} ${row.fileName} ${row.description}`.toLowerCase().includes(text));
  }, [documentsCrud.rows, keyword]);
  const selectedDoc = documentsCrud.rows.find(row => row.id === selectedDocId) || documents[0] || null;
  const publishedVersion = versions.find(item => item.isPublished) || versions[0] || null;

  const loadVersions = useCallback(async (documentId) => {
    if (!documentId) return;
    try {
      setNotice(null);
      const rows = await uiApi.gd2.documentVersionTimeline(documentId);
      setVersions(rows);
      setCompareIds(current => current.filter(id => rows.some(row => row.id === id)).slice(0, 2));
    } catch (error) {
      setVersions([]);
      setNotice({ type: "error", text: error.message });
    }
  }, []);

  useEffect(() => {
    if (selectedDoc?.id) {
      setSelectedDocId(selectedDoc.id);
      loadVersions(selectedDoc.id);
    }
  }, [selectedDoc?.id, loadVersions]);

  function toggleCompare(versionId) {
    setCompareIds(current => {
      if (current.includes(versionId)) return current.filter(id => id !== versionId);
      return [...current, versionId].slice(-2);
    });
    setCompareResult(null);
  }

  async function compareVersions() {
    if (!selectedDoc || compareIds.length !== 2) {
      setNotice({ type: "error", text: "Chọn đúng 2 phiên bản để so sánh." });
      return;
    }
    try {
      setCompareResult(await uiApi.gd2.compareDocumentVersions(selectedDoc.id, compareIds[0], compareIds[1]));
      setDetailTab("diff");
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function createSnapshot() {
    if (!selectedDoc) return;
    try {
      await uiApi.gd2.createDocumentVersion(selectedDoc.id, {
        createdBy: "current-user",
        note: "Tạo phiên bản thủ công từ màn GĐ2-11"
      });
      setNotice({ type: "success", text: "Đã tạo snapshot phiên bản mới." });
      await loadVersions(selectedDoc.id);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function rollback(version) {
    if (!selectedDoc || !window.confirm(`Khôi phục về ${version.versionLabel}? Hệ thống sẽ tạo một phiên bản mới, không xóa lịch sử trung gian.`)) return;
    try {
      await uiApi.gd2.restoreDocumentVersion(selectedDoc.id, version.id, { actor: "current-user" });
      setNotice({ type: "success", text: `Đã rollback từ ${version.versionLabel}; lịch sử cũ được giữ nguyên và một version mới đã được tạo.` });
      await loadVersions(selectedDoc.id);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const listPanel = (
    <div className="gd211-list-panel">
      <div className="gd2-table-search">
        <Search size={14}/>
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm tài liệu..." />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mã</th><th>Tên tài liệu</th><th>Published</th></tr></thead>
          <tbody>
            {documents.map(row => (
              <tr key={row.id} className={selectedDoc?.id === row.id ? "row-selected" : ""} onClick={() => { setSelectedDocId(row.id); setCompareResult(null); setCompareIds([]); }}>
                <td><span className="gd2-code">{row.code}</span></td>
                <td>{row.title}</td>
                <td>{row.status === "PUBLISHED" ? <StatusBadge status="PUBLISHED"/> : "-"}</td>
              </tr>
            ))}
            {documents.length === 0 && <tr><td colSpan="3" className="empty-cell">Chưa có tài liệu.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const historyPanel = (
    <div className="gd211-detail-panel">
      <div className="gd211-doc-head">
        <div>
          <h3>{selectedDoc?.title || "Chọn tài liệu"}</h3>
          <p className="muted">Published mặc định: {publishedVersion?.versionLabel || "chưa có"}</p>
        </div>
        <div className="gd211-tabs">
          <button className={detailTab === "metadata" ? "active" : ""} onClick={() => setDetailTab("metadata")}>Metadata</button>
          <button className={detailTab === "history" ? "active" : ""} onClick={() => setDetailTab("history")}>Lịch sử phiên bản</button>
          <button className={detailTab === "diff" ? "active" : ""} onClick={() => setDetailTab("diff")}>Diff View</button>
        </div>
      </div>

      {detailTab === "metadata" && (
        <div className="detail-grid">
          <div className="detail-row"><span>Mã tài liệu</span><strong>{selectedDoc?.code || "-"}</strong></div>
          <div className="detail-row"><span>File</span><span>{selectedDoc?.fileName || "-"}</span></div>
          <div className="detail-row"><span>OCR</span><OcrBadge status={selectedDoc?.ocrStatus || "PENDING"} /></div>
          <div className="detail-row"><span>Trạng thái</span><StatusBadge status={selectedDoc?.status || "DRAFT"} /></div>
          <div className="detail-row"><span>Nội dung/metadata</span><span>{selectedDoc?.description || "Chưa có"}</span></div>
        </div>
      )}

      {detailTab === "history" && (
        <>
          <div className="gd211-toolbar">
            <button className="btn primary" disabled={!selectedDoc} onClick={createSnapshot}><History size={14}/> Lưu snapshot</button>
            <button className="btn" disabled={compareIds.length !== 2} onClick={compareVersions}><GitMerge size={14}/> So sánh 2 bản</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>So sánh</th><th>Version</th><th>Published</th><th>Người sửa</th><th>Thời gian</th><th>Thay đổi</th><th>Thao tác</th></tr></thead>
              <tbody>
                {versions.map(version => (
                  <tr key={version.id}>
                    <td><input type="checkbox" checked={compareIds.includes(version.id)} onChange={() => toggleCompare(version.id)} /></td>
                    <td><strong>{version.versionLabel}</strong></td>
                    <td>{version.isPublished ? <StatusBadge status="PUBLISHED"/> : "-"}</td>
                    <td>{version.createdBy}</td>
                    <td>{new Date(version.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{version.note || "Không có ghi chú"}</td>
                    <td>
                      <button className="icon-btn" title="Xem bản này" onClick={() => setCompareResult({ left: version, right: version, fields: [] })}><Eye size={14}/></button>
                      <button className="icon-btn" title="So sánh" onClick={() => toggleCompare(version.id)}><GitMerge size={14}/></button>
                      <button className="icon-btn danger" title="Khôi phục bản này" onClick={() => rollback(version)}><RefreshCw size={14}/></button>
                    </td>
                  </tr>
                ))}
                {versions.length === 0 && <tr><td colSpan="7" className="empty-cell">Chưa có lịch sử phiên bản.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailTab === "diff" && (
        <div className="gd211-diff">
          {compareResult ? (
            <>
              <div className="gd211-diff-head">
                <strong>{compareResult.left.versionLabel}</strong>
                <strong>{compareResult.right.versionLabel}</strong>
              </div>
              {compareResult.fields.length === 0 ? (
                <div className="empty-cell">Đang xem một phiên bản. Chọn 2 phiên bản để diff.</div>
              ) : compareResult.fields.map(field => (
                <div key={field.field} className={field.changed ? "gd211-diff-row changed" : "gd211-diff-row"}>
                  <span>{field.label}</span>
                  <pre>{field.leftValue || "-"}</pre>
                  <pre>{field.rightValue || "-"}</pre>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-cell">Chọn 2 phiên bản ở tab Lịch sử phiên bản rồi bấm So sánh.</div>
          )}
        </div>
      )}
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-11"
      featureName="Phiên bản tài liệu"
      description="Theo dõi lịch sử phiên bản, so sánh thay đổi và rollback không phá vỡ lịch sử trung gian."
      actor="Người dùng có quyền chỉnh sửa tài liệu"
      actionBarLabel="Version history, diff view và rollback"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="360px minmax(0, 1fr)"
      className="gd211-feature"
      leftPanelTitle="Danh sách tài liệu"
      rightPanelTitle="Chi tiết tài liệu"
      actions={
        <>
          <button className="btn" onClick={() => selectedDoc && loadVersions(selectedDoc.id)}><RefreshCw size={14}/> Làm mới</button>
          <button className="btn primary" disabled={!selectedDoc} onClick={createSnapshot}><Save size={14}/> Lưu snapshot</button>
          <button className="btn" disabled={compareIds.length !== 2} onClick={compareVersions}><GitMerge size={14}/> So sánh</button>
        </>
      }
      actionRows={[
        { action: "Tự động đánh số", description: "Tạo label v1.0/v1.1/v2.0 theo lịch sử và trạng thái published", result: "Hiển thị version label trong tab lịch sử" },
        { action: "Version History Log", description: "Lưu người sửa, thời gian và ghi chú thay đổi", result: "Truy vết toàn bộ phiên bản cũ" },
        { action: "Diff View", description: "Chọn 2 version để so sánh field-by-field", result: "Các trường thay đổi được highlight" },
        { action: "Rollback", description: "Khôi phục nội dung bản cũ", result: "Tạo version mới, không xóa lịch sử trung gian" },
      ]}
      validationItems={[
        { type: "rule", label: "Published", text: "Phiên bản published là bản mặc định hiển thị cho người khai thác." },
        { type: "rule", label: "Rollback", text: "Rollback luôn tạo version mới, không ghi đè hay xóa version trung gian." },
        { type: "perm", label: "Quyền sửa", text: "Chỉ người có quyền chỉnh sửa tài liệu được tạo snapshot/rollback." },
      ]}
      flowSteps={[
        { step: "1", label: "Sửa/tải đè", desc: "Tài liệu thay đổi", color: "#3264f4" },
        { step: "2", label: "Snapshot", desc: "Đánh số version", color: "#7c3aed" },
        { step: "3", label: "So sánh", desc: "Diff 2 bản", color: "#f59e0b" },
        { step: "4", label: "Rollback", desc: "Tạo version mới", color: "#22c55e" },
      ]}
      leftPanel={listPanel}
      rightPanel={historyPanel}
    />
  );
}
