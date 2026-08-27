import re

app_path = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove old ApprovalScreen
old_approval = """function ApprovalScreen() {
  const crud = useCrud("dossiers", emptyDossier);
  const rows = crud.rows.filter((row) => ["PENDING", "DRAFT"].includes(row.status));

  return (
    <section className="panel">
      <PanelTitle icon={<CheckCircle2 />} title="Kiểm duyệt hồ sơ xuất bản" />
      <DataTable 
        rows={rows} 
        columns={[
          ["code", "Mã"],
          ["title", "Tên hồ sơ"],
          ["status", "Trạng thái"]
        ]} 
      />
    </section>
  );
}"""

content = content.replace(old_approval, "")

# Remove duplicate imports
imports_section_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+"lucide-react";', content)
if imports_section_match:
    imports_str = imports_section_match.group(1)
    imports_list = [x.strip() for x in imports_str.split(',') if x.strip()]
    unique_imports = []
    for x in imports_list:
        if x not in unique_imports:
            unique_imports.append(x)
    new_imports_str = 'import {\n  ' + ',\n  '.join(unique_imports) + '\n} from "lucide-react";'
    content = content.replace(imports_section_match.group(0), new_imports_str)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
