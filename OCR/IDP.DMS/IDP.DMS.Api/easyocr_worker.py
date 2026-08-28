import sys
import json
import re
import os
import warnings
warnings.filterwarnings("ignore")

def parse_vietnamese_admin_doc(lines):
    full_text = "\n".join(lines)
    meta = {
        "documentNumber": "",
        "issueDate": "",
        "issuingAuthority": "",
        "subject": "",
        "signer": ""
    }

    for line in lines:
        line_clean = line.strip()
        # Tìm số hiệu: Số: 123/QĐ-UBND, Số / QĐ, ...
        if not meta["documentNumber"]:
            m_num = re.search(r'(?:Số|So|SỐ)\s*[:/]?\s*([0-9A-Za-z_/\.\-]+)', line_clean, re.IGNORECASE)
            if m_num:
                meta["documentNumber"] = m_num.group(1).strip()

        # Tìm ngày tháng năm: ngày ... tháng ... năm ... hoặc dd/MM/yyyy
        if not meta["issueDate"]:
            m_date = re.search(r'ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})', line_clean, re.IGNORECASE)
            if m_date:
                meta["issueDate"] = f"{int(m_date.group(1)):02d}/{int(m_date.group(2)):02d}/{m_date.group(3)}"
            else:
                m_date2 = re.search(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b', line_clean)
                if m_date2:
                    meta["issueDate"] = m_date2.group(1).replace('-', '/')

        # Tìm cơ quan ban hành (thường là các dòng đầu in hoa: UBND, BỘ, SỞ, ỦY BAN...)
        if not meta["issuingAuthority"]:
            if re.search(r'(UBND|ỦY BAN NHÂN DÂN|BỘ|SỞ|CÔNG TY|TẬP ĐOÀN|BAN)\b', line_clean, re.IGNORECASE):
                meta["issuingAuthority"] = line_clean

        # Tìm trích yếu: V/v ..., Về việc ...
        if not meta["subject"]:
            m_sub = re.search(r'(?:V/v|Về việc|VE VIEC)\s*[:.]?\s*(.+)', line_clean, re.IGNORECASE)
            if m_sub:
                meta["subject"] = m_sub.group(1).strip()

        # Tìm người ký: KT., TM., CHỦ TỊCH, GIÁM ĐỐC...
        if not meta["signer"]:
            if re.search(r'\b(CHỦ TỊCH|GIÁM ĐỐC|TRƯỞNG BAN|HIỆU TRƯỞNG|KT\.|TM\.)\b', line_clean, re.IGNORECASE):
                meta["signer"] = line_clean

    return full_text, meta

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print(json.dumps({"error": "Thiếu đường dẫn tệp ảnh."}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Không tìm thấy file: {image_path}"}))
        sys.exit(1)

    try:
        import easyocr
        reader = easyocr.Reader(['vi', 'en'], gpu=False, verbose=False)
        results = reader.readtext(image_path, detail=0)
        lines = [r.strip() for r in results if r and r.strip()]
        full_text, meta = parse_vietnamese_admin_doc(lines)

        output = {
            "success": True,
            "engine": "easyocr-local",
            "fullText": full_text if full_text else "(Không nhận diện được văn bản từ ảnh)",
            "metadata": meta
        }
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
