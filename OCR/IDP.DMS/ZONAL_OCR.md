# Interactive Zonal OCR

## Tọa độ

Frontend và API dùng tọa độ chuẩn hóa theo phần trăm của ảnh trang đã render:

- `x`, `y`: góc trái-trên, từ `0` đến `100`.
- `width`, `height`: kích thước vùng theo phần trăm.
- `page`: số trang bắt đầu từ `1`.

Backend kiểm tra toàn bộ vùng nằm trong trang rồi quy đổi sang pixel bằng kích thước ảnh render thật. Mỗi request nhận tối đa 12 vùng.

## API

Ảnh preview có xác thực:

```http
GET /api/dms/documents/{id}/ocr-preview?page=1
```

Response là PNG. Metadata trang nằm trong các header:

```text
X-OCR-Page
X-OCR-Page-Count
X-OCR-Image-Width
X-OCR-Image-Height
X-OCR-Source-File
```

Bóc tách vùng:

```http
POST /api/dms/documents/{id}/ocr-zones
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "engine": "vietocr",
  "zones": [
    {
      "id": "zone-1",
      "fieldKey": "documentNumber",
      "label": "Số hiệu",
      "page": 1,
      "x": 12.5,
      "y": 18.25,
      "width": 30,
      "height": 6.5
    }
  ]
}
```

Các `fieldKey` hợp lệ:

| fieldKey | Nhãn |
|---|---|
| `documentNumber` | Số hiệu |
| `issueDate` | Ngày ban hành |
| `issuingAuthority` | Cơ quan ban hành |
| `subject` | Trích yếu |
| `signer` | Người ký |

Response trả cả kết quả từng vùng, tọa độ pixel thực và map `metadata` đã nhóm theo `fieldKey`. Nếu có nhiều vùng cùng trường, văn bản được ghép theo thứ tự vùng trong request.

## Xử lý file

- PDF được render bằng PyMuPDF ở tỷ lệ 2.5 trước khi crop.
- TIFF nhiều trang và ảnh được đọc bằng Pillow; EXIF orientation được áp dụng trước khi crop.
- Vùng nhỏ được upscale tối đa 3 lần bằng Lanczos trước OCR.
- Khi tệp hiện tại là PDF số hóa do IDP.DMS sinh (`{id}_ocr_*.pdf`), backend ưu tiên tệp nguồn gần nhất trong `DMS_DOCUMENT_VERSIONS`, vì đó mới là hình ảnh người dùng cần khoanh vùng.

## Engine

Hỗ trợ `gemini`, `vietocr`, `easyocr`, `tesseract`, `crnn`.

- Gemini nhận từng ảnh crop qua tích hợp Gemini hiện có trong `OcrService`.
- Engine cục bộ chạy trong `ocr_engine.py`.
- Nếu engine cục bộ được chọn không khả dụng hoặc không nhận được chữ, chuỗi fallback là VietOCR → EasyOCR → Tesseract. Response từng vùng ghi rõ engine thực tế.

Cài dependency Python bằng:

```powershell
python -m pip install -r IDP.DMS.Api/requirements.txt
```

Tesseract còn yêu cầu cài executable và language data `vie`; nếu chưa có, pipeline sẽ dùng engine fallback.
