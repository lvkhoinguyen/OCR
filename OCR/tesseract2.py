import re

app_path = r"d:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client\src\App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# Import Tesseract if missing
if "import Tesseract from" not in content:
    content = content.replace('import { useEffect, useMemo, useState, useRef } from "react";', 
                              'import { useEffect, useMemo, useState, useRef } from "react";\nimport Tesseract from "tesseract.js";')

new_handler = """  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    alert(`AI đang bắt đầu quét ảnh... Vui lòng không đóng trang!\\n(Sẽ mất 2-5 giây để AI đọc chữ thực tế trong bức ảnh của bạn)`);
    
    try {
      const result = await Tesseract.recognize(
        file,
        'vie', // Tiếng Việt
        { logger: m => console.log(m) }
      );
      
      const recognizedText = result.data.text;
      const finalText = recognizedText.trim() ? recognizedText : "(AI không nhận dạng được chữ nào trong ảnh này, hãy thử ảnh rõ nét hơn)";
      
      let finalDescription = `Đã bóc tách thành công bằng AI (Tesseract.js).\\n\\nNỘI DUNG THỰC TẾ TRONG ẢNH:\\n${finalText}`;

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
      setUploadingId(null);
    }
  };"""

content = re.sub(r'const handleFileChange = async \(event\) => \{.*?(?=  return \()', new_handler + "\n\n", content, flags=re.DOTALL)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
