# Xác thực và phân quyền IDP.DMS

## Tạm thời bỏ qua đăng nhập khi phát triển

Chế độ bypass hiện được bật trong `IDP.DMS.Api/appsettings.Development.json`:

```json
"AuthenticationBypass": {
  "Enabled": true,
  "DevelopmentOnly": true
}
```

Khi API chạy với môi trường `Development`, frontend gọi `GET /api/auth/configuration`, tự vào thẳng ứng dụng và hiển thị tài khoản `dev-admin` với vai trò `SYSTEM_ADMIN`. Backend đồng thời tạo principal tạm có permission `*`, vì vậy các API được bảo vệ vẫn đi qua đúng authorization pipeline.

Để bật lại màn hình đăng nhập, đặt `Enabled` thành `false` rồi khởi động lại API. `DevelopmentOnly: true` bảo đảm cấu hình này không có hiệu lực trong `Production`; không tắt hàng rào này trên môi trường thật.

## Khởi tạo tài khoản đầu tiên

Các bảng xác thực được tạo tự động khi gọi `register` lần đầu. Tài khoản xác thực đầu tiên được gán vai trò `SYSTEM_ADMIN`; những lần đăng ký công khai tiếp theo mặc định là `DATA_ENTRY`.

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123",
  "fullName": "Quản trị hệ thống",
  "email": "admin@example.local"
}
```

Không dùng mật khẩu ví dụ trên trong môi trường thật.

## API

| Endpoint | Xác thực | Mục đích |
|---|---:|---|
| `GET /api/auth/configuration` | Không | Cho frontend biết chế độ bypass phát triển có đang bật hay không |
| `POST /api/auth/register` | Không bắt buộc | Tạo tài khoản; chỉ quản trị viên đang đăng nhập mới được chỉ định `roleCode` |
| `POST /api/auth/login` | Không | Cấp access token 8 giờ và refresh token 30 ngày |
| `POST /api/auth/refresh` | Không | Xoay vòng refresh token và cấp access token mới |
| `GET /api/auth/me` | Bearer | Lấy người dùng hiện tại |
| `POST /api/auth/change-password` | Bearer | Đổi mật khẩu và thu hồi refresh token |
| `POST /api/auth/logout` | Bearer | Thu hồi refresh token |

## Vai trò mặc định

| Vai trò | Quyền |
|---|---|
| `SYSTEM_ADMIN` | `*` |
| `MANAGER` | Đọc, ghi, OCR, gửi duyệt, kiểm duyệt, phê duyệt, xuất bản |
| `REVIEWER` | Đọc, kiểm duyệt, phê duyệt, xuất bản |
| `DATA_ENTRY` | Đọc, ghi, OCR, gửi duyệt |
| `VIEWER` | Chỉ đọc |

Mọi endpoint `/api/dms/*` và `/api/dms/gd2/*` yêu cầu JWT Bearer. Yêu cầu ghi dữ liệu còn được kiểm tra permission tương ứng trong token.

## Cấu hình production

Không sử dụng signing key mẫu trong `appsettings.json`. Thiết lập biến môi trường tối thiểu 32 ký tự:

```powershell
$env:Jwt__SigningKey = "<khóa-bí-mật-dài-và-ngẫu-nhiên>"
```

Frontend lưu access token, refresh token và thông tin hiển thị trong `localStorage`. Lớp request tự gắn Bearer token, thử refresh một lần và đưa người dùng về màn hình đăng nhập nếu máy chủ tiếp tục trả `401`.
