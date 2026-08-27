# Trình xem CAD/BIM 3D

## Định dạng hỗ trợ

| Định dạng | Bộ đọc | Cây cấu trúc |
| --- | --- | --- |
| IFC | `web-ifc` WASM | Cây không gian IFC Project/Site/Building/Storey và các phần tử |
| STL | `STLLoader` của Three.js | Mesh trong mô hình |
| OBJ | `OBJLoader` của Three.js | Group/Object/Mesh theo nội dung OBJ |
| STEP/STP | `occt-import-js` OpenCascade WASM | Assembly/Part/Mesh từ tệp STEP |

Viewer được lazy-load khi tài liệu có đuôi `.ifc`, `.stl`, `.obj`, `.step` hoặc `.stp`; người dùng PDF/ảnh không phải tải Three.js hay WASM. Các file WASM được Vite đóng gói thành asset có hash và tự phục vụ cùng frontend.

## Sử dụng

Trong **GĐ2-1 Quản lý tài liệu**, tải tệp mô hình lên như tài liệu thông thường rồi chọn tài liệu trong bảng. Khung chi tiết tự chuyển sang Canvas WebGL.

- Chuột trái: xoay mô hình.
- Con lăn hoặc nút `+/-`: phóng to, thu nhỏ.
- Chuột phải: pan.
- `Vừa khung`: đưa toàn bộ mô hình vào camera.
- `Khung dây`: bật/tắt wireframe cho toàn bộ mesh.
- Chọn node trong cây để làm nổi bật thành phần tương ứng.

Mô hình được lưu nguyên bản trong `uploads/`, có `OCR_STATUS = NOT_APPLICABLE` và không đi qua pipeline tạo PDF OCR. Endpoint file hiện có là `GET /api/dms/documents/{id}/file` trả MIME tương ứng.

## Giới hạn và triển khai

- Mô hình CAD/BIM tối đa 200 MB; file văn bản vẫn dùng hạn mức theo đơn vị.
- OBJ hiện đọc geometry/material khai báo trực tiếp trong OBJ; chưa nạp gói texture/MTL rời vì một tài liệu hiện chỉ lưu một tệp vật lý.
- IFC và STEP lớn được parse tại trình duyệt và có thể cần nhiều RAM. Nên chuyển đổi trước sang định dạng tối ưu/fragment nếu vận hành mô hình hàng trăm MB thường xuyên.
- Reverse proxy phải cho phép request trên 210 MB.
- Máy chủ phục vụ frontend cần trả file `.wasm` với MIME `application/wasm`; Vite preview/static hosting thông thường đã xử lý MIME này.
