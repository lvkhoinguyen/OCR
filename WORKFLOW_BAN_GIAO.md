# Workflow OCR va Kiem Duyet Ho So

Tai lieu nay mo ta luong lam viec hien tai cua he thong IDP.DMS khi ban giao/demo cho khach hang.

## 1. Tong Quan Luong Nghiep Vu

```text
Khoi tao du lieu nen
  -> Tao kho ho so
  -> Tao ho so luu tru
  -> Tao tai lieu thuoc ho so
  -> Chay OCR de boc tach noi dung
  -> Kiem tra ket qua OCR
  -> Gui ho so sang kiem duyet
  -> Nguoi duyet xu ly ho so
  -> Xem bao cao / thong ke
```

## 2. Chuan Bi He Thong

Nguoi quan tri ky thuat can chay backend va frontend truoc khi demo.

### Chay backend API

Tai thu muc:

```powershell
D:\Hacom\OCR\OCR\IDP.DMS
```

Chay lenh:

```powershell
dotnet run --project .\IDP.DMS.Api\IDP.DMS.Api.csproj
```

API mac dinh chay tai:

```text
http://localhost:5103
```

Swagger:

```text
http://localhost:5103/swagger
```

### Chay frontend

Tai thu muc:

```powershell
D:\Hacom\OCR\OCR\IDP.DMS\IDP.DMS.Client
```

Chay lenh:

```powershell
npm.cmd run dev
```

Giao dien web:

```text
http://127.0.0.1:5173
```

### Khoi tao database lan dau

Neu database chua co bang, goi API:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:5103/api/dms/initialize" -Method POST
```

### Ket noi Oracle de kiem tra du lieu

Dung Oracle SQL Developer hoac DBeaver:

```text
Username: dummyerp
Password: dummyerp
Hostname: 192.168.2.11
Port: 1521
Service name: sidhacom
```

Cac bang can xem khi kiem tra demo:

```text
DMS_STORAGE_LOCATIONS   Kho / ke / tang / hop
DMS_DOSSIERS            Ho so luu tru
DMS_DOCUMENTS           Tai lieu va ket qua OCR
DMS_WORKFLOW_EVENTS     Lich su xu ly workflow
DMS_NOTIFICATIONS       Thong bao workflow
DMS_DOCUMENT_VERSIONS   Phien ban tai lieu
```

Luu y quan trong:

```text
API /api/dms/... ghi vao Oracle database.
API /api/dms/gd2/... co mot so phan la RAM demo trong Gd2BusinessService.
Khi can ban giao that, uu tien thao tac qua man hinh/API dung /api/dms/... de du lieu vao Oracle.
```

## 3. Buoc 1 - Tao Kho Ho So

Vao menu:

```text
Danh muc -> Danh muc kho ho so
```

Thao tac:

```text
1. Bam Them moi
2. Nhap ma kho
3. Nhap ten kho
4. Chon loai: KHO
5. Chon trang thai: ACTIVE
6. Bam Luu
```

Vi du:

```text
Ma kho: KHO-001
Ten kho: Kho chinh
Loai: KHO
Trang thai: ACTIVE
Suc chua: 1000
```

Sau khi luu, kho se duoc luu vao database va co the chon o cac man tao ho so.

Du lieu duoc luu vao bang:

```text
DMS_STORAGE_LOCATIONS
```

## 4. Buoc 2 - Tao Ho So Luu Tru

Vao mot trong cac man:

```text
GD2-1 Quan ly tai lieu
```

hoac:

```text
Nhap lieu -> Nhap moi ho so
```

Thao tac:

```text
1. Nhap ma ho so
2. Nhap ten ho so
3. Chon kho ho so tu dropdown
4. Chon loai ho so
5. De trang thai: DRAFT
6. Bam Luu
```

Vi du:

```text
Ma ho so: HS-001
Ten ho so: Ho so test OCR
Kho ho so: KHO-001 - Kho chinh
Loai ho so: Hanh chinh
Trang thai: DRAFT
Mo ta: Ho so dung de demo OCR va kiem duyet
```

Luu y:

```text
Ho so moi tao nen de trang thai DRAFT.
DRAFT la trang thai cho phep gui kiem duyet tu GD2-6.
```

Du lieu duoc luu vao bang:

```text
DMS_DOSSIERS
```

Cot can chu y:

```text
ID          ID ho so, he thong tu sinh
CODE        Ma ho so
TITLE       Ten ho so
STORAGE_ID  ID kho ho so, lien ket sang DMS_STORAGE_LOCATIONS.ID
STATUS      Trang thai workflow cua ho so
```

## 5. Buoc 3 - Tao Tai Lieu Thuoc Ho So

Vao phan:

```text
Tai lieu/OCR
```

Thao tac:

```text
1. Bam Them moi
2. Chon ho so tu dropdown
3. Nhap ma tai lieu
4. Nhap ten tai lieu
5. De OCR: PENDING
6. De trang thai: DRAFT
7. Bam Luu
```

Vi du:

```text
Ho so: HS-001 - Ho so test OCR
Ma tai lieu: VB-001
Ten tai lieu: Van ban test boc tach
OCR: PENDING
Trang thai: DRAFT
```

Luu y:

```text
OCR PENDING nghia la tai lieu moi tao, chua chay OCR.
Day la trang thai binh thuong truoc khi sang GD2-6.
```

Du lieu duoc luu vao bang:

```text
DMS_DOCUMENTS
```

Cot can chu y:

```text
ID           ID tai lieu, he thong tu sinh
DOSSIER_ID   ID ho so, lien ket sang DMS_DOSSIERS.ID
CODE         Ma tai lieu
TITLE        Ten tai lieu
FILE_NAME    Ten file da upload/OCR
OCR_STATUS   PENDING / PROCESSING / DONE / ERROR
STATUS       Trang thai tai lieu
DESCRIPTION  Noi dung OCR hoac mo ta tai lieu
```

## 6. Buoc 4 - Chay OCR

Vao menu:

```text
GD2-6 OCR AI tich hop
```

Thao tac:

```text
1. Chon tai lieu trong Danh sach van ban ben trai
2. Chon engine OCR
3. Bam Chon file va chay OCR
4. Chon file anh hoac PDF
5. Cho he thong xu ly
6. Xem ket qua tai o Ket qua OCR AI
```

Ket qua OCR se hien thi tren giao dien de khach xem truc tiep.

Luu y quan trong:

```text
Luot OCR demo hien tai chi hien thi ket qua tren giao dien.
Khong bat buoc luu vao database.
Neu can luu that, bam Luu OCR vao DB.
```

Khi bam Luu OCR vao DB, he thong cap nhat:

```text
Bang: DMS_DOCUMENTS
Cot: FILE_NAME, OCR_STATUS, DESCRIPTION, UPDATED_AT
```

Sau khi luu, co the kiem tra bang SQL:

```sql
SELECT ID, DOSSIER_ID, CODE, TITLE, FILE_NAME, OCR_STATUS, DESCRIPTION
FROM DMS_DOCUMENTS
ORDER BY ID DESC;
```

Neu dung Gemini va gap timeout, co the xu ly bang cach:

```text
Dung file nho hon
Dung anh ro chu hon
Crop dung vung co chu
Doi sang engine EasyOCR hoac VietOCR
Tang timeout backend neu can
```

## 7. Buoc 5 - Gui Kiem Duyet

Sau khi co ket qua OCR tren man hinh, bam:

```text
Gui kiem duyet
```

Dieu kien gui:

```text
Tai lieu da gan voi ho so
Ho so dang o trang thai DRAFT, PENDING hoac NEEDS_SUPPLEMENT
```

Ket qua:

```text
DRAFT -> PENDING
PENDING -> PENDING
NEEDS_SUPPLEMENT -> PENDING
```

Neu ho so da la PENDING:

```text
Ho so da nam trong hang cho kiem duyet.
He thong coi nhu gui kiem duyet thanh cong va cho nguoi duyet xu ly o GD2-2.
```

Du lieu can kiem tra trong database:

```text
Bang: DMS_DOSSIERS
Cot: STATUS = PENDING
```

SQL kiem tra:

```sql
SELECT ID, CODE, TITLE, STATUS, UPDATED_AT
FROM DMS_DOSSIERS
ORDER BY ID DESC;
```

Neu workflow duoc goi qua endpoint workflow that, he thong se ghi them:

```text
Bang: DMS_WORKFLOW_EVENTS
Bang: DMS_NOTIFICATIONS
```

SQL kiem tra:

```sql
SELECT *
FROM DMS_WORKFLOW_EVENTS
ORDER BY CREATED_AT DESC;

SELECT *
FROM DMS_NOTIFICATIONS
ORDER BY CREATED_AT DESC;
```

## 8. Buoc 6 - Nguoi Duyet Xu Ly Ho So

Vao menu:

```text
GD2-2 Quan ly quy trinh
```

Nguoi duyet chon ho so trong danh sach va thuc hien mot trong cac hanh dong:

```text
Phe duyet
Yeu cau bo sung
Tu choi
```

Luong trang thai:

```text
PENDING -> APPROVED
PENDING -> NEEDS_SUPPLEMENT
PENDING -> REJECTED
```

Neu yeu cau bo sung:

```text
NEEDS_SUPPLEMENT -> chinh sua/bo sung -> gui kiem duyet lai -> PENDING
```

Du lieu duoc cap nhat trong database:

```text
DMS_DOSSIERS.STATUS
DMS_WORKFLOW_EVENTS
DMS_NOTIFICATIONS
```

## 9. Buoc 7 - Bao Cao Va Thong Ke

Vao menu:

```text
GD2-10 Bao cao va phan tich
```

Co the xem:

```text
Tong so ho so
Tong so tai lieu
Tai lieu da OCR
Ho so da duyet
Phieu muon
Ty le hoan tat OCR
```

Bao cao lay so lieu chinh tu cac bang:

```text
DMS_DOSSIERS
DMS_DOCUMENTS
DMS_BORROW_REQUESTS
DMS_WORKFLOW_EVENTS
```

## 10. So Do Trang Thai Ho So

Luong chinh:

```text
DRAFT
  -> Gui kiem duyet
PENDING
  -> Phe duyet
APPROVED
  -> Ky so / xuat ban
PUBLISHED
  -> Xac nhan
CONFIRMED
```

Luong bo sung:

```text
PENDING
  -> Yeu cau bo sung
NEEDS_SUPPLEMENT
  -> Gui lai
PENDING
```

Luong tu choi:

```text
PENDING
  -> Tu choi
REJECTED
```

## 11. Luong Demo Ngan Cho Khach

```text
1. Vao Danh muc -> Danh muc kho ho so
2. Tao kho KHO-001 - Kho chinh
3. Vao GD2-1 Quan ly tai lieu
4. Tao ho so HS-001, chon kho KHO-001
5. Tao tai lieu VB-001 thuoc ho so HS-001
6. Vao GD2-6 OCR AI tich hop
7. Chon tai lieu VB-001
8. Bam Chon file va chay OCR
9. Chon anh/PDF
10. Xem ket qua OCR hien tren man hinh
11. Bam Gui kiem duyet
12. Vao GD2-2 Quan ly quy trinh de duyet ho so
13. Vao GD2-10 Bao cao va phan tich de xem thong ke
```

## 12. Luong Kiem Tra Database Sau Demo

Sau khi demo xong, vao Oracle SQL Developer va chay:

```sql
SELECT *
FROM DMS_STORAGE_LOCATIONS
ORDER BY ID DESC;

SELECT *
FROM DMS_DOSSIERS
ORDER BY ID DESC;

SELECT *
FROM DMS_DOCUMENTS
ORDER BY ID DESC;

SELECT *
FROM DMS_WORKFLOW_EVENTS
ORDER BY CREATED_AT DESC;

SELECT *
FROM DMS_NOTIFICATIONS
ORDER BY CREATED_AT DESC;
```

Can doi chieu:

```text
Kho vua tao phai co trong DMS_STORAGE_LOCATIONS.
Ho so vua tao phai co trong DMS_DOSSIERS.
Tai lieu vua tao phai co trong DMS_DOCUMENTS.
Noi dung OCR sau khi bam Luu OCR vao DB phai nam trong DMS_DOCUMENTS.DESCRIPTION.
Sau khi gui kiem duyet, DMS_DOSSIERS.STATUS phai la PENDING.
Sau khi nguoi duyet xu ly, DMS_DOSSIERS.STATUS doi sang APPROVED / NEEDS_SUPPLEMENT / REJECTED.
```

## 13. Ghi Chu Khi Ban Giao

```text
Khach khong can nhap ID kho hoac ID ho so bang tay.
Kho va ho so da tao se hien trong dropdown de chon.
OCR PENDING la trang thai binh thuong cua tai lieu moi tao.
GD2-6 co the OCR preview chi de hien thi ket qua, khong can luu DB.
Ho so PENDING nghia la da gui kiem duyet va dang cho nguoi duyet xu ly.
Neu khach muon xem database, chi can mo Oracle SQL Developer va truy van cac bang DMS_*.
Khong nen insert/update truc tiep vao database khi demo, nen thao tac qua giao dien de tranh sai lien ket ID.
```
