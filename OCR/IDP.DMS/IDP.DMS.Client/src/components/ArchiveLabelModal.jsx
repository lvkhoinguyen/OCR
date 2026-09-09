import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, X } from "lucide-react";

function displayDate(value) {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("vi-VN");
}

function onlineLookupUrl(item) {
  const url = new URL(window.location.href);
  if (item.entityType === "DOSSIER") {
    url.searchParams.set("screen", "Tìm kiếm hồ sơ theo điều kiện");
    url.searchParams.set("dossier", String(item.id));
  } else if (item.entityType === "DOCUMENT") {
    url.searchParams.set("screen", "Quản lý tài liệu");
    url.searchParams.set("document", String(item.id));
  } else {
    url.searchParams.set("screen", "Quản lý Kho - Kệ - Tầng - Hộp");
    url.searchParams.set("box", String(item.id));
  }
  url.searchParams.set("q", String(item.code || ""));
  return url.toString();
}

export default function ArchiveLabelModal({ item, onClose }) {
  const barcodeRef = useRef(null);
  const labelRef = useRef(null);
  const [qrMode, setQrMode] = useState("LINK");
  const [layout, setLayout] = useState("LABEL");
  const [copies, setCopies] = useState(1);

  const identifier = String(item.code || item.id);
  const entityLabel = item.entityType === "DOSSIER"
    ? "HỒ SƠ LƯU TRỮ"
    : item.entityType === "DOCUMENT"
    ? "TÀI LIỆU LƯU TRỮ"
    : "HỘP LƯU TRỮ";

  const qrJson = useMemo(() => JSON.stringify({
    loai: item.entityType === "DOSSIER" ? "HO_SO" : item.entityType === "DOCUMENT" ? "TAI_LIEU" : "HOP_LUU_TRU",
    id: item.id,
    ma: item.code,
    ten: item.name,
    viTri: item.location || "Chưa xác định",
    ngayTao: item.createdAt || null
  }), [item]);
  const qrValue = qrMode === "JSON" ? qrJson : (item.lookupUrl || onlineLookupUrl(item));

  useEffect(() => {
    if (!barcodeRef.current) return;
    JsBarcode(barcodeRef.current, identifier, {
      format: "CODE128",
      displayValue: true,
      font: "Arial",
      fontSize: 13,
      height: 42,
      margin: 0,
      width: 1.5
    });
  }, [identifier]);

  function changeLayout(nextLayout) {
    setLayout(nextLayout);
    setCopies(nextLayout === "A4" ? 10 : 1);
  }

  function printLabels() {
    if (!labelRef.current) return;
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      window.alert("Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup và thử lại.");
      return;
    }

    const labelMarkup = labelRef.current.outerHTML;
    const count = Math.max(1, Math.min(10, Number(copies) || 1));
    const labels = Array.from({ length: count }, () => labelMarkup).join("");
    const isA4 = layout === "A4";
    printWindow.document.write(`<!doctype html>
      <html lang="vi"><head><meta charset="utf-8"><title>Tem ${identifier}</title>
      <style>
        @page { size: ${isA4 ? "A4" : "100mm 50mm"}; margin: ${isA4 ? "5mm" : "0"}; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111827; }
        .print-sheet { display: ${isA4 ? "grid" : "block"}; grid-template-columns: repeat(2, 100mm); grid-auto-rows: 50mm; gap: 0; align-content: start; }
        .archive-label { width: 100mm; height: 50mm; padding: 3mm; border: .25mm solid #111; display: grid; grid-template-columns: minmax(0, 1fr) 27mm; grid-template-rows: auto 1fr auto; gap: 1.5mm 3mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
        ${!isA4 ? ".archive-label { page-break-after: always; } .archive-label:last-child { page-break-after: auto; }" : ""}
        .archive-label-heading { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding-bottom: 1mm; border-bottom: .35mm solid #1d4ed8; }
        .archive-label-heading strong { font-size: 10pt; color: #1d4ed8; letter-spacing: .04em; }
        .archive-label-heading span { font-size: 7pt; font-weight: 700; }
        .archive-label-info { min-width: 0; display: grid; align-content: start; gap: 1mm; font-size: 7.5pt; }
        .archive-label-info b { font-size: 12pt; overflow-wrap: anywhere; }
        .archive-label-info span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .archive-label-qr { grid-column: 2; grid-row: 2 / 4; display: grid; place-items: center; text-align: center; font-size: 6pt; }
        .archive-label-qr svg { width: 24mm; height: 24mm; }
        .archive-label-barcode { min-width: 0; height: 13mm; display: flex; align-items: flex-end; overflow: hidden; }
        .archive-label-barcode svg { width: 100%; height: 12mm; }
        .archive-label-qr small { display: block; margin-top: .5mm; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style></head><body><main class="print-sheet">${labels}</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  return (
    <div className="modal-overlay label-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section className="modal-content archive-label-modal" role="dialog" aria-modal="true" aria-labelledby="label-modal-title" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-header archive-label-modal-header">
          <div className="modal-icon-wrap"><QrCode size={22} color="#fff" /></div>
          <div>
            <h3 id="label-modal-title">In Mã Vạch / QR Code</h3>
            <p className="muted">{entityLabel} · {identifier}</p>
          </div>
          <button className="icon-btn label-modal-close" type="button" onClick={onClose} aria-label="Đóng"><X size={18}/></button>
        </div>

        <div className="archive-label-controls">
          <label><span>Nội dung QR Code</span><select value={qrMode} onChange={event => setQrMode(event.target.value)}><option value="LINK">Link tra cứu trực tuyến</option><option value="JSON">JSON thông tin lưu trữ</option></select></label>
          <label><span>Khổ giấy</span><select value={layout} onChange={event => changeLayout(event.target.value)}><option value="LABEL">Tem nhiệt 100 × 50 mm</option><option value="A4">A4 nhiều tem (2 × 5)</option></select></label>
          <label><span>Số lượng tem</span><input type="number" min="1" max="10" value={copies} onChange={event => setCopies(event.target.value)} /></label>
        </div>

        <div className="archive-label-preview-wrap">
          <div className="archive-label" ref={labelRef}>
            <div className="archive-label-heading"><strong>IDP.DMS</strong><span>{entityLabel}</span></div>
            <div className="archive-label-info">
              <b>{item.code}</b>
              <span title={item.name}>{item.name}</span>
              <span title={item.location}><strong>Vị trí:</strong> {item.location || "Chưa xác định"}</span>
              <span><strong>Ngày tạo:</strong> {displayDate(item.createdAt)}</span>
            </div>
            <div className="archive-label-qr"><div><QRCodeSVG value={qrValue} size={102} level="M" /><small>Quét để tra cứu</small></div></div>
            <div className="archive-label-barcode"><svg ref={barcodeRef} aria-label={`Barcode ${identifier}`} /></div>
          </div>
        </div>

        <div className="label-print-hint">Chọn đúng khổ giấy trong hộp thoại in. Khổ 100 × 50 mm dùng cho Zebra/Xprinter; khổ A4 dùng cho máy in văn phòng.</div>
        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>Đóng</button>
          <button className="btn primary" type="button" onClick={printLabels}><Printer size={16}/> In Tem Nhãn</button>
        </div>
      </section>
    </div>
  );
}
