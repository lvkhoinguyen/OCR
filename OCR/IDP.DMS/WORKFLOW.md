# Workflow vận hành IDP.DMS

## 1. Chạy dự án ở chế độ phát triển

Mở hai terminal tại thư mục dự án:

```powershell
cd IDP.DMS.Api
dotnet run --launch-profile http
```

```powershell
cd IDP.DMS.Client
npm run dev
```

Truy cập `http://127.0.0.1:5173`. Hiện tại API Development bật `AuthenticationBypass:Enabled`, nên giao diện tự đi thẳng vào hệ thống dưới tài khoản `dev-admin / SYSTEM_ADMIN`; không cần nhập username và password.

Luồng kỹ thuật của chế độ này:

```text
React khởi động
  -> GET /api/auth/configuration
  -> API xác nhận bypass chỉ trong Development
  -> Middleware gắn principal SYSTEM_ADMIN + permission "*"
  -> React mở màn hình chính và gọi các API /api/dms/* bình thường
```

Để quay lại luồng JWT thật, đổi `AuthenticationBypass.Enabled` thành `false` trong `IDP.DMS.Api/appsettings.Development.json`, khởi động lại API, sau đó đăng ký/đăng nhập như hướng dẫn trong `AUTHENTICATION.md`.

## 2. Workflow nghiệp vụ tổng thể

```text
Khởi tạo hệ thống và danh mục
  -> Tiếp nhận hồ sơ/tài liệu
  -> Lưu file và tạo phiên bản
  -> OCR toàn trang hoặc OCR theo vùng
  -> Kiểm tra, chuẩn hóa metadata
  -> Gửi duyệt -> Kiểm duyệt -> Phê duyệt
  -> Ký số PDF và xuất bản
  -> Sinh QR/Barcode, in tem và đưa vào Kho/Kệ/Hộp
  -> Tra cứu, khai thác, mượn/trả và báo cáo
```

### Bước 1 — Khởi tạo và cấu hình kho

1. Bấm **Khởi tạo DB** để tạo/kiểm tra các bảng Oracle cần thiết.
2. Khai báo danh mục dùng chung, kho, tầng, kệ, hộp và loại hồ sơ.
3. Kiểm tra kết nối OCR, thư mục `uploads/` và chính sách định dạng tệp.

### Bước 2 — Tiếp nhận hồ sơ

Có hai cách nhập dữ liệu:

- Nhập thủ công hồ sơ, tài liệu và tải file đính kèm.
- Import hàng loạt tại màn hình **Import hồ sơ**: tải template, chọn `DanhMucHoSo.xlsx` và `TaiLieu.zip`, kiểm tra đối soát rồi theo dõi tiến trình OCR nền.

Mỗi tài liệu được gắn vào hồ sơ tương ứng; PDF, ảnh scan và các mô hình CAD/BIM hỗ trợ được lưu trong `uploads/`.

### Bước 3 — Số hóa và OCR

1. Chạy OCR toàn tài liệu hoặc theo lô.
2. Tại **GĐ2-6 OCR AI**, mở preview, kéo thả các bounding box và gán nhãn: Số hiệu, Ngày ban hành, Cơ quan ban hành, Trích yếu, Người ký.
3. Bấm **Bóc tách vùng đã chọn**; kết quả OCR được map về metadata theo từng nhãn.
4. Người nhập liệu kiểm tra và xác nhận kết quả trước khi chuyển duyệt.

Với tệp `.ifc`, `.stl`, `.obj` hoặc `.step`, màn hình chi tiết mở viewer 3D để xoay, zoom, bật wireframe và xem cây cấu trúc khi định dạng có dữ liệu cấu trúc.

### Bước 4 — Phê duyệt và quản lý phiên bản

Luồng trạng thái chuẩn:

```text
DRAFT -> SUBMITTED -> REVIEWED -> APPROVED -> PUBLISHED
                    \-> REJECTED/SUPPLEMENT -> chỉnh sửa -> SUBMITTED
```

Mọi lần sửa nội dung cần tạo hoặc cập nhật phiên bản tài liệu. Lịch sử workflow và timeline phiên bản dùng để đối soát người thực hiện, thời gian và nội dung thay đổi.

### Bước 5 — Ký số PDF

1. Mở tài liệu PDF đã được phê duyệt tại màn hình ký số.
2. Chọn chứng thư, nhập người ký, lý do, địa điểm và PIN; có thể tải ảnh con dấu/chữ ký hoặc vẽ trực tiếp.
3. Xem trước vị trí visual signature ở trang cuối và xác nhận ký.
4. Hệ thống lưu PDF đã ký thành `DocumentVersion` mới và ghi nhận chữ ký trong `DMS_DIGITAL_SIGNATURES`.

Chỉ coi tài liệu đã hoàn tất khi việc xác minh chữ ký trả về hợp lệ và phiên bản ký có thể tải lại.

### Bước 6 — In tem và lưu kho vật lý

1. Từ danh sách Hồ sơ hoặc Hộp, bấm **In Mã Vạch / QR Code**.
2. Kiểm tra QR chứa link/JSON tra cứu và barcode Code128 chứa mã định danh.
3. Chọn tem 100x50 mm cho máy in nhiệt hoặc bố cục A4 nhiều tem cho máy in văn phòng.
4. Dán tem và xác nhận vị trí Kho/Kệ/Hộp trên hệ thống.

### Bước 7 — Khai thác và hậu kiểm

- Tra cứu theo metadata, full-text OCR, mã QR hoặc barcode.
- Thực hiện yêu cầu mượn, phê duyệt, bàn giao, hoàn trả hoặc thu hồi.
- Theo dõi thông báo, audit log, dashboard và báo cáo định kỳ.
- Khi tài liệu thay đổi sau công bố, tạo phiên bản mới và chạy lại quy trình duyệt/ký thay vì ghi đè bản đã phát hành.

## 3. Điểm kiểm soát trước khi triển khai thật

- Tắt `AuthenticationBypass.Enabled`; giữ `DevelopmentOnly: true`.
- Thay `Jwt:SigningKey` bằng secret mạnh lấy từ biến môi trường hoặc secret store.
- Bắt buộc HTTPS, giới hạn CORS theo domain frontend và kiểm tra quyền Oracle.
- Sao lưu Oracle và `uploads/`; kiểm thử khôi phục phiên bản, xác minh chữ ký và audit log.
- Phân vai `SYSTEM_ADMIN`, `MANAGER`, `REVIEWER`, `DATA_ENTRY`, `VIEWER` theo nguyên tắc quyền tối thiểu.
