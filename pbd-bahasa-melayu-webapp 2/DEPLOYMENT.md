# Arahan Deployment

## 1. Bina Google Sheet

1. Buka [Google Sheets](https://sheets.google.com).
2. Cipta spreadsheet baru.
3. Namakan contoh: `Database PBD Bahasa Melayu`.
4. Salin Spreadsheet ID daripada URL.

Contoh URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Bahagian antara `/d/` dan `/edit` ialah `SPREADSHEET_ID`.

## 2. Bina Folder Google Drive untuk Evidens

1. Buka Google Drive.
2. Cipta folder baru, contoh: `Evidens PBD Bahasa Melayu`.
3. Buka folder tersebut.
4. Salin Folder ID daripada URL.

Contoh URL:

```text
https://drive.google.com/drive/folders/FOLDER_ID
```

Bahagian selepas `/folders/` ialah `FOLDER_ID`.

## 3. Buka Google Apps Script

1. Pergi ke [Google Apps Script](https://script.google.com).
2. Klik `New project`.
3. Namakan projek: `Sistem PBD Bahasa Melayu`.

## 4. Tampal Fail Kod

Dalam Apps Script:

1. Buat fail `Code.gs` dan tampal kandungan `Code.gs`.
2. Buat fail HTML `Index` dan tampal kandungan `Index.html`.
3. Buat fail HTML `Style` dan tampal kandungan `Style.html`.
4. Buat fail HTML `Script` dan tampal kandungan `Script.html`.
5. Jika mahu, tampal kandungan `appsscript.json` ke manifest project.

## 5. Masukkan Spreadsheet ID

Dalam `Code.gs`, cari:

```javascript
SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE'
```

Ganti dengan Spreadsheet ID sebenar.

## 6. Jalankan Setup

1. Dalam Apps Script, pilih fungsi `setupDatabase`.
2. Klik `Run`.
3. Beri authorization apabila diminta.
4. Semak Google Sheet. Sheet berikut patut wujud:
   - `Students`
   - `Assessments`
   - `Evidence`
   - `Settings`

Nota kemas kini: jika cikgu sudah pernah deploy versi lama, jalankan semula `setupDatabase()` selepas menampal kod baharu supaya kolum `ReadingScale`, `CommentScale3`, `CommentScale2`, `CommentScale1` dan `AutoConclusion` ditambah pada sheet `Assessments`.

## 7. Masukkan Folder ID

Dalam sheet `Settings`, cari baris:

```text
DriveFolderID
```

Masukkan Folder ID Google Drive pada lajur `Value`.

## 8. Deploy sebagai Web App

1. Klik `Deploy`.
2. Pilih `New deployment`.
3. Pilih jenis deployment `Web app`.
4. Tetapan dicadangkan:
   - Execute as: `Me`
   - Who has access: `Anyone with Google account` atau akses domain sekolah
5. Klik `Deploy`.
6. Salin Web App URL.

## 9. Uji Aplikasi

1. Buka Web App URL.
2. Klik `Murid`.
3. Tambah murid.
4. Buka `Profil Kemahiran Bahasa`.
5. Pilih murid.
6. Rekod kemahiran Bahasa Melayu.
7. Upload fail evidens.
8. Semak Google Sheets dan Google Drive.
9. Buka `Laporan` untuk melihat laporan individu dan kelas.

## 10. Mengehadkan Akses kepada Emel Tertentu

1. Dalam sheet `Settings`, tambah baris:

```text
AllowedEmails | guru1@sekolah.edu.my,guru2@sekolah.edu.my
```

2. Deploy semula jika perlu.
3. Pastikan Web App hanya boleh diakses pengguna yang login dengan akaun Google.

Nota: `Session.getActiveUser().getEmail()` mungkin kosong untuk akaun luar domain tertentu. Untuk kawalan ketat, deploy dalam Google Workspace domain sekolah/IPG.
