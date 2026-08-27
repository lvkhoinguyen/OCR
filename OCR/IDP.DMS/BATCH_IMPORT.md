# Import hồ sơ hàng loạt bằng Excel và ZIP

## Khởi tạo

Backend dùng `ClosedXML` để đọc/tạo tệp Excel. Sau khi triển khai phiên bản mới, gọi một lần `POST /api/dms/initialize` bằng tài khoản có quyền `DMS.ADMIN` để tạo hai bảng theo dõi:

- `DMS_BATCH_IMPORT_JOBS`: trạng thái và số liệu tổng hợp của phiên import.
- `DMS_BATCH_IMPORT_ITEMS`: kết quả đối soát của từng dòng Excel và trạng thái OCR.

Hồ sơ và văn bản hợp lệ được ghi vào `DMS_DOSSIERS` và `DMS_DOCUMENTS`. Mỗi hồ sơ là một transaction; nếu một văn bản trong hồ sơ lỗi thì toàn bộ hồ sơ đó được rollback, còn các hồ sơ hợp lệ khác vẫn tiếp tục.

## Chuẩn dữ liệu

Tải template tại `GET /api/dms/dossiers/batch-import-template`. Worksheet đầu tiên phải có đúng thứ tự các cột:

1. `MaHoSo`
2. `TenHoSo`
3. `LoaiHoSo`
4. `MaKho`
5. `MaVanBan`
6. `TenVanBan`
7. `TenFileDinhKem`

`MaKho` phải tồn tại và đang hoạt động trong `DMS_STORAGE_LOCATIONS`. Nhiều dòng được phép dùng chung `MaHoSo`, nhưng `TenHoSo`, `LoaiHoSo` và `MaKho` phải giống nhau. `MaVanBan` và `TenFileDinhKem` không được trùng trong một tệp Excel.

`TenFileDinhKem` có thể là tên tệp (`van-ban-01.pdf`) hoặc đường dẫn tương đối trong ZIP (`ho-so-01/van-ban-01.pdf`). Nếu ZIP có nhiều thư mục chứa cùng một tên tệp, Excel phải ghi đường dẫn tương đối đầy đủ.

## API

### Gửi gói import

`POST /api/dms/dossiers/batch-import-zip`

Content-Type: `multipart/form-data`

| Trường | Kiểu | Nội dung |
| --- | --- | --- |
| `DanhMucHoSo` | file | Tệp `.xlsx` |
| `TaiLieu` | file | Tệp `.zip` |
| `OcrEngine` | string | `vietocr`, `gemini`, `easyocr`, `tesseract` hoặc `crnn` |

API trả HTTP `202 Accepted`, số hồ sơ/văn bản đã tạo, số dòng lỗi và bảng đối soát. Tài liệu đã tạo có `OCR_STATUS = QUEUED`, sau đó worker xử lý nền và cập nhật trạng thái.

### Theo dõi

- `GET /api/dms/dossiers/batch-import-jobs/{jobId}`: chi tiết và trạng thái mới nhất.
- `GET /api/dms/dossiers/batch-import-jobs?take=20`: lịch sử gần nhất (tối đa 100 phiên).

Trạng thái dòng gồm `VALIDATION_ERROR`, `IMPORT_ERROR`, `OCR_QUEUED`, `OCR_PROCESSING`, `OCR_DONE`, `OCR_ERROR`. Trạng thái phiên kết thúc là `COMPLETED` hoặc `COMPLETED_WITH_ERRORS`.

## Giới hạn và an toàn

- Excel tối đa 10 MB và 5.000 dòng dữ liệu.
- ZIP tối đa 250 MB, 5.000 tệp; mỗi tệp tối đa 50 MB; tổng sau giải nén tối đa 1 GB.
- Hỗ trợ PDF, PNG, JPG/JPEG và TIFF.
- Từ chối đường dẫn ZIP không an toàn, đường dẫn trùng, tệp rỗng và tỷ lệ nén bất thường.
- Tệp được stream vào `uploads/` với tên sinh mới, không dùng trực tiếp tên/đường dẫn bên trong ZIP.
- Hàng đợi OCR được khôi phục từ Oracle khi API khởi động lại.

Nếu chạy sau IIS, Nginx hoặc API gateway, cần cấu hình giới hạn request của reverse proxy lớn hơn 270 MB; giới hạn endpoint trong ASP.NET Core đã được đặt là 270 MB.

## Giao diện

Mở menu **Import hồ sơ** để tải template, kéo thả hai tệp, chọn engine OCR và bắt đầu import. Thanh tiến trình dùng phần trăm upload thực tế, sau đó tự polling trạng thái OCR mỗi 1,5 giây. Bảng đối soát hiển thị kết quả từng dòng và lịch sử các phiên gần nhất.
