# TÀI LIỆU HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ VÀ SỐ HÓA HỒ SƠ LƯU TRỮ IDP.DMS
### (Tài Liệu Bàn Giao Dành Riêng Cho Người Dùng Nghiệp Vụ Văn Phòng - Cầm Tay Chỉ Việc)

---

## 📖 LỜI NÓI ĐẦU: HỆ THỐNG IDP.DMS LÀ GÌ?

Chào mừng Anh/Chị đến với Hệ thống Quản lý và Số hóa Hồ sơ Lưu trữ **IDP.DMS**.

Trước đây, khi quản lý hồ sơ giấy truyền thống, việc tìm kiếm một văn bản cũ thường mất hàng giờ lục lọi trong các kho tài liệu bám bụi. Với hệ thống **IDP.DMS**, toàn bộ quy trình này được đưa lên máy tính:
- Toàn bộ hồ sơ giấy sau khi scan (chụp ảnh) sẽ được gom vào các **Hồ sơ điện tử** tương ứng trên phần mềm.
- Hệ thống có **"trợ lý đọc chữ tự động" (AI OCR)**: Tự động đọc ảnh scan và điền sẵn Số hiệu, Ngày tháng, Cơ quan ban hành, Trích yếu và Người ký vào các ô cho Anh/Chị mà không bắt Anh/Chị phải ngồi gõ lại từng chữ.
- Lãnh đạo có thể xem xét và phê duyệt hồ sơ, ký số điện tử ngay trên máy tính mà không cần in giấy.
- Khi cần tìm lại văn bản, chỉ cần gõ một từ khóa vào ô tìm kiếm là hệ thống lập tức chỉ rõ văn bản đó đang nằm ở **Kho nào, Kệ nào, Hộp số mấy**.

> **💡 LƯU Ý DỄ NHỚ**: Trên thanh Menu màu xanh ở phía trên cùng của màn hình, toàn bộ chức năng được xếp thành **đúng 6 nhóm công việc** theo đúng trình tự làm việc từ trước ra sau:
> 1. **Tạo kho & Thêm dữ liệu** ➔ 2. **Chọn kho & Bóc tách dữ liệu** ➔ 3. **Kiểm duyệt văn bản đã tách** ➔ 4. **Tra cứu & Mượn trả** ➔ 5. **Báo cáo & Thống kê** ➔ 6. **Cấu hình hệ thống**.
> Ở góc trên bên phải thanh Menu luôn có nút màu xanh **`[📖 Hướng dẫn sử dụng]`**, Anh/Chị có thể bấm vào đó bất cứ lúc nào để xem lại hướng dẫn này.

---

## 🚪 PHẦN 1: BẮT ĐẦU SỬ DỤNG (ĐĂNG NHẬP VÀO HỆ THỐNG)

1. Mở trình duyệt web trên máy tính của bạn (Google Chrome, Cốc Cốc, Microsoft Edge).
2. Gõ địa chỉ phần mềm do bộ phận kỹ thuật bàn giao (Ví dụ: `http://localhost:5173`).
3. Màn hình Đăng nhập hiện ra:
   - Nhập **Tên đăng nhập** và **Mật khẩu** đã được cấp.
   - Bấm nút **`[Đăng nhập]`**.
4. Khi vào màn hình chính, nhìn lên góc trên bên phải màn hình:
   - Bạn sẽ thấy Tên của mình và Vai trò công việc của bạn (Ví dụ: *Nguyễn Văn A - Chuyên viên số hóa* hoặc *Trần Thị B - Cán bộ kiểm duyệt*).
   - Hệ thống sẽ tự động hiển thị các mục công việc phù hợp với vai trò của bạn.

---

## 🛠️ PHẦN 2: HƯỚNG DẪN 6 CÔNG VIỆC CHÍNH (CHI TIẾT TỪNG CÚ CLICK CHUỘT)

---

### CÔNG VIỆC 1: TẠO KHO LƯU TRỮ VÀ TẠO HỒ SƠ MỚI
*(Dành cho Chuyên viên Văn thư, Thủ kho và Chuyên viên Nhập liệu)*

#### 1.1. Khởi tạo sơ đồ vị trí (Kho - Kệ - Tầng - Hộp)
> **Mục đích**: Khai báo các vị trí cất giữ hồ sơ thực tế ngoài đời để phần mềm ghi nhớ.

* **Bước 1**: Nhìn lên Menu trên cùng, bấm chọn mục **`Tạo kho & Thêm dữ liệu`** ➔ Bấm chọn **`Quản lý Kho - Kệ - Hộp`**.
* **Bước 2**: Bấm vào nút màu xanh **`[+ Thêm mới]`** ở góc trái.
* **Bước 3**: Điền thông tin vào các ô:
  - **Mã vị trí**: Gõ mã ngắn gọn (Ví dụ: `KHO-01`, `KE-A`, `HOP-05`).
  - **Tên vị trí**: Gõ tên dễ hiểu (Ví dụ: `Kho Lưu trữ Tầng 2`, `Kệ tài liệu Dự án`).
  - **Loại vị trí**: Bấm chuột vào ô thả xuống và chọn:
    + Chọn `KHO` nếu là phòng kho lớn.
    + Chọn `KE` nếu là kệ/giá sắt.
    + Chọn `TANG` nếu là từng tầng của kệ.
    + Chọn `HOP` nếu là hộp/cặp đựng tài liệu.
  - **Kho cha**: Nếu tạo Kệ thì chọn Kho chứa nó. Nếu tạo Hộp thì chọn Kệ chứa nó.
* **Bước 4**: Bấm nút **`[Lưu]`**. Vị trí mới sẽ hiện ngay trong danh sách.

#### 1.2. Tạo Hồ sơ mới và Tải văn bản scan lên
> **Mục đích**: Tạo một tập/cặp hồ sơ trên phần mềm và đính kèm các tệp scan vào.

* **Bước 1**: Bấm Menu **`Tạo kho & Thêm dữ liệu`** ➔ Bấm chọn **`Danh mục Hồ sơ lưu trữ`**.
* **Bước 2**: Nhìn vào bảng Hồ sơ bên trái, bấm nút **`[+ Tạo Hồ sơ]`**:
  - Nhập **Mã hồ sơ**: Ví dụ `HS-2026-001`.
  - Nhập **Tên hồ sơ**: Ví dụ `Hồ sơ nghiệm thu bàn giao hệ thống số hóa`.
  - **Kho lưu trữ**: Bấm chọn kho đã tạo ở bước trên (Ví dụ: `Kho Lưu trữ Tầng 2`).
  - Bấm nút **`[Lưu]`**. Hồ sơ vừa tạo sẽ xuất hiện với trạng thái nháp là **`DRAFT`**.
* **Bước 3 (Đính kèm tệp)**:
  - Bấm chuột vào dòng Hồ sơ vừa tạo trong danh sách.
  - Nhìn xuống bảng *Danh sách văn bản thành phần* ở phía dưới, bấm nút **`[+ Thêm tài liệu]`**.
  - Nhập **Mã văn bản** (Ví dụ `VB-01`), **Tên văn bản** (Ví dụ `Quyết định phê duyệt dự án`).
  - Ở ô đính kèm tệp, bấm nút chọn tệp và chỉ đường dẫn tới file ảnh scan (`.jpg`, `.png`) hoặc file `.pdf` trên máy tính của bạn.
  - Bấm nút **`[Lưu]`**. Văn bản đã được gắn vào hồ sơ và sẵn sàng để đọc chữ tự động.

---

### CÔNG VIỆC 2: CHO MÁY TỰ ĐỘNG ĐỌC CHỮ (AI OCR) & ĐỐI SOÁT
*(Tính năng hiện đại nhất giúp bạn không phải ngồi gõ lại nội dung)*

* **Bước 1**: Nhìn lên Menu trên cùng, bấm chọn **`Chọn kho & Bóc tách dữ liệu`** ➔ Bấm chọn **`Bóc tách văn bản AI`**.
* **Bước 2 (Tìm văn bản cần đọc chữ)**:
  - Nhìn sang cột bên trái: Bấm chọn vào tên Kho lưu trữ chứa hồ sơ của bạn.
  - Danh sách văn bản thuộc kho đó sẽ hiện ra. Bấm chuột vào văn bản bạn muốn đọc chữ.
  - Văn bản scan gốc sẽ lập tức hiển thị to rõ nét ở khung giữa màn hình.
* **Bước 3 (Ra lệnh cho máy đọc)**:
  - Bấm nút màu xanh dương có hình tia sét: **`[⚡ Chạy OCR AI]`**.
  - Máy tính sẽ bắt đầu quét ảnh văn bản và tự động điền các thông tin tìm được vào các ô bên phải:
    + *Số/Ký hiệu văn bản*
    + *Ngày ban hành*
    + *Cơ quan ban hành*
    + *Trích yếu nội dung*
    + *Người ký / Chức vụ*
    + *Toàn bộ nội dung văn bản ở khung dưới*
* **Bước 4 (Kiểm tra lại - Đối soát)**:
  - Bạn chỉ cần liếc mắt nhìn văn bản bên trái và đối chiếu với các ô bên phải.
  - Nếu máy đọc chuẩn rồi ➔ Giữ nguyên.
  - Nếu máy đọc thiếu một chữ hoặc sai dấu ➔ Bấm chuột thẳng vào ô đó và sửa lại bằng bàn phím y như gõ Word thông thường.
* **Bước 5 (Lưu và Trình sếp duyệt)**:
  - Nếu chỉ muốn lưu kết quả lại: Bấm nút xanh lá **`[✓ Xác nhận & Lưu]`**.
  - Nếu muốn chuyển thẳng hồ sơ cho sếp duyệt: Bấm nút màu xanh **`[🚀 Lưu & Gửi kiểm duyệt]`**. Hồ sơ sẽ tự động chuyển sang trạng thái "Chờ duyệt" và xuất hiện ngay trên máy của Cán bộ kiểm duyệt.

---

### 🚨 MỤC CẤP CỨU: "KHI MÁY ĐỌC CHỮ BỊ QUAY TRÒN MÃI THÌ XỬ LÝ THẾ NÀO?"

> **Câu hỏi thực tế**: *"Tôi bấm nút Chạy OCR AI mà thấy nút cứ quay vòng tròn mãi không chịu xong, màn hình như bị đơ thì phải làm sao?"*

#### 1. Nguyên nhân vì sao?
Anh/Chị hoàn toàn yên tâm, **phần mềm không bị hỏng và Anh/Chị không hề thao tác sai!** Hiện tượng này xảy ra khi ở chế độ mặc định (*Gemini Vision AI*), máy tính phải gửi ảnh qua mạng Internet ra máy chủ của Google để đọc chữ. Nếu hôm đó **đường truyền mạng Internet của cơ quan bị chậm, chập chờn hoặc mạng nội bộ có tường lửa bảo mật chặn kết nối ra ngoài**, tiến trình sẽ bị chờ rất lâu.

#### 2. Bốn cách xử lý tức thì (Cực kỳ đơn giản):

* **Cách 1: Bấm nút đỏ `[✕ Hủy chờ OCR]` (Nhanh nhất)**:
  - Khi nút đang quay, nó sẽ biến thành nút màu đỏ có chữ **`[✕ Hủy chờ OCR]`**.
  - Anh/Chị chỉ cần **bấm vào nút đỏ đó**: Máy sẽ dừng chờ ngay lập tức mà **không cần phải bấm phím F5 hay tải lại trang web**!

* **Cách 2: Đổi sang bộ đọc nội bộ Tesseract / VietOCR (Khuyên dùng nhất)**:
  - Ngay bên cạnh nút Chạy OCR có một ô lựa chọn (Dropdown). Bấm chuột vào ô đó và chọn dòng:
    👉 **`Tesseract OCR (Tiêu chuẩn)`** hoặc **`VietOCR (Offline AI)`**.
  - Bấm lại nút **`[⚡ Chạy OCR AI]`**.
  - **Kết quả**: Máy tính sẽ đọc chữ ngay lập tức chỉ trong **1 đến 2 giây** vì phần mềm đọc chữ này đã được cài sẵn ngay trong máy tính cơ quan, hoàn toàn không cần kết nối mạng Internet ra bên ngoài!

* **Cách 3: Tự gõ tay vào ô và bấm Lưu (Không cần máy đọc)**:
  - Phần mềm thiết kế rất linh hoạt: Anh/Chị **không bắt buộc** phải chờ máy đọc chữ!
  - Hãy vừa nhìn ảnh văn bản bên trái, vừa gõ thẳng Số quyết định, Ngày tháng, Cơ quan vào các ô bên phải, rồi bấm nút **`[✓ Xác nhận & Lưu]`**. Hệ thống luôn ưu tiên lưu trữ thông tin do chính tay Anh/Chị điền vào.

* **Cách 4: Dùng chuột khoanh vùng chữ cần đọc (Zonal OCR)**:
  - Ở phía trên ảnh văn bản, bấm vào nút màu xanh **`[Khoanh vùng (Zonal OCR)]`**.
  - Dùng chuột vẽ một ô chữ nhật bao quanh dòng có Số quyết định hoặc tên Người ký ➔ Bấm **`[Bóc tách vùng đã chọn]`**: Máy sẽ đọc riêng đúng ô đó siêu tốc.

---

### CÔNG VIỆC 3: LÃNH ĐẠO DUYỆT HỒ SƠ & KÝ SỐ ĐIỆN TỬ
*(Dành cho Cán bộ Kiểm duyệt, Trưởng phòng và Lãnh đạo cơ quan)*

* **Bước 1 (Xem hồ sơ chờ duyệt)**:
  - Nhìn lên Menu trên cùng, bấm chọn **`Kiểm duyệt văn bản đã tách`** ➔ Bấm chọn **`Hồ sơ chờ phê duyệt`**.
  - Danh sách toàn bộ các hồ sơ cấp dưới đã gửi lên sẽ hiện ra.
  - Bấm chuột vào từng hồ sơ để xem chi tiết ảnh chụp văn bản gốc và các thông tin đã được bóc tách đối chiếu.
* **Bước 2 (Ra quyết định)**:
  - **Trường hợp 1 - Hồ sơ đã chuẩn xác**: Bấm nút xanh **`[✓ Phê duyệt]`**. Hồ sơ chính thức chuyển sang trạng thái đã duyệt (`APPROVED`) và đưa vào kho lưu trữ điện tử phục vụ khai thác.
  - **Trường hợp 2 - Hồ sơ bị mờ, thiếu trang hoặc gõ sai**: Bấm nút vàng **`[⚠️ Yêu cầu bổ sung]`**, một ô nhỏ hiện ra để bạn gõ lời dặn (Ví dụ: *"Trang 2 chụp bị mờ dấu mộc, hãy scan lại"*). Hồ sơ sẽ tự động chuyển về mục `Hồ sơ yêu cầu bổ sung` để văn thư cập nhật lại.
  - **Trường hợp 3 - Hồ sơ không đạt yêu cầu**: Bấm nút đỏ **`[✕ Từ chối]`**.
* **Bước 3 (Ký số điện tử - Nếu có)**:
  - Bấm Menu: `Kiểm duyệt văn bản đã tách` ➔ Bấm chọn **`Ký số văn bản`**.
  - Chọn văn bản PDF cần ký và bấm nút **`[Ký số điện tử]`**. Văn bản sẽ được đóng dấu thời gian (Timestamp) chống chỉnh sửa, làm giả.

---

### CÔNG VIỆC 4: TRA CỨU VÀ ĐĂNG KÝ MƯỢN HỒ SƠ
*(Dành cho Độc giả, Cán bộ các phòng ban cần tìm lại văn bản cũ)*

#### 4.1. Tìm kiếm văn bản
* **Bước 1**: Nhìn lên Menu trên cùng, bấm chọn **`Tra cứu & Mượn trả`** ➔ Bấm chọn **`Tìm kiếm hồ sơ`**.
* **Bước 2**: Gõ từ khóa vào ô tìm kiếm:
  - Có thể gõ Số hiệu văn bản (Ví dụ: `123/QĐ`), hoặc gõ từ khóa trong tiêu đề (Ví dụ: `nghiệm thu`, `đầu tư`, `khen thưởng`...).
  - Phần mềm hỗ trợ tìm kiếm không dấu nên bạn gõ có dấu hay không dấu đều tìm ra.
* **Bước 3**: Bấm Enter hoặc bấm nút Tìm kiếm:
  - Kết quả hiển thị tức thì. Phần mềm ghi rõ văn bản đó bản gốc đang nằm ở **Kho nào, Kệ nào, Hộp số mấy** để bạn có thể đến rút hồ sơ nhanh chóng.

#### 4.2. Đăng ký mượn hồ sơ
* **Bước 1**: Tại dòng hồ sơ tìm được, bấm nút **`[Đăng ký mượn]`**.
* **Bước 2**: Chọn hình thức mượn:
  - **Bản mềm (Trực tuyến)**: Để đọc trực tiếp tệp văn bản trên màn hình máy tính.
  - **Bản cứng**: Để đến phòng kho rút tập hồ sơ giấy gốc về phòng làm việc.
* **Bước 3**: Nhập Ngày mượn, Ngày hẹn trả và Mục đích mượn ➔ Bấm **`[Gửi yêu cầu mượn]`**.
* **Bước 4 (Dành cho Thủ kho)**:
  - Thủ kho vào mục **`Duyệt phiếu mượn`** ➔ Xem phiếu yêu cầu ➔ Bấm **`[Duyệt phiếu]`**. Người mượn sẽ lập tức có quyền đọc văn bản trên hệ thống.

---

### CÔNG VIỆC 5: XEM BÁO CÁO TIẾN ĐỘ & XUẤT FILE EXCEL / PDF
*(Dành cho Lãnh đạo và Chuyên viên tổng hợp số liệu)*

* **Xem Dashboard Lãnh đạo**:
  - Bấm Menu **`Báo cáo & Thống kê`** ➔ Bấm chọn **`Dashboard tổng quan`**.
  - Màn hình hiện các biểu đồ trực quan sinh động: Tổng số hồ sơ đã nhập, Tỷ lệ máy đã đọc chữ thành công (%), Số hồ sơ đã duyệt xong, Biểu đồ mượn trả theo từng tháng.
* **Xuất file báo cáo**:
  - Bấm Menu **`Báo cáo & Thống kê`** ➔ Bấm chọn **`Báo cáo số hóa & Xuất file`**.
  - Chọn khoảng thời gian cần làm báo cáo (Ví dụ từ ngày 01/01/2026 đến 31/12/2026).
  - Bấm nút **`[Xuất báo cáo Excel]`** hoặc **`[Xuất báo cáo PDF]`** để tải file về máy in ra giấy nộp cho cấp trên.

---

### CÔNG VIỆC 6: IN TEM MÃ VẠCH DÁN LÊN BÌA HỒ SƠ / HỘP LƯU TRỮ

* **Cách in**:
  - Tại bất kỳ màn hình nào (Quản lý kho, Danh mục hồ sơ, Bóc tách văn bản), bạn sẽ nhìn thấy nút có biểu tượng mã QR ghi chữ **`[In nhãn]`**.
  - Bấm vào nút này, một mẫu tem nhãn chuẩn mực sẽ hiện lên chứa đầy đủ: **Tên hồ sơ, Vị trí lưu trữ, Mã vạch Barcode và Mã QR Code**.
  - Bấm nút **`[In ngay]`** ra máy in tem dán lên bìa hồ sơ hoặc mặt ngoài hộp lưu trữ.
* **Tác dụng**: Lần sau khi cần tìm hồ sơ trong kho, cán bộ lưu trữ chỉ cần cầm máy quét mã vạch tít một cái vào gáy hộp là phần mềm tự động mở đúng văn bản đó ra màn hình!

---

## 📚 PHẦN 3: TỪ ĐIỂN THUẬT NGỮ DỄ HIỂU (BẢNG TRA CỨU NHANH)

Nếu nhìn thấy các từ viết tắt tiếng Anh trên màn hình, Anh/Chị tra cứu nhanh tại đây:

| Từ trên màn hình | Nghĩa tiếng Việt bình dân | Giải thích dễ hiểu |
|---|---|---|
| **`DRAFT`** | Bản nháp / Dự thảo | Hồ sơ mới tạo xong, chuyên viên đang thêm tệp hoặc kiểm tra |
| **`PENDING`** | Đang chờ duyệt | Chuyên viên đã kiểm tra xong và gửi lên cho sếp duyệt |
| **`APPROVED`** | Đã duyệt thành công | Sếp đã xem và đồng ý xuất bản lưu trữ chính thức |
| **`NEEDS_SUPPLEMENT`** | Cần sửa đổi / Bổ sung | Sếp trả lại bắt chụp lại ảnh hoặc bổ sung thêm giấy tờ |
| **`REJECTED`** | Bị từ chối | Hồ sơ không đạt yêu cầu lưu trữ |
| **`CONFIRMED`** | Đã đối soát xong | Đã kiểm tra các ô chữ Số hiệu, Ngày tháng chuẩn xác |
| **`AI OCR`** | Máy đọc chữ tự động | Công nghệ giúp máy tính tự đọc chữ trên ảnh văn bản |
| **`Zonal OCR`** | Khoanh vùng đọc chữ | Lấy chuột vẽ ô để đọc riêng một góc chữ nhỏ |

---

## ⭐ PHẦN 4: 4 NGUYÊN TẮC VÀNG ĐỂ SỬ DỤNG PHẦN MỀM THUẬN TIỆN NHẤT

1. **Chuẩn bị file scan đẹp**: Khi scan hoặc chụp ảnh, hãy đặt giấy thẳng thắn, chọn độ phân giải **`200 DPI` hoặc `300 DPI`**, lưu dạng file PDF hoặc JPG (vừa rõ nét chữ, vừa nhẹ máy).
2. **Khi máy đọc chữ quay lâu**: Hãy nhớ ngay 2 thao tác: Bấm nút đỏ **`[Hủy chờ OCR]`** và bấm đổi sang dòng **`Tesseract OCR`** để máy đọc ngay trong 1-2 giây.
3. **Chủ động sửa chữ**: Máy đọc chữ thông minh đến mấy cũng có thể đọc nhầm dấu mờ, Anh/Chị hoàn toàn có quyền dùng bàn phím gõ sửa lại vào các ô bên phải rồi bấm Lưu.
4. **Cần trợ giúp bất kỳ lúc nào**: Hãy bấm nút màu xanh lá **`[📖 Hướng dẫn sử dụng]`** ở góc trên cùng bên phải màn hình để mở sổ tay này ra xem lại!

---
*(Tài liệu bàn giao hướng dẫn sử dụng hệ thống IDP.DMS - Được chuẩn hóa bằng lời văn nghiệp vụ văn phòng thân thiện)*
