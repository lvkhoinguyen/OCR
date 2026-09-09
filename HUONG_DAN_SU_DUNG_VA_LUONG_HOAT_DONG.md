# SỔ TAY HƯỚNG DẪN SỬ DỤNG HỆ THỐNG IDP.DMS
### (Dành Cho Cán Bộ Văn Phòng, Văn Thư, Lưu Trữ Viên Và Lãnh Đạo Duyệt Hồ Sơ)

---

## 🎯 I. TỔNG QUAN HỆ THỐNG & 6 NHÓM CÔNG VIỆC CHÍNH

Hệ thống **IDP.DMS** giúp cơ quan/đơn vị chuyển toàn bộ hồ sơ giấy thành hồ sơ điện tử, tự động đọc chữ trên văn bản bằng máy (AI OCR), giúp tìm kiếm và quản lý kho lưu trữ nhanh chóng.

Thanh Menu chính ở trên cùng được chia thành **đúng 6 nhóm công việc rõ ràng**:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           6 NHÓM CÔNG VIỆC TRÊN MENU                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 1. Tạo kho & Thêm dữ liệu      ──► Tạo kho/kệ/hộp, tạo hồ sơ mới, tải văn bản lên│
│ 2. Chọn kho & Bóc tách dữ liệu ──► Máy đọc chữ tự động (OCR) & Kiểm tra thông tin│
│ 3. Kiểm duyệt văn bản đã tách ──► Lãnh đạo duyệt hồ sơ, yêu cầu sửa & Ký số     │
│ 4. Tra cứu & Mượn trả          ──► Tìm kiếm văn bản, đăng ký mượn & duyệt phiếu │
│ 5. Báo cáo & Thống kê          ──► Xem biểu đồ tiến độ & In/Xuất báo cáo Excel  │
│ 6. Cấu hình hệ thống           ──► Cấp tài khoản cán bộ & quản lý danh mục      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 II. XỬ LÝ NHANH KHI MÁY ĐỌC CHỮ (OCR) BỊ QUAY TRÒN / CHẠY MÃI KHÔNG XONG

> **Câu hỏi**: *Tôi bấm nút "Chạy OCR AI" mà thấy nút cứ quay vòng tròn mãi, không chịu xong thì phải làm thế nào?*

### 1. Vì sao lại bị như vậy?
Khi bạn để chế độ mặc định **"Gemini Vision AI"**, máy tính của bạn phải gửi ảnh văn bản qua mạng Internet ra ngoài máy chủ của Google để đọc chữ. Nếu hôm đó **mạng Internet của cơ quan bị chậm, chập chờn hoặc có tường lửa bảo mật chặn kết nối**, máy sẽ bị chờ rất lâu.

### 2. Bốn cách xử lý tức thì (Không cần khởi động lại máy hay tải lại trang):

* **Cách 1 - Bấm nút đỏ [✕ Hủy chờ OCR]**:
  - Khi nút đang quay màu xanh, bạn hãy **bấm trực tiếp vào nút màu đỏ `[✕ Hủy chờ OCR]`**. Máy sẽ dừng trạng thái chờ ngay lập tức mà bạn không cần phải bấm F5 hay đăng nhập lại.

* **Cách 2 - Đổi sang bộ đọc nội bộ (Khuyên dùng - Đọc trong 1-2 giây)**:
  - Ở ô chọn bên cạnh nút Chạy OCR, bạn bấm chuột vào và chọn dòng **`Tesseract OCR (Tiêu chuẩn)`** hoặc **`VietOCR (Offline AI)`**.
  - Bấm lại nút **`[Chạy OCR AI]`**: Máy tính sẽ đọc chữ ngay lập tức trong **1 đến 2 giây** bằng phần mềm cài sẵn trong máy, hoàn toàn không cần mạng Internet!

* **Cách 3 - Khoanh vùng chữ cần đọc (Zonal OCR)**:
  - Bấm vào nút màu xanh **`[Khoanh vùng (Zonal OCR)]`** ở phía trên ảnh văn bản.
  - Dùng chuột vẽ 1 ô vuông bao quanh vùng có Số quyết định hoặc Người ký ➔ Bấm **`[Bóc tách vùng đã chọn]`**: máy sẽ đọc riêng góc đó siêu nhanh.

* **Cách 4 - Tự gõ tay vào ô và bấm Lưu**:
  - Bạn **không bắt buộc** phải chờ máy đọc chữ! Bạn có thể vừa nhìn ảnh văn bản bên trái, vừa gõ thẳng Số hiệu, Ngày tháng, Cơ quan, Người ký vào các ô bên phải, rồi bấm nút **`[✓ Xác nhận & Lưu]`** là xong.

---

## 👩‍💼 III. HƯỚNG DẪN CHI TIẾT THEO CÔNG VIỆC HÀNG NGÀY

---

### PHẦN 1: DÀNH CHO CHUYÊN VIÊN VĂN THƯ & NHẬP LIỆU SỐ HÓA

#### Bước 1: Tạo vị trí lưu trữ (Kho - Kệ - Hộp)
1. Bấm Menu **`Tạo kho & Thêm dữ liệu`** ➔ Chọn **`Quản lý Kho - Kệ - Hộp`**.
2. Bấm nút xanh **`[+ Thêm mới]`**.
3. Điền các ô:
   - **Mã vị trí**: Ví dụ `KHO-01`, `KE-A`, `HOP-10`.
   - **Tên vị trí**: Ví dụ `Kho Lưu trữ số 1`, `Kệ tài liệu kinh tế`.
   - **Loại vị trí**: Chọn `KHO`, `KE` (Kệ), `TANG` (Tầng) hoặc `HOP` (Hộp hồ sơ).
   - **Kho cha**: Nếu tạo Kệ/Hộp thì chọn Kho cha chứa nó.
4. Bấm **`[Lưu]`**.

#### Bước 2: Tạo Hồ sơ và Đính kèm tệp scan
1. Bấm Menu **`Tạo kho & Thêm dữ liệu`** ➔ Chọn **`Danh mục Hồ sơ lưu trữ`**.
2. Bấm nút **`[+ Tạo Hồ sơ]`**:
   - Nhập **Mã hồ sơ** (Ví dụ: `HS-2026-001`).
   - Nhập **Tên hồ sơ** (Ví dụ: `Hồ sơ Nghiệm thu Bàn giao phần mềm`).
   - Chọn **Kho lưu trữ** chứa hồ sơ này.
   - Bấm **`[Lưu]`**.
3. Bấm vào hồ sơ vừa tạo, nhìn xuống bảng bên dưới và bấm **`[+ Thêm tài liệu]`**:
   - Nhập tên văn bản và chọn file ảnh chụp hoặc PDF từ máy tính của bạn lên.
   - Bấm **`[Lưu]`**.

#### Bước 3: Cho máy đọc chữ tự động (AI OCR) & Đối soát
1. Bấm Menu **`Chọn kho & Bóc tách dữ liệu`** ➔ Chọn **`Bóc tách văn bản AI`**.
2. Cột bên trái: Bấm chọn Kho để lọc ra tài liệu bạn vừa đưa vào.
3. Bấm vào tên tài liệu cần đọc chữ.
4. Bấm nút **`[⚡ Chạy OCR AI]`**.
5. Nhìn các ô bên phải: Kiểm tra xem Số văn bản, Ngày tháng, Cơ quan, Trích yếu, Người ký đã đúng với ảnh văn bản bên trái chưa. Nếu thiếu dấu hoặc sai chữ nào, bạn chỉ cần bấm chuột vào ô đó và sửa lại bằng bàn phím.
6. Bấm nút **`[✓ Xác nhận & Lưu]`** để lưu kết quả.

#### Bước 4: Trình gửi hồ sơ cho Sếp duyệt
1. Ngay tại màn hình bóc tách, sau khi kiểm tra xong, bạn bấm nút **`[🚀 Lưu & Gửi kiểm duyệt]`**.
2. Hồ sơ sẽ tự động chuyển sang trạng thái **"Chờ duyệt"** để Lãnh đạo thẩm định.

#### Bước 5: In tem mã vạch dán lên gáy hồ sơ
1. Bấm nút **`[In nhãn]`** (có biểu tượng mã QR).
2. Cửa sổ mẫu in tem hiện lên ➔ Bấm **`[In ngay]`** ra máy in để dán nhãn lên bìa hồ sơ hoặc mặt ngoài hộp lưu trữ.

---

### PHẦN 2: DÀNH CHO CÁN BỘ KIỂM DUYỆT & LÃNH ĐẠO DUYỆT HỒ SƠ

#### Bước 1: Xem danh sách hồ sơ cấp dưới gửi lên
1. Bấm Menu **`Kiểm duyệt văn bản đã tách`** ➔ Chọn **`Hồ sơ chờ phê duyệt`**.
2. Danh sách sẽ hiện tất cả các hồ sơ đang chờ bạn duyệt.
3. Bấm vào từng hồ sơ để xem tệp gốc và thông tin đã được bóc tách.

#### Bước 2: Ra quyết định xử lý
- **Nếu hồ sơ đã chuẩn xác**: Bấm nút xanh **`[✓ Phê duyệt]`** ➔ Hồ sơ hoàn tất và sẵn sàng để khai thác.
- **Nếu hồ sơ chụp bị mờ, thiếu trang hoặc sai thông tin**: Bấm nút vàng **`[⚠️ Yêu cầu bổ sung]`**, gõ lời nhắn (Ví dụ: *"Scan lại trang 2 bị mờ dấu mộc"*) ➔ Hồ sơ sẽ trả về cho văn thư bổ sung.
- **Nếu hồ sơ không đạt**: Bấm nút đỏ **`[✕ Từ chối]`**.

#### Bước 3: Ký số điện tử (Nếu cần)
1. Bấm Menu **`Kiểm duyệt văn bản đã tách`** ➔ Chọn **`Ký số văn bản`**.
2. Chọn văn bản PDF cần ký và bấm nút **`[Ký số]`** để đóng dấu thời gian điện tử chống làm giả văn bản.

---

### PHẦN 3: DÀNH CHO ĐỘC GIẢ & NGƯỜI TRA CỨU MƯỢN HỒ SƠ

#### Bước 1: Tìm kiếm văn bản
1. Bấm Menu **`Tra cứu & Mượn trả`** ➔ Chọn **`Tìm kiếm hồ sơ`**.
2. Gõ số quyết định, tên hồ sơ hoặc từ khóa bất kỳ vào ô tìm kiếm rồi bấm Enter.
3. Bạn sẽ nhìn thấy ngay hồ sơ cần tìm và biết chính xác hồ sơ bản gốc đang nằm ở **Kho nào, Kệ nào, Hộp số mấy**.

#### Bước 2: Đăng ký mượn hồ sơ
1. Bấm nút **`[Đăng ký mượn]`** tại hồ sơ bạn cần.
2. Chọn:
   - **Bản mềm**: Để đọc trực tuyến trên máy tính.
   - **Bản cứng**: Để đến kho rút tệp hồ sơ gốc.
3. Nhập ngày mượn, ngày hẹn trả và bấm **`[Gửi yêu cầu mượn]`**.
4. Khi Thủ kho duyệt phiếu, bạn sẽ có quyền xem hoặc đến nhận hồ sơ.

---

## 💡 IV. KINH NGHIỆM SCAN VÀ CHỤP ẢNH TÀI LIỆU ĐẠT CHUẨN

1. **Độ phân giải máy scan**: Đặt ở mức **`200 DPI`** hoặc **`300 DPI`** (Đây là mức chuẩn nhất: vừa đủ nét cho máy đọc chữ, vừa nhẹ máy, dung lượng chỉ khoảng 1MB đến 2MB).
2. **Chiều văn bản**: Đặt giấy thẳng đứng trước khi scan. Tránh để văn bản bị nằm ngang hay lộn ngược đầu.
3. **Màu sắc**: Nên chọn chế độ scan **Ảnh màu** hoặc **Xám (Grayscale)** để thấy rõ dấu mộc đỏ và chữ ký mực xanh.
4. **Định dạng file**: Chọn lưu thành file **`PDF`**, **`JPG`** hoặc **`PNG`**.

---

## ❓ V. TÓM TẮT CÁC NÚT BẤM QUAN TRỌNG TRÊN HỆ THỐNG

| Nút bấm | Màu sắc | Ý nghĩa thao tác |
|---|:---:|---|
| **`[⚡ Chạy OCR AI]`** | Xanh dương | Ra lệnh cho máy tính đọc chữ trên ảnh văn bản |
| **`[✕ Hủy chờ OCR]`** | Đỏ | Dừng ngay việc chờ khi máy bị quay tròn lâu |
| **`[Khoanh vùng Zonal OCR]`** | Xanh lam | Dùng chuột vẽ ô để đọc riêng 1 góc chữ cần lấy |
| **`[✓ Xác nhận & Lưu]`** | Xanh lá | Lưu lại thông tin đối soát vào kho lưu trữ |
| **`[🚀 Lưu & Gửi kiểm duyệt]`** | Xanh ngọc | Lưu xong và chuyển ngay cho sếp duyệt |
| **`[In nhãn]`** | Tím | In tem mã vạch dán lên gáy hồ sơ / hộp |
| **`[📖 Hướng dẫn sử dụng]`** | Xanh lá đậm | Mở cuốn sổ tay hướng dẫn này bất cứ lúc nào |

---
*(Sổ tay hướng dẫn sử dụng IDP.DMS biên soạn riêng cho người dùng nghiệp vụ văn phòng)*
