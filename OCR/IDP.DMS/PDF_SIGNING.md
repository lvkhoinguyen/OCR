# Ký số PDF trong IDP.DMS

## Luồng xử lý

`POST /api/dms/documents/{id}/sign-pdf` chỉ nhận tài liệu PDF đang ở trạng thái `APPROVED` và yêu cầu quyền `DMS.PUBLISH`.

Backend thực hiện tuần tự dưới khóa theo `documentId`:

1. Đọc tệp nguồn vật lý trong `IDP.DMS.Api/uploads`.
2. Ký CMS/SHA-256 lên PDF và tạo Visual Signature Box ở trang cuối.
3. Ghi tệp mới với tên `{documentId}_signed_{timestamp}.pdf` và tính SHA-256.
4. Trong một transaction Oracle: tạo `DMS_DOCUMENT_VERSIONS`, ghi `DMS_DIGITAL_SIGNATURES`, ghi workflow `SIGN`, cập nhật tài liệu thành `PUBLISHED`.
5. Nếu ký hoặc transaction lỗi, tệp tạm/tệp đầu ra mới bị xóa; bản PDF nguồn không bị thay đổi.

Để nâng cấp schema cũ, gọi endpoint quản trị `POST /api/dms/initialize` một lần sau khi triển khai. Lệnh này thêm các cột metadata ký số theo cách idempotent.

## Request

Endpoint nhận `multipart/form-data`:

```text
certType        DEVELOPMENT | PFX | WINDOWS_STORE | USB_TOKEN
signerName      Họ tên người ký
reason          Lý do ký
location        Địa điểm ký
pin             Mật khẩu PFX (không bắt buộc cho các loại khác)
imageSignature  Data URL PNG/JPEG, tối đa 2 MB (không bắt buộc)
positionX       Tọa độ trái theo %, mặc định 58
positionY       Tọa độ trên theo %, mặc định 76
width           Chiều rộng theo %, mặc định 36
height          Chiều cao theo %, mặc định 16
```

Ví dụ:

```bash
curl -X POST "https://localhost:7001/api/dms/documents/123/sign-pdf" \
  -H "Authorization: Bearer <access-token>" \
  -F "certType=PFX" \
  -F "signerName=Nguyễn Văn A" \
  -F "reason=Phê duyệt hồ sơ lưu trữ" \
  -F "location=Hà Nội" \
  -F "pin=<pfx-password>" \
  -F "positionX=58" -F "positionY=76" -F "width=36" -F "height=16"
```

Lịch sử chữ ký thật được đọc tại `GET /api/dms/documents/{id}/signatures`.

## Cấu hình chứng thư

Không commit mật khẩu hoặc tệp PFX vào repository. Cấu hình production bằng secret store/biến môi trường:

```text
PdfSignature__PfxPath=D:\certificates\dms-signer.pfx
PdfSignature__PfxPassword=<secret>
PdfSignature__CertificateThumbprint=<thumbprint>
PdfSignature__StoreLocation=CurrentUser
PdfSignature__TimestampServerUrl=https://tsa.example.vn
PdfSignature__AllowDevelopmentCertificate=false
```

- `PFX`: đọc chứng thư có private key từ đường dẫn cấu hình. PIN trong request được ưu tiên hơn mật khẩu cấu hình.
- `WINDOWS_STORE`: tìm chứng thư có private key theo thumbprint trong `StoreName.My`.
- `DEVELOPMENT`: tạo chứng thư tự ký tạm thời, chỉ chạy khi ASP.NET Core ở môi trường Development. Kết quả luôn được gắn `SIGNED_UNTRUSTED_CERTIFICATE`.
- `USB_TOKEN`: endpoint chủ động từ chối cho đến khi tích hợp adapter `IDigitalSigner`/SDK PKCS#11 của nhà cung cấp; hệ thống không tạo chữ ký giả.

Nếu có Timestamp Server URL, chữ ký yêu cầu RFC 3161 timestamp và `TIMESTAMP_AT` mới được ghi. OCSP/CRL hiện được lưu là `NOT_CHECKED`; trạng thái chuỗi tin cậy là `CHAIN_TRUSTED_NO_REVOCATION`, không được diễn giải thành kiểm tra thu hồi chứng thư.

## Phạm vi chuẩn

Triển khai hiện tại tạo chữ ký số PDF CMS có appearance trực quan và tùy chọn timestamp bằng PDFsharp 6.2. Đây là nền tảng ký PDF thực, nhưng chưa tuyên bố PAdES-LT/LTA: các mức đó cần thêm DSS, OCSP/CRL nhúng, timestamp dài hạn và bộ kiểm định tương thích của nhà cung cấp CA. Khi chọn nhà cung cấp USB Token/HSM/Remote Signing, triển khai adapter ký và kiểm định theo profile PAdES mà đơn vị áp dụng.

## Frontend GD29

Màn hình `GD29PdfSignatureScreen`:

- tải PDF qua API có JWT để preview;
- kéo vùng con dấu theo tỷ lệ trên trang cuối;
- tải PNG/JPEG hoặc vẽ chữ ký trực tiếp trên canvas;
- không lưu PIN vào LocalStorage;
- phân biệt chứng thư có chuỗi tin cậy với chứng thư Development/chưa tin cậy.
