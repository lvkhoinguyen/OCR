import { useState, useMemo, lazy, Suspense } from "react";
import { Search, FileSearch } from "lucide-react";
import { useCrud } from "../../hooks/useCrud";
import { emptyDossier, emptyStorage, emptyBorrow } from "../../utils/constants";
import { PanelTitle, DataTable, CrudScreen } from "../shared/SharedComponents";

const ArchiveLabelModal = lazy(() => import("../ArchiveLabelModal"));

export function SearchScreen() {
  const crud = useCrud("dossiers", emptyDossier);
  const storageCrud = useCrud("storage", emptyStorage);
  const [keyword, setKeyword] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [labelItem, setLabelItem] = useState(null);
  const storageById = useMemo(
    () => new Map(storageCrud.rows.map(row => [Number(row.id), row])),
    [storageCrud.rows]
  );
  const rows = useMemo(() => {
    if (!keyword) return crud.rows;
    const k = keyword.toLowerCase();
    return crud.rows.filter((row) => `${row.code} ${row.title} ${row.dossierType}`.toLowerCase().includes(k));
  }, [crud.rows, keyword]);

  function storagePath(storageId) {
    const path = [];
    const visited = new Set();
    let current = storageById.get(Number(storageId));
    while (current && !visited.has(Number(current.id))) {
      visited.add(Number(current.id));
      path.unshift(`${current.code} · ${current.name}`);
      current = storageById.get(Number(current.parentId));
    }
    return path.join(" / ") || "Chưa xác định vị trí";
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
    <section className="panel">
      <PanelTitle icon={<Search />} title="Tra cứu hồ sơ" />
      <div className="search-strip">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập mã, tên, loại hồ sơ..." />
        <button className="btn primary">
          <Search size={16} /> Tìm kiếm
        </button>
      </div>
      <DataTable rows={rows} columns={[["code", "Mã hồ sơ"], ["title", "Tên hồ sơ"], ["dossierType", "Loại"], ["status", "Trạng thái"]]} onLabel={openDossierLabel} onEdit={crud.edit} onDelete={crud.remove} />
      {labelItem && <Suspense fallback={null}><ArchiveLabelModal item={labelItem} onClose={() => setLabelItem(null)} /></Suspense>}
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
