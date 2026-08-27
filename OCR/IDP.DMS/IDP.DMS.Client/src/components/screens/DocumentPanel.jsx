import { useMemo } from "react";
import { FileText } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptyDocument, emptyDossier } from "../../utils/constants";
import { CrudScreen } from "../shared/SharedComponents";

export default function DocumentPanel() {
  const crud = useCrud("documents", emptyDocument);
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
      compact
      title="Tài liệu/OCR"
      icon={<FileText />}
      crud={crud}
      columns={[
        ["dossierId", "Hồ sơ", formatDossier],
        ["code", "Mã"],
        ["title", "Tên tài liệu"],
        ["ocrStatus", "OCR"],
        ["status", "Trạng thái"]
      ]}
      fields={[
        {
          key: "dossierId",
          label: "Hồ sơ",
          type: "select",
          required: true,
          placeholder: dossiers.rows.length ? "Chọn hồ sơ" : "Chưa có hồ sơ trong DB",
          options: dossierOptions
        },
        { key: "code", label: "Mã tài liệu", required: true },
        { key: "title", label: "Tên tài liệu", required: true },
        { key: "fileName", label: "File tài liệu (PDF/Ảnh đính kèm)", type: "file" },
        { key: "ocrStatus", label: "OCR", type: "select", options: ["PENDING", "PROCESSING", "DONE", "ERROR"] },
        { key: "status", label: "Trạng thái", type: "select", options: ["DRAFT", "VALID", "INVALID"] }
      ]}
    />
  );
}
