# Sistem Pentaksiran Bilik Darjah Bahasa Melayu

## 1. Seni Bina Sistem

Sistem ini dibina sebagai Google Apps Script Web App.

Komponen utama:

- `Index.html`: rangka halaman web dan modul aplikasi.
- `Style.html`: gaya visual responsif untuk laptop, tablet dan telefon.
- `Script.html`: logik antaramuka, paparan dashboard, CRUD murid, profil kemahiran bahasa, upload evidens dan laporan.
- `Code.gs`: backend Google Apps Script untuk Google Sheets dan Google Drive.
- Google Sheets: pangkalan data.
- Google Drive: storan evidens/lampiran.

Aliran peranan:

- Guru membuka Web App melalui pautan.
- Antaramuka memanggil fungsi backend melalui `google.script.run`.
- Backend membaca/menulis data ke Google Sheets.
- Fail evidens dihantar sebagai base64 ke backend, ditukar menjadi Blob, kemudian disimpan ke folder Google Drive.
- Pautan Drive direkodkan dalam helaian `Evidence` dan `Assessments`.

## 2. Aliran Data

### Tambah murid

1. Guru isi borang murid.
2. Frontend menghantar data ke `createStudent(payload)`.
3. Backend menjana `StudentID`.
4. Backend menulis rekod ke sheet `Students`.
5. Frontend memuat semula senarai murid dan dashboard.

### Rekod pecahan kemahiran membaca

1. Guru pilih murid.
2. Guru pilih pecahan kemahiran membaca K1 hingga K35 berdasarkan senarai semak Excel.
3. Guru tetapkan status dan TP.
4. Guru boleh memilih skala bacaan 1 hingga 3.
5. Guru boleh mengisi komen manual bagi Skala 3/Tahap Tinggi, Skala 2/Tahap Sederhana dan Skala 1/Tahap Rendah.
6. Frontend menjana `AutoConclusion` berdasarkan komen tersebut.
7. Frontend menghantar ke `saveAssessment(payload)`.
8. Backend menulis atau mengemas kini sheet `Assessments`.
9. Profil Kemahiran Bahasa memaparkan semua pecahan membaca sebagai visual kuasa dan menunjukkan kesimpulan automatik murid.

### Upload evidens

1. Guru pilih fail evidens.
2. Frontend membaca fail sebagai base64.
3. Frontend memanggil `uploadEvidence(payload)`.
4. Backend mendapatkan `DriveFolderID` daripada sheet `Settings`.
5. Backend menyimpan fail ke folder Drive.
6. Backend menulis pautan fail ke sheet `Evidence`.
7. Backend mengemas kini `EvidenceURL` dalam rekod assessment berkaitan.

## 3. Struktur Fail

```text
pbd-bahasa-melayu-webapp/
  Code.gs
  Index.html
  Style.html
  Script.html
  appsscript.json
  ARCHITECTURE.md
  DEPLOYMENT.md
```

## 4. Struktur Google Sheets

### Students

| StudentID | Name | MyKid | Class | Gender | TeacherName | CreatedAt | UpdatedAt |
|---|---|---|---|---|---|---|---|

### Assessments

| AssessmentID | StudentID | Skill | Status | TPLevel | ReadingScale | CommentScale3 | CommentScale2 | CommentScale1 | AutoConclusion | TeacherNote | EvidenceURL | AssessmentDate | UpdatedAt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

### Evidence

| EvidenceID | StudentID | AssessmentID | FileName | FileType | DriveURL | UploadedAt |
|---|---|---|---|---|---|---|

### Settings

| Key | Value |
|---|---|
| DriveFolderID | folder-id-google-drive |
| SchoolName | Nama sekolah |
| SystemName | Sistem Pentaksiran Bilik Darjah Bahasa Melayu |

## 5. Cara Data Disimpan

Backend menggunakan `SpreadsheetApp.openById(SPREADSHEET_ID)`.

- Jika sheet belum wujud, `setupDatabase()` akan mencipta sheet dan header.
- Setiap operasi tulis menggunakan `LockService` untuk mengurangkan risiko pertindihan data.
- Semua ID dijana menggunakan `Utilities.getUuid()`.
- Tarikh disimpan dalam format ISO supaya mudah dibaca dan ditapis.

## 6. Cara Evidens Disimpan

Backend menggunakan `DriveApp.getFolderById(DriveFolderID)`.

- Fail diterima sebagai base64 daripada browser.
- Apps Script menukar base64 kepada `Blob`.
- Fail disimpan ke folder Drive.
- URL fail disimpan dalam sheet `Evidence`.
- Assessment berkaitan dikemas kini dengan `EvidenceURL`.

## 7. Akses dan Keselamatan

Sistem tidak menyimpan kata laluan dalam kod.

Cadangan akses:

- Deploy Web App sebagai `Execute as: Me`.
- Tetapkan `Who has access` kepada `Anyone with Google account` atau domain sekolah/IPG jika tersedia.
- Untuk mengehadkan kepada akaun tertentu, tambah senarai emel dibenarkan dalam `Settings` dengan key `AllowedEmails`, contohnya:

```text
guru1@sekolah.edu.my,guru2@sekolah.edu.my
```

Backend menyediakan fungsi `assertAuthorized_()` yang boleh diaktifkan dengan setting tersebut.
