import { useState, useEffect } from "react";
import { AlertCircle, Edit, FileText, CheckCircle2, X, RefreshCw } from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { StatusBadge, GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD220ReviewSupplementScreen({ title = "Kiểm duyệt & bổ sung" }) {
  const [activeTab, setActiveTab] = useState("screen");
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [guides, setGuides] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [actor, setActor] = useState("can-bo-kiem-duyet");
  const [recipient, setRecipient] = useState("current-user");
  const [templateCode, setTemplateCode] = useState("THIEU_GIAY_TO");
  const [reason, setReason] = useState("Hồ sơ chưa đủ thành phần theo quy định, vui lòng bổ sung để tiếp tục kiểm duyệt.");
  const [missingItems, setMissingItems] = useState("Bản scan giấy tờ gốc\nChữ ký người nộp\nTệp PDF rõ nét");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const selected = rows.find(item => item.id === selectedId) || rows[0] || null;
  const selectedTemplate = templates.find(item => item.code === templateCode) || templates[0];

  useEffect(() => {
    loadReviewData();
  }, []);

  useEffect(() => {
    if (selectedId) loadGuides(selectedId);
  }, [selectedId]);

  async function loadReviewData() {
    try {
      setLoading(true);
      const [items, templateRows] = await Promise.all([
        uiApi.gd2.supplementReviewItems(),
        uiApi.gd2.supplementTemplates(),
      ]);
      setRows(items);
      setTemplates(templateRows);
      setTemplateCode(current => current || templateRows[0]?.code || "THIEU_GIAY_TO");
      setSelectedId(current => current || items[0]?.id || null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được dữ liệu kiểm duyệt: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function loadGuides(dossierId) {
    try {
      setGuides(await uiApi.gd2.supplementGuides(dossierId));
    } catch (error) {
      setNotice({ type: "error", text: `Không tải được phiếu hướng dẫn: ${error.message}` });
    }
  }

  async function createSupplementGuide() {
    if (!selected) {
      setNotice({ type: "error", text: "Vui lòng chọn hồ sơ cần yêu cầu bổ sung." });
      return;
    }
    if (!reason.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập lý do yêu cầu bổ sung." });
      return;
    }

    try {
      setLoading(true);
      const guide = await uiApi.gd2.createSupplementGuide({
        dossierId: selected.id,
        actor,
        recipient,
        templateCode,
        reason,
        unitCode: "DEFAULT",
        missingItems: missingItems.split(/\r?\n/).map(item => item.trim()).filter(Boolean),
      });
      setRows(current => current.map(item => item.id === selected.id ? { ...item, status: "NEEDS_SUPPLEMENT" } : item));
      setGuides(current => [guide, ...current]);
      setNotice({ type: "success", text: `Đã tạo ${guide.guideCode}, đổi trạng thái sang Chờ bổ sung và gửi thông báo đa kênh.` });
    } catch (error) {
      setNotice({ type: "error", text: `Tạo yêu cầu bổ sung thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function decide(action) {
    if (!selected) return;
    const label = action === "APPROVE" ? "Đã duyệt" : "Bị từ chối";
    try {
      setLoading(true);
      const result = await uiApi.gd2.transition({
        entityType: "DOSSIER",
        entityId: selected.id,
        action,
        actor,
        unitCode: "DEFAULT",
        comment: reason,
        recipient,
      });
      setRows(current => current.map(item => item.id === selected.id ? { ...item, status: result.currentStatus } : item));
      setNotice({ type: "success", text: `${label}. Hệ thống đã gửi thông báo In-app, Email và SMS.` });
    } catch (error) {
      setNotice({ type: "error", text: `Cập nhật kết quả thất bại: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  const leftPanel = (
    <div className="gd220-left">
      <div className="gd220-template-strip">
        {templates.map(item => (
          <button key={item.code} className={templateCode === item.code ? "active" : ""} type="button" onClick={() => { setTemplateCode(item.code); setReason(item.content); }}>
            <AlertCircle size={14}/>
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>Mã</th><th>Hồ sơ</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id} className={item.id === selected?.id ? "row-selected" : ""} onClick={() => setSelectedId(item.id)}>
                <td><input type="radio" checked={item.id === selected?.id} onChange={() => setSelectedId(item.id)} /></td>
                <td><span className="gd2-code">{item.code}</span></td>
                <td><strong>{item.title}</strong><span className="gd21415-subtext">{item.dossierType || "Hồ sơ nghiệp vụ"}</span></td>
                <td><StatusBadge status={item.status} /></td>
                <td><button className="icon-btn" type="button" title="Yêu cầu bổ sung" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}><Edit size={13}/></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty-cell">{loading ? "Đang tải..." : "Chưa có hồ sơ kiểm duyệt."}</td></tr>}
          </tbody>
        </table>
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const rightPanel = (
    <div className="gd220-right">
      <div className="gd220-current">
        <div>
          <span className="gd21415-section-kicker">Hồ sơ đang kiểm duyệt</span>
          <h3>{selected ? `${selected.code} · ${selected.title}` : "Chưa chọn hồ sơ"}</h3>
        </div>
        {selected && <StatusBadge status={selected.status} />}
      </div>

      <div className="gd220-form">
        <div className="gd2-form-row">
          <div className="gd2-field"><label>Cán bộ kiểm duyệt</label><input value={actor} onChange={event => setActor(event.target.value)} /></div>
          <div className="gd2-field"><label>Người nộp/nhận kết quả</label><input value={recipient} onChange={event => setRecipient(event.target.value)} /></div>
        </div>
        <div className="gd2-field">
          <label>Template lý do</label>
          <select value={templateCode} onChange={event => {
            const next = templates.find(item => item.code === event.target.value);
            setTemplateCode(event.target.value);
            if (next) setReason(next.content);
          }}>
            {templates.map(item => <option key={item.code} value={item.code}>{item.title}</option>)}
          </select>
        </div>
        <div className="gd2-field required">
          <label>Nội dung yêu cầu bổ sung <span className="req-star">*</span></label>
          <textarea rows="4" value={reason} onChange={event => setReason(event.target.value)} />
        </div>
        <div className="gd2-field">
          <label>Thành phần cần bổ sung</label>
          <textarea rows="4" value={missingItems} onChange={event => setMissingItems(event.target.value)} />
        </div>
        <div className="gd220-actions">
          <button className="btn primary" disabled={loading || !selected} onClick={createSupplementGuide}><FileText size={14}/> Tạo phiếu bổ sung</button>
          <button className="btn" disabled={loading || !selected} style={{color:"#166534", borderColor:"#bbf7d0"}} onClick={() => decide("APPROVE")}><CheckCircle2 size={14}/> Đã duyệt</button>
          <button className="btn" disabled={loading || !selected} style={{color:"#b91c1c", borderColor:"#fecaca"}} onClick={() => decide("REJECT")}><X size={14}/> Từ chối</button>
        </div>
      </div>

      <div className="gd220-guide-preview">
        <div className="gd22-section-head"><FileText size={16}/> Phiếu hướng dẫn hoàn thiện hồ sơ</div>
        <pre>{guides[0]?.content || `PHIEU HUONG DAN HOAN THIEN HO SO\nHo so: ${selected?.code || "--"}\nMau ly do: ${selectedTemplate?.title || "--"}\nNoi dung: ${reason}\nThanh phan can bo sung:\n${missingItems}`}</pre>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GĐ2-20/21"
      featureName={title}
      description="Kiểm duyệt hồ sơ, yêu cầu bổ sung bằng phiếu hướng dẫn chuẩn và gửi thông báo kết quả tự động đa kênh."
      actor="Cán bộ kiểm duyệt / Người nộp hồ sơ"
      actionBarLabel="Kiểm duyệt, bổ sung và thông báo kết quả"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 460px"
      className="gd220-feature"
      leftPanelTitle="Danh sách hồ sơ kiểm duyệt"
      rightPanelTitle="Form yêu cầu bổ sung"
      actions={
        <>
          <button className="btn" onClick={loadReviewData}><RefreshCw size={14}/> Tải lại</button>
          <button className="btn primary" disabled={loading || !selected} onClick={createSupplementGuide}><FileText size={14}/> Yêu cầu bổ sung</button>
        </>
      }
      actionRows={[
        { action: "Yêu cầu bổ sung", description: "Chọn template, nhập lý do và thành phần thiếu", result: "Sinh phiếu hướng dẫn, đổi trạng thái Chờ bổ sung" },
        { action: "Thông báo kết quả", description: "Khi hồ sơ Đã duyệt, Bị từ chối hoặc Cần bổ sung", result: "Gửi In-app Notification, Email và SMS" },
        { action: "Người nộp cập nhật", description: "Nhận phiếu hướng dẫn và bổ sung hồ sơ", result: "Hồ sơ quay lại luồng kiểm duyệt" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Lý do yêu cầu bổ sung phải được nhập trước khi tạo phiếu." },
        { type: "rule", label: "Trạng thái", text: "Yêu cầu bổ sung tự động chuyển hồ sơ sang Chờ bổ sung." },
        { type: "perm", label: "Phân quyền", text: "Chỉ cán bộ kiểm duyệt được tạo phiếu hoặc thay đổi kết quả kiểm duyệt." },
      ]}
      flowSteps={[
        { step: "1", label: "Kiểm tra", desc: "Đối chiếu điều kiện", color: "#3264f4" },
        { step: "2", label: "Chọn kết quả", desc: "Duyệt/từ chối/bổ sung", color: "#f59e0b" },
        { step: "3", label: "Tạo phiếu", desc: "Mẫu hướng dẫn chuẩn", color: "#7c3aed" },
        { step: "4", label: "Thông báo", desc: "In-app, Email, SMS", color: "#0ea5e9" },
        { step: "5", label: "Bổ sung", desc: "Người nộp cập nhật", color: "#22c55e" },
      ]}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
