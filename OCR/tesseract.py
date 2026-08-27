import re

app_path = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# Import Tesseract
if "import Tesseract from" not in content:
    content = content.replace('import { useEffect, useMemo, useState, useRef } from "react";', 
                              'import { useEffect, useMemo, useState, useRef } from "react";\nimport Tesseract from "tesseract.js";')

# Rewrite handleFileChange
new_handler = """  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    alert(`AI đang đọc nội dung ảnh... Quá trình này có thể mất vài giây. (Engine: ${ocrEngine})\\nVui lòng KHÔNG đóng thông báo này! Tesseract sẽ chạy ngầm.`);
    
    try {
      // Run actual OCR with Tesseract
      const result = await Tesseract.recognize(
        file,
        'vie', // Vietnamese
        { logger: m => console.log(m) }
      );
      
      const recognizedText = result.data.text;
      const finalText = recognizedText.trim() ? recognizedText : "(AI không nhận dạng được chữ nào trong ảnh này)";
      
      let finalDescription = "Đã bóc tách thành công bằng AI (Tesseract.js OCR engine chạy cục bộ).\\n\\nNỘI DUNG ĐỌC ĐƯỢC:\\n" + finalText;

      if (uploadingId) {
        alert(`Upload & OCR hoàn tất!\\nNội dung đã đọc được: \\n${finalText.substring(0, 100)}...`);
        const targetRow = rows.find(r => r.id === uploadingId);
        if (targetRow) {
           crud.edit(targetRow);
           crud.setField("fileName", file.name);
           crud.setField("description", finalDescription);
           crud.setField("ocrStatus", "DONE");
        }
        setUploadingId(null);
      } else {
         crud.setField("fileName", file.name);
         crud.setField("description", finalDescription);
         crud.setField("ocrStatus", "DONE");
         alert("Trích xuất OCR THỰC TẾ thành công! Dữ liệu đã được điền tự động vào form.");
      }
    } catch (e) {
      alert("Lỗi AI OCR: " + e.message);
    }
  };"""

# Replace old handleFileChange
# We need to find the block from `const handleFileChange = async (event) => {` to the end of the function.
# It ends right before `return (`
content = re.sub(r'const handleFileChange = async \(event\) => \{.*?(?=  return \()', new_handler + "\n\n", content, flags=re.DOTALL)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
