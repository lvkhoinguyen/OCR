# IDP.DMS

Solution gồm:

- `IDP.DMS.Api`: ASP.NET Core 8 Web API, mở bằng Visual Studio 2022.
- `IDP.DMS.Client`: ReactJS + Vite frontend dựng các màn hình theo UI design.

## Chạy API

```powershell
& "C:\Program Files\dotnet\dotnet.exe" run --project .\IDP.DMS.Api\IDP.DMS.Api.csproj
```

Swagger mặc định mở tại `/swagger`.

Endpoint chính:

- `GET /api/ui/summary`
- `GET /api/ui/menu`
- `GET /api/ui/features`
- `GET /api/ui/features/{id}`
- `GET /api/ui/features/{id}/screen`

## Oracle DB

Thông tin TNS được đọc từ file `cnn_ora.txt` ở thư mục dự án. Tài khoản đăng nhập đang dùng:

- User: `dummyerp`
- Password: `dummyerp`

Khởi tạo bảng:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:5103/api/dms/initialize" -Method POST
```

Bảng được tạo:

- `DMS_STORAGE_LOCATIONS`
- `DMS_DOSSIERS`
- `DMS_DOCUMENTS`
- `DMS_BORROW_REQUESTS`

CRUD API:

- `/api/dms/storage-locations`
- `/api/dms/dossiers`
- `/api/dms/documents`
- `/api/dms/borrow-requests`
- `GET /api/dms/resources`
- `/api/dms/resources/{resource}`

Các `resource` CRUD dùng chung:

- `menus`, `roles`, `permission-groups`, `report-groups`
- `org-units`, `users`, `user-groups`, `approval-configs`, `departments`
- `categories`, `private-categories`, `admin-units`
- `dossier-types`, `document-types`, `fonts`, `catalog-indexes`
- `import-jobs`, `storage-transfers`, `disposal-records`, `assignments`
- `publish-requests`, `invalid-records`, `approval-tickets`
- `transfer-tickets`, `recall-tickets`, `reports`, `ocr-jobs`

## Chạy React

Nếu `node`/`npm` chưa có trên PATH, dùng Node đi kèm Visual Studio:

```powershell
$env:PATH="C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Microsoft\VisualStudio\NodeJs;$env:PATH"
cd .\IDP.DMS.Client
npm install
npm run dev
```

Frontend chạy tại `http://127.0.0.1:5173` và proxy `/api` về API.

## Build kiểm tra

```powershell
& "C:\Program Files\dotnet\dotnet.exe" build .\IDP.DMS.Api\IDP.DMS.Api.csproj
cd .\IDP.DMS.Client
npm run build
```
