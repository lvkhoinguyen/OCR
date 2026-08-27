# HƯỚNG DẪN SỬ DỤNG VÀ LUỒNG HOẠT ĐỘNG HỆ THỐNG IDP.DMS
**(Hệ thống Quản lý và Số hóa Hồ sơ Lưu trữ Tích hợp AI OCR)**

---

## 📋 TỔNG QUAN LUỒNG HOẠT ĐỘNG DỰ ÁN (END-TO-END WORKFLOW)

Hệ thống **IDP.DMS** xử lý toàn bộ vòng đời của hồ sơ lưu trữ từ lúc khởi tạo kho, nhập liệu văn bản, tự động bóc tách dữ liệu bằng AI OCR, trình duyệt quy trình workflow, đến tra cứu khai thác và báo cáo thống kê.

```text
[1. Khởi tạo Kho & Kệ] ──► [2. Tạo Hồ sơ Lưu trữ] ──► [3. Tạo Văn bản Thành phần]
                                                                  │
                                                                  ▼
[6. Báo cáo & Thống kê] ◄── [5. Phê duyệt Hồ sơ] ◄── [4. Chạy AI OCR Bóc tách]
         │                                                      │
         ▼                                                      ▼
[7. Tra cứu & Khai thác] ◄─────────────────────────── [Đăng ký Mượn trả Hồ sơ]
```

### Chi tiết các giai đoạn:
1. **Khởi tạo dữ liệu nền**: Thiết lập hệ thống Kho - Kệ - Tầng - Hộp để lưu trữ vị trí vật lý của hồ sơ.
2. **Khởi tạo Hồ sơ lưu trữ**: Tạo mới mã hồ sơ, tên hồ sơ, gắn vào kho lưu trữ (Trạng thái: *Dự thảo - DRAFT*).
3. **Thêm Văn bản thành phần**: Tải tệp văn bản (Ảnh, PDF) vào hồ sơ tương ứng.
4. **Số hóa & Bóc tách AI OCR**: Sử dụng công nghệ AI tự động nhận dạng chữ viết, trích xuất dữ liệu biểu mẫu.
5. **Trình duyệt & Kiểm duyệt (Workflow)**: Trình gửi hồ sơ (*DRAFT -> PENDING*), Cán bộ kiểm duyệt thẩm định (*APPROVED / NEEDS_SUPPLEMENT / REJECTED*).
6. **Khai thác & Mượn trả**: Tra cứu hồ sơ trực tuyến, gửi phiếu đăng ký mượn bản cứng/bản mềm và duyệt phiếu mượn.
7. **Báo cáo & Thống kê**: Theo dõi tỷ lệ số hóa, tiến độ công việc và xuất báo cáo PDF/Excel.

---

## 🛠️ HƯỚNG DẪN THAO TÁC CHI TIẾT TỪNG BƯỚC (BẤM VÀO ĐÂU - LÀM NHỮNG GÌ)

---

### BƯỚC 1: KHỞI TẠO DANH MỤC KHO LƯU TRỮ (KHO / KỆ / TẦNG / HỘP)

> **Mục đích**: Khai báo danh mục vị trí vật lý dùng để quản lý vị trí lưu trữ hồ sơ.

* **Bấm vào đâu**:
  1. Nhìn vào thanh menu chính bên trái.
  2. Bấm chọn menu **`Danh mục`** ──► Chọn **`Danh mục kho lưu trữ`** (hoặc **`Quản lý Kho - Kệ - Tầng - Hộp`**).

* **Làm những gì**:
  1. Tại màn hình danh sách, bấm vào nút màu xanh **`[+ Thêm mới]`**.
  2. Nhập các thông tin vào form:
     * **Mã vị trí / Mã kho**: Nhập mã (Ví dụ: `KHO-001`).
     * **Tên vị trí / Tên kho**: Nhập tên (Ví dụ: `Kho Lưu Trữ Trung Tâm`).
     * **Loại vị trí**: Chọn từ menu thả xuống (`KHO` / `KE` / `TANG` / `HOP`).
     * **Kho cha**: Để trống nếu là Kho chính, hoặc chọn Kho tương ứng nếu đang tạo Kệ/Tầng/Hộp.
     * **Trạng thái**: Chọn `ACTIVE` (Đang hoạt động).
     * **Sức chứa**: Nhập số lượng (Ví dụ: `1000`).
  3. Bấm nút **`[Lưu]`** để hoàn tất.
  4. *Kết quả*: Vị trí kho mới được ghi nhận vào hệ thống và hiển thị trong danh sách.

---

### BƯỚC 2: TẠO MỚI HỒ SƠ LƯU TRỮ (DOSSIER)

> **Mục đích**: Tạo cặp/hồ sơ chứa các tài liệu văn bản thành phần.

* **Bấm vào đâu**:
  1. Trên menu chính, bấm chọn **`Nhập liệu & Số hóa hồ sơ`**.
  2. Bấm chọn màn hình **`GĐ2-1 Quản lý tài liệu`** (hoặc chọn **`Nhập mới hồ sơ`**).

* **Làm những gì**:
  1. Bấm nút **`[Thêm mới Hồ sơ]`** (hoặc **`[+ Tạo Hồ sơ]`**).
  2. Điền đầy đủ các thông tin hồ sơ:
     * **Mã hồ sơ**: Nhập mã duy nhất (Ví dụ: `HS-2026-001`).
     * **Tên hồ sơ**: Nhập tên hồ sơ (Ví dụ: `Hồ sơ Dự án Đầu tư Xây dựng Trụ sở`).
     * **Kho hồ sơ**: Click chọn kho đã tạo ở Bước 1 từ danh sách thả xuống (Ví dụ: `KHO-001 - Kho Lưu Trữ Trung Tâm`).
     * **Loại hồ sơ**: Chọn loại thích hợp (Ví dụ: *Hành chính*, *Tài chính*, *Nhân sự*...).
     * **Trạng thái**: Mặc định để **`DRAFT`** (Dự thảo).
     * **Từ ngày / Đến ngày**: Chọn khung thời gian của hồ sơ (nếu có).
     * **Mô tả / Ghi chú**: Nhập nội dung tóm tắt của hồ sơ.
  3. Bấm nút **`[Lưu]`**.
  4. *Kết quả*: Hồ sơ được tạo thành công với trạng thái `DRAFT` và đã sẵn sàng để thêm văn bản đính kèm.

---

### BƯỚC 3: TẠO VĂN BẢN / TÀI LIỆU THÀNH PHẦN THUỘC HỒ SƠ

> **Mục đích**: Khai báo các văn bản tờ trình, quyết định, hợp đồng thuộc về Hồ sơ vừa tạo.

* **Bấm vào đâu**:
  1. Tại màn hình **`GĐ2-1 Quản lý tài liệu`** (hoặc mục **`Tài liệu/OCR`**).
  2. Bấm chọn Hồ sơ cần thêm văn bản trong danh sách hồ sơ.

* **Làm những gì**:
  1. Bấm nút **`[Thêm mới Văn bản]`** (hoặc **`[+ Thêm tài liệu]`**).
  2. Nhập các thông tin văn bản:
     * **Hồ sơ liên kết**: Đã được tự động chọn theo Hồ sơ bạn đang thao tác (Ví dụ: `HS-2026-001`).
     * **Mã văn bản**: Nhập mã văn bản (Ví dụ: `VB-01/QĐ-2026`).
     * **Tên văn bản**: Nhập tên văn bản (Ví dụ: `Quyết định phê duyệt dự án`).
     * **Trạng thái OCR**: Hệ thống mặc định là **`PENDING`** (Chờ xử lý OCR).
     * **Trạng thái văn bản**: Để **`DRAFT`**.
  3. Bấm nút **`[Lưu]`**.
  4. *Kết quả*: Văn bản được liên kết vào hồ sơ và sẵn sàng cho bước bóc tách dữ liệu AI OCR.

---

### BƯỚC 4: THỰC HIỆN BÓC TÁCH DỮ LIỆU BẰNG AI OCR

> **Mục đích**: Tải file скан/ảnh/PDF văn bản lên và sử dụng trí tuệ nhân tạo (AI) để tự động đọc và trích xuất chữ/dữ liệu.

* **Bấm vào đâu**:
  1. Nhìn thanh menu bên trái, tìm nhóm **`Công cụ AI & OCR`**.
  2. Bấm chọn **`GĐ2-6 OCR AI tích hợp`**.

* **Làm những gì**:
  1. **Chọn văn bản**: Tại danh sách *"Danh sách văn bản"* bên trái màn hình, click chọn văn bản cần bóc tách (Ví dụ: `VB-01/QĐ-2026`).
  2. **Chọn Công cụ (Engine) OCR**:
     * Chọn **Gemini AI** (để bóc tách thông minh, nhận diện biểu mẫu, trích xuất cấu trúc).
     * Hoặc chọn các engine khác như **EasyOCR**, **VietOCR**, **Tesseract**.
  3. **Tải tệp & Chạy OCR**:
     * Bấm nút màu xanh **`[Chọn file và chạy OCR]`**.
     * Cửa sổ chọn file mở ra ──► Chọn tệp ảnh (`.png`, `.jpg`) hoặc file PDF của văn bản trên máy tính của bạn ──► Bấm **`Open`**.
  4. **Kiểm tra kết quả**:
     * Hệ thống sẽ xử lý trong giây lát.
     * Nội dung chữ, các trường thông tin trích xuất (Số văn bản, Ngày ban hành, Trích yếu, Cơ quan ban hành...) sẽ tự động hiển thị ở khung **"Kết quả OCR AI"**.
  5. **Lưu dữ liệu vào Hệ thống**:
     * Soát xét lại kết quả bóc tách trên màn hình.
     * Bấm nút **`[Lưu OCR vào DB]`** để lưu vĩnh viễn kết quả bóc tách và tệp đính kèm vào cơ sở dữ liệu.
  6. *Kết quả*: Trạng thái OCR chuyển từ `PENDING` ──► **`DONE`**.

---

### BƯỚC 5: TRÌNH GỬI PHÊ DUYỆT HỒ SƠ (SUBMIT WORKFLOW)

> **Mục đích**: Chuyển hồ sơ đã số hóa hoàn tất sang bộ phận kiểm duyệt.

* **Bấm vào đâu**:
  1. Ngay tại màn hình **`GĐ2-6 OCR AI tích hợp`** (hoặc màn hình **`GĐ2-1 Quản lý tài liệu`**).

* **Làm những gì**:
  1. Kiểm tra chắc chắn Hồ sơ đã có đủ văn bản và dữ liệu OCR.
  2. Bấm nút màu xanh lá/xanh dương **`[Gửi kiểm duyệt]`**.
  3. *Kết quả*: 
     * Hệ thống gửi thông báo *"Gửi kiểm duyệt hồ sơ thành công"*.
     * Trạng thái Hồ sơ tự động chuyển từ **`DRAFT`** (Dự thảo) ──► **`PENDING`** (Chờ phê duyệt).
     * Hồ sơ sẽ xuất hiện trong Hàng chờ duyệt của Cán bộ Phê duyệt.

---

### BƯỚC 6: CÁN BỘ PHÊ DUYỆT / XỬ LÝ HỒ SƠ (APPROVAL WORKFLOW)

> **Mục đích**: Cán bộ thẩm định kiểm tra thông tin hồ sơ và đưa ra quyết định Duyệt, Yêu cầu sửa đổi hoặc Từ chối.

* **Bấm vào đâu**:
  1. Đăng nhập bằng tài khoản Cán bộ kiểm duyệt / Lãnh đạo.
  2. Trên menu chính, vào nhóm **`Phê duyệt & Xuất bản hồ sơ`**.
  3. Bấm chọn **`GĐ2-2 Quản lý quy trình`** (hoặc **`Hàng chờ duyệt & Quản lý quy trình Workflow`**).

* **Làm những gì**:
  1. Tại danh sách hồ sơ chờ xử lý, click chọn Hồ sơ có trạng thái **`PENDING`**.
  2. Khung chi tiết bên phải hiển thị toàn bộ nội dung hồ sơ, file đính kèm và kết quả bóc tách OCR để đối soát.
  3. Chọn 1 trong các nút hành động phù hợp:
     * **Trường hợp 1 - Hồ sơ hợp lệ**: Bấm nút **`[Phê duyệt]`**.
       * *Trạng thái hồ sơ đổi thành*: **`APPROVED`** (Đã duyệt) ──► Chuyển sang Xuất bản (**`PUBLISHED`**).
     * **Trường hợp 2 - Hồ sơ thiếu thông tin/sai sót**: Bấm nút **`[Yêu cầu bổ sung]`**.
       * Nhập lý do/nội dung cần chỉnh sửa vào ô thông báo.
       * *Trạng thái hồ sơ đổi thành*: **`NEEDS_SUPPLEMENT`** (Yêu cầu bổ sung) ──► Trả về cho chuyên viên nhập liệu sửa và gửi lại.
     * **Trường hợp 3 - Hồ sơ không đạt**: Bấm nút **`[Từ chối]`**.
       * Nhập lý do từ chối.
       * *Trạng thái hồ sơ đổi thành*: **`REJECTED`** (Từ chối).

---

### BƯỚC 7: TRA CỨU & ĐĂNG KÝ MƯỢN / KHAI THÁC HỒ SƠ

> **Mục đích**: Cho phép người dùng/cán bộ tra cứu tìm kiếm hồ sơ và lập phiếu đăng ký mượn khai thác.

* **Bấm vào đâu**:
  1. Vào menu **`Tra cứu & Đăng ký mượn hồ sơ`**.
  2. Bấm chọn **`GĐ2-26 Quy trình mượn, tra, khai thác hồ sơ`**.

* **Làm những gì**:
  1. **Tìm kiếm Hồ sơ**:
     * Nhập từ khóa vào ô *"Tìm kiếm"* (Tìm theo Mã hồ sơ, Tên hồ sơ, Nội dung bóc tách OCR...).
     * Bấm nút **`[Tìm kiếm]`**.
  2. **Tạo phiếu mượn**:
     * Click vào hồ sơ muốn mượn từ kết quả tìm kiếm.
     * Bấm nút **`[Đăng ký mượn]`**.
     * Nhập các thông tin trong cửa sổ Đăng ký mượn:
       * **Hình thức mượn**: Chọn *Bản mềm (xem trực tuyến)* hoặc *Bản cứng (mượn tệp gốc)*.
       * **Người mượn**: Nhập tên/đơn vị người mượn.
       * **Ngày mượn / Ngày trả**: Chọn thời gian sử dụng.
       * **Mục đích mượn**: Nhập lý do sử dụng hồ sơ.
     * Bấm nút **`[Gửi yêu cầu mượn]`**.
  3. *Kết quả*: Phiếu mượn được khởi tạo ở trạng thái **`PENDING`** (Chờ duyệt mượn).

---

### BƯỚC 8: DUYỆT PHIẾU ĐĂNG KÝ MƯỢN HỒ SƠ

> **Mục đích**: Thủ kho / Cán bộ lưu trữ duyệt cấp quyền khai thác hồ sơ.

* **Bấm vào đâu**:
  1. Vào menu **`Duyệt đăng ký mượn hồ sơ`** (hoặc **`Hàng chờ duyệt mượn hồ sơ`**).

* **Làm những gì**:
  1. Chọn phiếu mượn cần xử lý trong danh sách.
  2. Xem chi tiết người mượn và lý do mượn.
  3. Bấm **`[Phê duyệt phiếu mượn]`** (hoặc **`[Từ chối]`**).
  4. *Kết quả*: Người mượn nhận được thông báo và có quyền xem trực tuyến (nếu mượn bản mềm) hoặc nhận hồ sơ (nếu mượn bản cứng).

---

### BƯỚC 9: BÁO CÁO, THỐNG KÊ & DASHBOARD LÃNH ĐẠO

> **Mục đích**: Theo dõi toàn bộ chỉ số hoạt động số hóa và xuất báo cáo nghiệp vụ.

* **Bấm vào đâu**:
  1. Vào menu **`Báo cáo & Thống kê`** ──► Chọn **`GĐ2-10 Báo cáo và phân tích`**.
  2. (Dành cho Lãnh đạo): Vào menu **`Tài khoản cá nhân & Dashboard`** ──► Chọn **`GĐ2-13 Dashboard lãnh đạo`**.

* **Làm những gì**:
  1. Xem các biểu đồ và chỉ số trực quan:
     * Tổng số hồ sơ lưu trữ / Tổng số văn bản.
     * Tỷ lệ hoàn thành OCR bóc tách AI (%).
     * Số lượng hồ sơ đã duyệt / chờ duyệt / cần bổ sung.
     * Thống kê lượt mượn trả hồ sơ theo tháng/quý.
  2. **Xuất báo cáo**:
     * Chọn khoảng thời gian cần tổng hợp.
     * Bấm nút **`[Xuất Excel]`** hoặc **`[Xuất PDF]`** để tải tệp báo cáo về máy tính.

---

## 📌 BẢNG TÓM TẮT SƠ ĐỒ CHUYỂN TRẠNG THÁI HỒ SƠ (STATUS MATRIX)

| Trạng thái | Ý nghĩa | Thao tác kích hoạt | Quyền xử lý tiếp theo |
| :--- | :--- | :--- | :--- |
| **`DRAFT`** | Hồ sơ mới tạo / Dự thảo | Bấm `[Thêm mới Hồ sơ]` | Thêm văn bản, chạy OCR, bấm `[Gửi kiểm duyệt]` |
| **`PENDING`** | Đang chờ kiểm duyệt | Bấm `[Gửi kiểm duyệt]` ở bước 5 | Cán bộ duyệt bấm `[Phê duyệt]` / `[Yêu cầu bổ sung]` / `[Từ chối]` |
| **`APPROVED`** | Hồ sơ đã được duyệt | Cán bộ duyệt bấm `[Phê duyệt]` | Chuyển trạng thái xuất bản (`PUBLISHED`) |
| **`NEEDS_SUPPLEMENT`** | Cần bổ sung/chỉnh sửa | Cán bộ duyệt bấm `[Yêu cầu bổ sung]` | Chuyên viên sửa thông tin, sau đó bấm `[Gửi kiểm duyệt]` lại |
| **`REJECTED`** | Hồ sơ bị từ chối | Cán bộ duyệt bấm `[Từ chối]` | Đóng hồ sơ hoặc tạo hồ sơ mới |
| **`PUBLISHED`** | Hồ sơ đã xuất bản | Bấm `[Xuất bản]` | Hồ sơ có thể tra cứu và đăng ký mượn khai thác |

---

## 💡 CÁC LƯU Ý QUAN TRỌNG KHI DEMO VÀ BẢN GIAO CHO KHÁCH HÀNG

1. **Không cần nhập ID thủ công**: Các trường như Kho hồ sơ, Hồ sơ mẹ đều sử dụng danh sách chọn (Dropdown), khách hàng không cần nhớ hoặc gõ mã ID bằng tay.
2. **Trạng thái OCR PENDING**: Là trạng thái hoàn toàn bình thường của văn bản mới tạo chưa qua xử lý AI. Sau khi chạy OCR và bấm `[Lưu OCR vào DB]`, hệ thống sẽ cập nhật trạng thái sang `DONE`.
3. **Thao tác mượt mà**: Toàn bộ thao tác thêm mới, chạy OCR, gửi duyệt và phê duyệt đều diễn ra tức thì trên giao diện web và được đồng bộ trực tiếp vào Cơ sở dữ liệu Oracle của hệ thống.

---
*(Tài liệu này được soạn thảo chuẩn hóa để gửi trực tiếp cho Khách hàng sử dụng và tham chiếu)*
