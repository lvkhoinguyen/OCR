import { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle2, History } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { PanelTitle, StatusBadge } from "../shared/SharedComponents";

export default function GD219ConfirmationScreen({ title }) {
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [dialogMode, setDialogMode] = useState("CONFIRM");
  const [confirmNote, setConfirmNote] = useState("");
  const [supplementNote, setSupplementNote] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await uiApi.gd2.workflowItems();
      const candidates = items.filter(item => ["APPROVED", "PUBLISHED"].includes(item.status));
      setRows(candidates);

      const historyResults = await Promise.all(
        items.map(item => uiApi.gd2.workflowHistory("DOSSIER", item.id).catch(() => []))
      );

      const flattened = historyResults
        .flat()
        .filter(item => ["CONFIRM", "REQUEST_SUPPLEMENT"].includes(item.action))
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

      setHistory(flattened);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openDialog(row, mode) {
    setSelectedRow(row);
    setDialogMode(mode);
  }

  function closeDialog() {
    setSelectedRow(null);
    setDialogMode("CONFIRM");
    setConfirmNote("");
    setSupplementNote("");
  }

  async function submitConfirmation(action) {
    if (!selectedRow) return;
    const note = action === "CONFIRM" ? confirmNote.trim() : supplementNote.trim();
    if (!note) {
      alert(action === "CONFIRM"
        ? "Vui lòng nhập nội dung xác nhận."
        : "Vui lòng nhập nội dung yêu cầu bổ sung.");
      return;
    }

    setBusyAction(action);
    try {
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selectedRow.id,
        action,
        actor: "current-user",
        unitCode: "DEFAULT",
        comment: note,
        recipient: selectedRow.code,
      });

      alert(
        action === "CONFIRM"
          ? `Đã xác nhận thông tin hồ sơ ${selectedRow.code}. Trạng thái mới: ${result.currentStatus}`
          : `Đã chuyển hồ sơ ${selectedRow.code} sang trạng thái cần bổ sung.`
      );

      closeDialog();
      await loadData();
    } catch (apiError) {
      alert("Lỗi: " + apiError.message);
    } finally {
      setBusyAction("");
    }
  }

  const confirmedCount = history.filter(item => item.action === "CONFIRM").length;

  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title={title || "GD2-19 Xác nhận thông tin"} />
      <p className="muted" style={{ marginBottom: 16 }}>
        Đối chiếu và xác nhận độ chính xác của hồ sơ sau khai thác; nếu có sai lệch thì chuyển sang bước bổ sung.
      </p>
      {error && <div className="alert">{error}</div>}

      <div className="gd2-summary-grid">
        <div className="gd2-summary-card" style={{ "--accent": "#2563eb" }}>
          <div className="gd2-summary-top">
            <span className="gd2-summary-icon"><AlertCircle size={16} /></span>
            <span className="gd2-summary-label">Hồ sơ chờ xác nhận</span>
          </div>
          <strong className="gd2-summary-value">{rows.length}</strong>
          <span className="gd2-summary-note">Chờ đối chiếu dữ liệu sau khai thác</span>
        </div>
        <div className="gd2-summary-card" style={{ "--accent": "#16a34a" }}>
          <div className="gd2-summary-top">
            <span className="gd2-summary-icon"><CheckCircle2 size={16} /></span>
            <span className="gd2-summary-label">Lượt xác nhận gần đây</span>
          </div>
          <strong className="gd2-summary-value">{confirmedCount}</strong>
          <span className="gd2-summary-note">Các hồ sơ đã được ghi nhận chính xác</span>
        </div>
        <div className="gd2-summary-card" style={{ "--accent": "#7c3aed" }}>
          <div className="gd2-summary-top">
            <span className="gd2-summary-icon"><History size={16} /></span>
            <span className="gd2-summary-label">Lịch sử xử lý</span>
          </div>
          <strong className="gd2-summary-value">{history.length}</strong>
          <span className="gd2-summary-note">Tổng thao tác xác nhận và bổ sung</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã hồ sơ</th>
              <th>Tên hồ sơ</th>
              <th>Loại hồ sơ</th>
              <th>Trạng thái</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td><strong>{row.code}</strong></td>
                <td>{row.title}</td>
                <td>{row.dossierType || "Chưa phân loại"}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>{row.description || "Chưa có mô tả"}</td>
                <td>
                  <button className="btn ok" style={{ marginRight: 6 }} onClick={() => openDialog(row, "CONFIRM")}>
                    Xác nhận
                  </button>
                  <button className="btn warn" onClick={() => openDialog(row, "REQUEST_SUPPLEMENT")}>
                    Yêu cầu bổ sung
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">Không có hồ sơ nào đang chờ xác nhận thông tin.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ marginBottom: 10 }}>Lịch sử xử lý gần đây</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Trạng thái</th>
                  <th>Người xử lý</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map(item => (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{item.action === "CONFIRM" ? "Xác nhận thông tin" : "Yêu cầu bổ sung"}</td>
                    <td><StatusBadge status={item.toStatus} /></td>
                    <td>{item.actor}</td>
                    <td>{item.comment || "Không có ghi chú"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRow && (
        <div className="modal-overlay" onClick={closeDialog}>
          <div className="modal-content" onClick={event => event.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-icon-wrap" style={{ background: dialogMode === "CONFIRM" ? "#2563eb" : "#d97706" }}>
                <CheckCircle2 size={22} color="#fff" />
              </div>
              <div>
                <h3>{dialogMode === "CONFIRM" ? "Xác nhận thông tin hồ sơ" : "Lập yêu cầu bổ sung"} {selectedRow.code}</h3>
                <p className="muted">
                  {dialogMode === "CONFIRM"
                    ? "Kiểm tra, đối chiếu và ghi nhận độ tin cậy của dữ liệu sau khai thác."
                    : "Ghi rõ nội dung sai lệch hoặc thiếu thông tin để chuyển hồ sơ về bước bổ sung."}
                </p>
              </div>
            </div>

            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div className="detail-row"><span>Tên hồ sơ</span><strong>{selectedRow.title}</strong></div>
              <div className="detail-row"><span>Loại hồ sơ</span><strong>{selectedRow.dossierType || "Chưa phân loại"}</strong></div>
              <div className="detail-row"><span>Trạng thái hiện tại</span><StatusBadge status={selectedRow.status} /></div>
              <div className="detail-row"><span>Mô tả</span><span>{selectedRow.description || "Chưa có mô tả"}</span></div>
            </div>

            {dialogMode === "CONFIRM" ? (
              <div className="field" style={{ marginTop: 16 }}>
                <span>Nội dung xác nhận</span>
                <textarea
                  rows={3}
                  value={confirmNote}
                  onChange={event => setConfirmNote(event.target.value)}
                  placeholder="Ví dụ: Đã đối chiếu với hồ sơ gốc, thông tin chính xác và đủ điều kiện khai thác."
                />
              </div>
            ) : (
              <div className="field" style={{ marginTop: 16 }}>
                <span>Nội dung yêu cầu bổ sung</span>
                <textarea
                  rows={3}
                  value={supplementNote}
                  onChange={event => setSupplementNote(event.target.value)}
                  placeholder="Ví dụ: Thiếu văn bản đính kèm hoặc chưa khớp số hiệu, đề nghị cập nhật lại trước khi xác nhận."
                />
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 18 }}>
              {dialogMode === "CONFIRM" ? (
                <button className="btn ok" disabled={busyAction === "REQUEST_SUPPLEMENT"} onClick={() => submitConfirmation("CONFIRM")}>
                  Xác nhận chính xác
                </button>
              ) : (
                <button className="btn warn" disabled={busyAction === "CONFIRM"} onClick={() => submitConfirmation("REQUEST_SUPPLEMENT")}>
                  Gửi yêu cầu bổ sung
                </button>
              )}
              <button className="btn" onClick={closeDialog}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
