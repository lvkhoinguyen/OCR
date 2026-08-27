import { useState, useEffect, useRef } from "react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD210ReportScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [form, setForm] = useState({
    code: "",
    name: "",
    dataType: "",
    parameters: "",
  });
  const [templateFile, setTemplateFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const previewRef = useRef(null);

  const previewRows = form.dataType && form.dataType !== "SUMMARY"
    ? reportRows.filter(row => row.type === form.dataType)
    : reportRows;

  useEffect(() => {
    loadReportSummary("").catch(error => {
      setNotice({ type: "error", text: `Không tải được số liệu: ${error.message}` });
    });
  }, []);

  async function loadReportSummary(dataType) {
    const summary = await uiApi.gd2.reportSummary(dataType);
    const rows = summary.rows.map(row => ({
      type: row.key,
      indicator: row.indicator,
      quantity: row.quantity,
      rate: row.rate,
    }));
    setReportRows(rows);
    setGeneratedAt(new Date(summary.generatedAt).toLocaleString("vi-VN"));
    return rows;
  }

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: "" }));
    setNotice(null);
  }

  function validate() {
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Vui lòng nhập mã báo cáo.";
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên báo cáo.";
    if (!templateFile) nextErrors.templateFile = "Vui lòng chọn tệp thiết kế.";
    if (!form.dataType) nextErrors.dataType = "Vui lòng chọn loại dữ liệu.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function generateReport() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện các trường bắt buộc." });
      return;
    }

    try {
      await loadReportSummary(form.dataType);
      setNotice({ type: "success", text: "Đã tổng hợp số liệu báo cáo từ hệ thống." });
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (error) {
      setNotice({ type: "error", text: `Không tạo được báo cáo: ${error.message}` });
    }
  }

  async function saveConfiguration() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện các trường bắt buộc." });
      return;
    }

    try {
      const saved = await uiApi.gd2.saveReportConfig({
        code: form.code.trim(),
        name: form.name.trim(),
        dataType: form.dataType,
        templateFileName: templateFile.name,
        parameters: form.parameters.trim() || null,
        status: "ACTIVE",
      });
      setNotice({ type: "success", text: `Đã lưu cấu hình báo cáo ${saved.code}.` });
    } catch (error) {
      setNotice({ type: "error", text: `Không lưu được cấu hình: ${error.message}` });
    }
  }

  function reportFileName(extension) {
    const baseName = (form.code || "bao-cao-thong-ke")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${baseName || "bao-cao-thong-ke"}.${extension}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function reportTableHtml(rows = previewRows) {
    return `
      <table>
        <thead><tr><th>Chỉ tiêu</th><th>Số lượng</th><th>Tỷ lệ</th></tr></thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.indicator)}</td>
              <td>${escapeHtml(row.quantity.toLocaleString("vi-VN"))}</td>
              <td>${escapeHtml(`${Number(row.rate).toLocaleString("vi-VN")}%`)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function logReportExport(format) {
    return uiApi.gd2.logReportRun({
      reportCode: form.code.trim(),
      dataType: form.dataType,
      format,
      actor: "report",
      unitCode: "DEFAULT",
      parameters: form.parameters.trim() || null,
    });
  }

  async function exportExcel() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện cấu hình trước khi xuất báo cáo." });
      return;
    }
    let exportRows;
    try {
      exportRows = await loadReportSummary(form.dataType);
      await logReportExport("EXCEL");
    } catch (error) {
      setNotice({ type: "error", text: `Không xuất được Excel: ${error.message}` });
      return;
    }

    const workbook = `
      <html><head><meta charset="UTF-8"></head><body>
        <h2>${escapeHtml(form.name || "Báo cáo thống kê")}</h2>
        ${reportTableHtml(exportRows)}
      </body></html>
    `;
    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = reportFileName("xls");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({ type: "success", text: "Đã xuất báo cáo Excel." });
  }

  async function exportPdf() {
    if (!validate()) {
      setNotice({ type: "error", text: "Vui lòng hoàn thiện cấu hình trước khi xuất báo cáo." });
      return;
    }
    const reportWindow = window.open("", "_blank", "width=900,height=700");
    if (!reportWindow) {
      setNotice({ type: "error", text: "Trình duyệt đang chặn cửa sổ xuất PDF." });
      return;
    }

    let exportRows;
    try {
      exportRows = await loadReportSummary(form.dataType);
      await logReportExport("PDF");
    } catch (error) {
      reportWindow.close();
      setNotice({ type: "error", text: `Không xuất được PDF: ${error.message}` });
      return;
    }

    reportWindow.opener = null;
    reportWindow.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(form.name || "Báo cáo thống kê")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #172033; }
            h1 { font-size: 22px; margin: 0 0 8px; }
            p { color: #667085; margin: 0 0 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cfd8ea; padding: 10px 12px; text-align: left; }
            th { background: #eef2f8; }
            @page { size: A4; margin: 16mm; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(form.name || "Báo cáo thống kê")}</h1>
          <p>Mã báo cáo: ${escapeHtml(form.code || "--")}</p>
          ${reportTableHtml(exportRows)}
          <script>window.onload = () => { window.print(); };<\/script>
        </body>
      </html>
    `);
    reportWindow.document.close();
    setNotice({ type: "success", text: "Đã mở bản in; chọn \"Save as PDF\" để lưu tệp." });
  }

  const formPanel = (
    <form className="gd2-report-form" onSubmit={event => { event.preventDefault(); generateReport(); }}>
      <div className="gd2-form-row">
        <div className="gd2-field required">
          <label htmlFor="report-code">Mã báo cáo <span className="req-star">*</span></label>
          <input
            id="report-code"
            placeholder="Mã báo cáo"
            value={form.code}
            onChange={event => setField("code", event.target.value)}
            aria-invalid={Boolean(errors.code)}
          />
          {errors.code && <span className="gd2-field-error">{errors.code}</span>}
        </div>
        <div className="gd2-field required">
          <label htmlFor="report-name">Tên báo cáo <span className="req-star">*</span></label>
          <input
            id="report-name"
            placeholder="Tên báo cáo"
            value={form.name}
            onChange={event => setField("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="gd2-field-error">{errors.name}</span>}
        </div>
      </div>
      <div className="gd2-form-row">
        <div className="gd2-field required">
          <label htmlFor="report-template">Tệp thiết kế <span className="req-star">*</span></label>
          <input
            id="report-template"
            type="file"
            accept=".xlsx,.xls,.docx,.html,.jrxml,.rdl"
            onChange={event => {
              setTemplateFile(event.target.files?.[0] || null);
              setErrors(current => ({ ...current, templateFile: "" }));
              setNotice(null);
            }}
            aria-invalid={Boolean(errors.templateFile)}
          />
          {errors.templateFile && <span className="gd2-field-error">{errors.templateFile}</span>}
        </div>
        <div className="gd2-field required">
          <label htmlFor="report-data-type">Loại dữ liệu <span className="req-star">*</span></label>
          <select
            id="report-data-type"
            value={form.dataType}
            onChange={event => setField("dataType", event.target.value)}
            aria-invalid={Boolean(errors.dataType)}
          >
            <option value="">Chọn loại dữ liệu</option>
            <option value="SUMMARY">Tổng hợp hồ sơ</option>
            <option value="DIGITIZED">Hồ sơ số hóa</option>
            <option value="APPROVED">Hồ sơ đã duyệt</option>
            <option value="BORROW">Phiếu mượn</option>
          </select>
          {errors.dataType && <span className="gd2-field-error">{errors.dataType}</span>}
        </div>
      </div>
      <div className="gd2-field gd2-report-parameters">
        <label htmlFor="report-parameters">Tham số</label>
        <textarea
          id="report-parameters"
          rows="4"
          placeholder="Tham số"
          value={form.parameters}
          onChange={event => setField("parameters", event.target.value)}
        />
      </div>
      {notice && <div className={`gd2-report-notice ${notice.type}`}>{notice.text}</div>}
      <div className="gd2-form-actions">
        <button className="btn primary" type="submit">Tạo báo cáo</button>
        <button className="btn" type="button" onClick={saveConfiguration}>Lưu cấu hình</button>
      </div>
    </form>
  );

  const previewPanel = (
    <div className="gd2-report-preview" ref={previewRef}>
      {generatedAt && (
        <div className="gd2-report-meta">
          <strong>{form.name}</strong>
          <span>Cập nhật: {generatedAt}</span>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chỉ tiêu</th>
              <th>Số lượng</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map(row => (
              <tr key={row.type}>
                <td>{row.indicator}</td>
                <td>{row.quantity.toLocaleString("vi-VN")}</td>
                <td>{Number(row.rate).toLocaleString("vi-VN")}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      className="gd2-report-feature"
      featureId="GĐ2-10"
      featureName="Báo cáo và phân tích"
      description="Thiết kế màn hình theo danh sách hành động bên dưới."
      actor="report"
      actionBarLabel="Báo cáo thống kê"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      splitRatio="1fr 1fr"
      leftPanelTitle=""
      rightPanelTitle="Xem trước báo cáo"
      actions={
        <>
          <button className="btn primary" onClick={generateReport}>Xem báo cáo</button>
          <button className="btn" onClick={exportPdf}>Xuất PDF</button>
          <button className="btn" onClick={exportExcel}>Xuất Excel</button>
        </>
      }
      actionRows={[
        { action: "Xem báo cáo", description: "Nhập cấu hình và tạo bản xem trước", result: "Hiển thị số liệu thống kê theo quyền đơn vị" },
        { action: "Lưu cấu hình", description: "Lưu mã, tên, loại dữ liệu, tham số và tệp mẫu", result: "Tạo cấu hình báo cáo dùng lại" },
        { action: "Xuất PDF", description: "Mở bản in của báo cáo đang xem", result: "Lưu hoặc in báo cáo dạng PDF" },
        { action: "Xuất Excel", description: "Kết xuất bảng dữ liệu đang xem", result: "Tải tệp Excel về máy" },
      ]}
      validationItems={[
        { type: "required", label: "Bắt buộc", text: "Mã báo cáo, tên báo cáo, tệp thiết kế và loại dữ liệu phải được nhập." },
        { type: "unique", label: "Duy nhất", text: "Mã báo cáo không được trùng với cấu hình đã có." },
        { type: "rule", label: "Định dạng", text: "Tệp thiết kế hỗ trợ Excel, Word, HTML, JRXML hoặc RDL." },
        { type: "perm", label: "Phân quyền", text: "Số liệu báo cáo chỉ tổng hợp trong phạm vi đơn vị người dùng được cấp quyền." },
      ]}
      flowSteps={[
        { step: "1", label: "Khai báo", desc: "Nhập cấu hình báo cáo", color: "#3264f4" },
        { step: "2", label: "Kiểm tra", desc: "Validation & phân quyền", color: "#7c3aed" },
        { step: "3", label: "Tổng hợp", desc: "Truy vấn và tính số liệu", color: "#f59e0b" },
        { step: "4", label: "Xem trước", desc: "Hiển thị bảng báo cáo", color: "#0ea5e9" },
        { step: "5", label: "Kết xuất", desc: "Xuất PDF hoặc Excel", color: "#22c55e" },
      ]}
      leftPanel={formPanel}
      rightPanel={previewPanel}
    />
  );
}
