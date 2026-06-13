/**
 * Sistem Pentaksiran Bilik Darjah Bahasa Melayu
 * Backend Google Apps Script
 *
 * Cara guna:
 * 1. Ganti CONFIG.SPREADSHEET_ID dengan Spreadsheet ID sebenar.
 * 2. Jalankan setupDatabase().
 * 3. Masukkan DriveFolderID dalam sheet Settings.
 * 4. Deploy sebagai Web App.
 */

const CONFIG = {
  SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',
  TIME_ZONE: 'Asia/Kuala_Lumpur',
  APP_TITLE: 'Sistem Pentaksiran Bilik Darjah Bahasa Melayu'
};

const SHEETS = {
  STUDENTS: 'Students',
  ASSESSMENTS: 'Assessments',
  EVIDENCE: 'Evidence',
  SETTINGS: 'Settings'
};

const HEADERS = {
  Students: ['StudentID', 'Name', 'MyKid', 'Class', 'Gender', 'TeacherName', 'CreatedAt', 'UpdatedAt'],
  Assessments: ['AssessmentID', 'StudentID', 'Skill', 'Status', 'TPLevel', 'ReadingScale', 'CommentScale3', 'CommentScale2', 'CommentScale1', 'AutoConclusion', 'TeacherNote', 'EvidenceURL', 'AssessmentDate', 'UpdatedAt'],
  Evidence: ['EvidenceID', 'StudentID', 'AssessmentID', 'FileName', 'FileType', 'DriveURL', 'UploadedAt'],
  Settings: ['Key', 'Value']
};

const LANGUAGE_SKILLS = [
  'Huruf Kecil',
  'Huruf Besar',
  'Huruf Vokal',
  'Suku Kata KV',
  'Perkataan KV+KV',
  'Suku Kata V+KV',
  'Perkataan KV+KV+KV',
  'Perkataan KVK',
  'Suku Kata KVK',
  'Perkataan V+KVK',
  'Perkataan KV+KVK',
  'Perkataan KVK+KV',
  'Perkataan KVK+KVK',
  'Perkataan KV+KV+KVK',
  'Perkataan KVK+KV+KVK',
  'Perkataan KVKK',
  'Suku Kata KVKK',
  'Perkataan KV+KVKK',
  'Perkataan V+KVKK',
  'Perkataan KVK+KVKK',
  'Perkataan KVKK+KV',
  'Perkataan KVKK+KVK',
  'Perkataan KVKK+KVKK',
  'Perkataan KV+KV+KVKK',
  'Perkataan KV+KVK+KVKK',
  'Perkataan KVK+KV+KVKK',
  'Perkataan KVKK+KV+KVK',
  'Perkataan KV+KVKK+KVK',
  'Perkataan Diftong & Vokal Berganding',
  'Perkataan Huruf Konsonan Bergabung (Digraf)',
  'Membaca frasa berdasarkan gambar',
  'Bacaan ayat berdasarkan gambar',
  'Bacaan ayat mudah',
  'Bacaan ayat dengan gambar bersiri',
  'Bacaan ayat dalam perenggan'
];
const STATUS_OPTIONS = ['Belum Menguasai', 'Sedang Menguasai', 'Telah Menguasai'];
const TP_LEVELS = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6'];

const STATUS_SCORE = {
  'Belum Menguasai': 0,
  'Sedang Menguasai': 1,
  'Telah Menguasai': 2
};

function doGet() {
  assertAuthorized_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.appTitle = CONFIG.APP_TITLE;
  return template
    .evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PBD Bahasa Melayu')
    .addItem('Setup Database', 'setupDatabase')
    .addItem('Buka Web App Preview', 'showSidebarPreview')
    .addToUi();
}

function showSidebarPreview() {
  const html = HtmlService.createHtmlOutput('<p>Buka deployment Web App untuk menggunakan sistem penuh.</p>')
    .setTitle('PBD Bahasa Melayu');
  SpreadsheetApp.getUi().showSidebar(html);
}

function setupDatabase() {
  const ss = getSpreadsheet_();
  Object.keys(HEADERS).forEach(sheetName => {
    const sheet = getOrCreateSheet_(ss, sheetName);
    ensureHeader_(sheet, HEADERS[sheetName]);
  });

  seedDefaultSettings_();
  return {
    ok: true,
    message: 'Database Google Sheets sudah disediakan.',
    spreadsheetUrl: ss.getUrl(),
    sheets: Object.keys(HEADERS)
  };
}

function getInitialData() {
  assertAuthorized_();
  setupDatabase();
  const students = getStudents({});
  const assessments = getAssessments({});
  const evidence = getEvidence({});
  return {
    appTitle: CONFIG.APP_TITLE,
    skills: LANGUAGE_SKILLS,
    statuses: STATUS_OPTIONS,
    tpLevels: TP_LEVELS,
    settings: getSettings(),
    students: students,
    assessments: assessments,
    evidence: evidence,
    dashboard: buildDashboard_(students, assessments)
  };
}

function getSettings() {
  assertAuthorized_();
  return readRows_(SHEETS.SETTINGS).reduce((acc, row) => {
    if (row.Key) acc[row.Key] = row.Value || '';
    return acc;
  }, {});
}

function saveSetting(key, value) {
  assertAuthorized_();
  if (!key) throw new Error('Key setting diperlukan.');
  setupDatabase();
  const sheet = getSheet_(SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(value || '');
      return getSettings();
    }
  }
  sheet.appendRow([key, value || '']);
  return getSettings();
}

function getStudents(filters) {
  assertAuthorized_();
  setupDatabase();
  const safeFilters = filters || {};
  let rows = readRows_(SHEETS.STUDENTS);

  if (safeFilters.className) {
    rows = rows.filter(row => String(row.Class || '') === String(safeFilters.className));
  }

  if (safeFilters.search) {
    const q = String(safeFilters.search).toLowerCase();
    rows = rows.filter(row =>
      String(row.Name || '').toLowerCase().includes(q) ||
      String(row.MyKid || '').toLowerCase().includes(q) ||
      String(row.Class || '').toLowerCase().includes(q)
    );
  }

  return rows.sort((a, b) => String(a.Name || '').localeCompare(String(b.Name || '')));
}

function createStudent(payload) {
  assertAuthorized_();
  const data = normalizeStudent_(payload);
  validateStudent_(data);

  const now = nowIso_();
  const row = {
    StudentID: makeId_('STU'),
    Name: data.Name,
    MyKid: data.MyKid,
    Class: data.Class,
    Gender: data.Gender,
    TeacherName: data.TeacherName,
    CreatedAt: now,
    UpdatedAt: now
  };

  withLock_(() => appendObject_(SHEETS.STUDENTS, row));
  return row;
}

function updateStudent(payload) {
  assertAuthorized_();
  const data = normalizeStudent_(payload);
  if (!data.StudentID) throw new Error('StudentID diperlukan untuk kemas kini.');
  validateStudent_(data);

  const existing = findRowById_(SHEETS.STUDENTS, 'StudentID', data.StudentID);
  if (!existing) throw new Error('Murid tidak ditemui.');

  const row = Object.assign({}, existing.object, {
    Name: data.Name,
    MyKid: data.MyKid,
    Class: data.Class,
    Gender: data.Gender,
    TeacherName: data.TeacherName,
    UpdatedAt: nowIso_()
  });

  withLock_(() => updateObjectById_(SHEETS.STUDENTS, 'StudentID', data.StudentID, row));
  return row;
}

function deleteStudent(studentId) {
  assertAuthorized_();
  if (!studentId) throw new Error('StudentID diperlukan.');

  withLock_(() => {
    deleteRowsByValue_(SHEETS.STUDENTS, 'StudentID', studentId);
    deleteRowsByValue_(SHEETS.ASSESSMENTS, 'StudentID', studentId);
    deleteRowsByValue_(SHEETS.EVIDENCE, 'StudentID', studentId);
  });

  return { ok: true, deletedStudentID: studentId };
}

function getAssessments(filters) {
  assertAuthorized_();
  setupDatabase();
  const safeFilters = filters || {};
  let rows = readRows_(SHEETS.ASSESSMENTS);

  if (safeFilters.studentId) {
    rows = rows.filter(row => String(row.StudentID || '') === String(safeFilters.studentId));
  }

  if (safeFilters.skill) {
    rows = rows.filter(row => String(row.Skill || '') === String(safeFilters.skill));
  }

  if (safeFilters.status) {
    rows = rows.filter(row => String(row.Status || '') === String(safeFilters.status));
  }

  return rows.sort((a, b) => String(b.AssessmentDate || b.UpdatedAt || '').localeCompare(String(a.AssessmentDate || a.UpdatedAt || '')));
}

function saveAssessment(payload) {
  assertAuthorized_();
  const data = normalizeAssessment_(payload);
  validateAssessment_(data);

  const now = nowIso_();
  let row;

  if (data.AssessmentID) {
    const existing = findRowById_(SHEETS.ASSESSMENTS, 'AssessmentID', data.AssessmentID);
    if (!existing) throw new Error('Assessment tidak ditemui.');
    row = Object.assign({}, existing.object, {
      StudentID: data.StudentID,
      Skill: data.Skill,
      Status: data.Status,
      TPLevel: data.TPLevel,
      ReadingScale: data.ReadingScale,
      CommentScale3: data.CommentScale3,
      CommentScale2: data.CommentScale2,
      CommentScale1: data.CommentScale1,
      AutoConclusion: data.AutoConclusion,
      TeacherNote: data.TeacherNote,
      EvidenceURL: data.EvidenceURL || existing.object.EvidenceURL || '',
      AssessmentDate: data.AssessmentDate,
      UpdatedAt: now
    });
    withLock_(() => updateObjectById_(SHEETS.ASSESSMENTS, 'AssessmentID', data.AssessmentID, row));
  } else {
    row = {
      AssessmentID: makeId_('ASM'),
      StudentID: data.StudentID,
      Skill: data.Skill,
      Status: data.Status,
      TPLevel: data.TPLevel,
      ReadingScale: data.ReadingScale,
      CommentScale3: data.CommentScale3,
      CommentScale2: data.CommentScale2,
      CommentScale1: data.CommentScale1,
      AutoConclusion: data.AutoConclusion,
      TeacherNote: data.TeacherNote,
      EvidenceURL: data.EvidenceURL || '',
      AssessmentDate: data.AssessmentDate,
      UpdatedAt: now
    };
    withLock_(() => appendObject_(SHEETS.ASSESSMENTS, row));
  }

  return row;
}

function deleteAssessment(assessmentId) {
  assertAuthorized_();
  if (!assessmentId) throw new Error('AssessmentID diperlukan.');

  withLock_(() => {
    deleteRowsByValue_(SHEETS.ASSESSMENTS, 'AssessmentID', assessmentId);
    deleteRowsByValue_(SHEETS.EVIDENCE, 'AssessmentID', assessmentId);
  });

  return { ok: true, deletedAssessmentID: assessmentId };
}

function uploadEvidence(payload) {
  assertAuthorized_();
  setupDatabase();
  if (!payload) throw new Error('Payload evidens kosong.');
  if (!payload.studentId) throw new Error('StudentID diperlukan untuk evidens.');
  if (!payload.fileName) throw new Error('Nama fail diperlukan.');
  if (!payload.base64) throw new Error('Data fail base64 diperlukan.');

  const folderId = getSettingValue_('DriveFolderID');
  if (!folderId) {
    throw new Error('DriveFolderID belum ditetapkan dalam sheet Settings.');
  }

  const folder = DriveApp.getFolderById(folderId);
  const mimeType = payload.fileType || payload.mimeType || MimeType.PLAIN_TEXT;
  const base64 = String(payload.base64).replace(/^data:.*?;base64,/, '');
  const bytes = Utilities.base64Decode(base64);
  const safeName = sanitizeFileName_(payload.fileName);
  const storedName = `${formatDateForFile_(new Date())}_${payload.studentId}_${safeName}`;
  const blob = Utilities.newBlob(bytes, mimeType, storedName);
  const file = folder.createFile(blob);
  const driveUrl = file.getUrl();

  const row = {
    EvidenceID: makeId_('EVD'),
    StudentID: payload.studentId,
    AssessmentID: payload.assessmentId || '',
    FileName: safeName,
    FileType: mimeType,
    DriveURL: driveUrl,
    UploadedAt: nowIso_()
  };

  withLock_(() => {
    appendObject_(SHEETS.EVIDENCE, row);
    if (payload.assessmentId) {
      appendEvidenceUrlToAssessment_(payload.assessmentId, driveUrl);
    }
  });

  return row;
}

function getEvidence(filters) {
  assertAuthorized_();
  setupDatabase();
  const safeFilters = filters || {};
  let rows = readRows_(SHEETS.EVIDENCE);

  if (safeFilters.studentId) {
    rows = rows.filter(row => String(row.StudentID || '') === String(safeFilters.studentId));
  }

  if (safeFilters.assessmentId) {
    rows = rows.filter(row => String(row.AssessmentID || '') === String(safeFilters.assessmentId));
  }

  return rows.sort((a, b) => String(b.UploadedAt || '').localeCompare(String(a.UploadedAt || '')));
}

function deleteEvidence(evidenceId) {
  assertAuthorized_();
  if (!evidenceId) throw new Error('EvidenceID diperlukan.');
  withLock_(() => deleteRowsByValue_(SHEETS.EVIDENCE, 'EvidenceID', evidenceId));
  return { ok: true, deletedEvidenceID: evidenceId };
}

function getStudentProfileData(studentId) {
  assertAuthorized_();
  if (!studentId) throw new Error('StudentID diperlukan.');

  const student = getStudents({}).find(row => String(row.StudentID) === String(studentId));
  if (!student) throw new Error('Murid tidak ditemui.');

  const assessments = getAssessments({ studentId });
  const evidence = getEvidence({ studentId });
  const latestBySkill = buildLatestSkillMap_(assessments);

  return {
    student,
    assessments,
    evidence,
    latestBySkill,
    overall: calculateOverall_(latestBySkill)
  };
}

function getDashboardData() {
  assertAuthorized_();
  const students = getStudents({});
  const assessments = getAssessments({});
  return buildDashboard_(students, assessments);
}

function getReportsData(filters) {
  assertAuthorized_();
  const safeFilters = filters || {};
  const students = getStudents({});
  const assessments = getAssessments({});

  const selectedClass = safeFilters.className || '';
  const filteredStudents = selectedClass
    ? students.filter(student => String(student.Class || '') === selectedClass)
    : students;
  const studentIds = new Set(filteredStudents.map(student => student.StudentID));
  const filteredAssessments = assessments.filter(row => studentIds.has(row.StudentID));

  const individual = safeFilters.studentId ? getStudentProfileData(safeFilters.studentId) : null;
  const dashboard = buildDashboard_(filteredStudents, filteredAssessments);

  return {
    className: selectedClass,
    students: filteredStudents,
    assessments: filteredAssessments,
    dashboard,
    individual
  };
}

function normalizeStudent_(payload) {
  const data = payload || {};
  return {
    StudentID: clean_(data.StudentID || data.studentId || data.id),
    Name: clean_(data.Name || data.name),
    MyKid: clean_(data.MyKid || data.mykid || data.myKid),
    Class: clean_(data.Class || data.className || data.kelas),
    Gender: clean_(data.Gender || data.gender),
    TeacherName: clean_(data.TeacherName || data.teacherName)
  };
}

function validateStudent_(data) {
  if (!data.Name) throw new Error('Nama murid wajib diisi.');
  if (!data.Class) throw new Error('Kelas wajib diisi.');
}

function normalizeAssessment_(payload) {
  const data = payload || {};
  return {
    AssessmentID: clean_(data.AssessmentID || data.assessmentId),
    StudentID: clean_(data.StudentID || data.studentId),
    Skill: clean_(data.Skill || data.skill),
    Status: clean_(data.Status || data.status),
    TPLevel: clean_(data.TPLevel || data.tpLevel || data.tp),
    ReadingScale: clean_(data.ReadingScale || data.readingScale || data.scale),
    CommentScale3: clean_(data.CommentScale3 || data.commentScale3 || data.commentHigh),
    CommentScale2: clean_(data.CommentScale2 || data.commentScale2 || data.commentMedium),
    CommentScale1: clean_(data.CommentScale1 || data.commentScale1 || data.commentLow),
    AutoConclusion: clean_(data.AutoConclusion || data.autoConclusion || data.conclusion),
    TeacherNote: clean_(data.TeacherNote || data.teacherNote || data.note),
    EvidenceURL: clean_(data.EvidenceURL || data.evidenceUrl),
    AssessmentDate: clean_(data.AssessmentDate || data.assessmentDate || todayIso_())
  };
}

function validateAssessment_(data) {
  if (!data.StudentID) throw new Error('Murid wajib dipilih.');
  if (LANGUAGE_SKILLS.indexOf(data.Skill) === -1) throw new Error('Kemahiran tidak sah.');
  if (STATUS_OPTIONS.indexOf(data.Status) === -1) throw new Error('Status tidak sah.');
  if (TP_LEVELS.indexOf(data.TPLevel) === -1) throw new Error('Tahap penguasaan tidak sah.');
}

function buildDashboard_(students, assessments) {
  const classCounts = {};
  students.forEach(student => {
    const className = student.Class || 'Tanpa Kelas';
    classCounts[className] = (classCounts[className] || 0) + 1;
  });

  const latestByStudent = {};
  students.forEach(student => {
    latestByStudent[student.StudentID] = buildLatestSkillMap_(assessments.filter(row => row.StudentID === student.StudentID));
  });

  const skillSummary = LANGUAGE_SKILLS.map(skill => {
    let mastered = 0;
    let inProgress = 0;
    let notMastered = 0;
    let totalTp = 0;
    let tpCount = 0;

    students.forEach(student => {
      const latest = latestByStudent[student.StudentID][skill];
      if (!latest) {
        notMastered++;
        return;
      }
      if (latest.Status === 'Telah Menguasai') mastered++;
      else if (latest.Status === 'Sedang Menguasai') inProgress++;
      else notMastered++;

      const tp = parseInt(String(latest.TPLevel || '').replace('TP', ''), 10);
      if (!isNaN(tp)) {
        totalTp += tp;
        tpCount++;
      }
    });

    const total = Math.max(students.length, 1);
    return {
      Skill: skill,
      Mastered: mastered,
      InProgress: inProgress,
      NotMastered: notMastered,
      MasteryPercent: Math.round((mastered / total) * 100),
      AverageTP: tpCount ? Math.round((totalTp / tpCount) * 10) / 10 : 0
    };
  });

  const needsSupport = [];
  students.forEach(student => {
    const latest = latestByStudent[student.StudentID];
    LANGUAGE_SKILLS.forEach(skill => {
      const row = latest[skill];
      if (!row || row.Status !== 'Telah Menguasai') {
        needsSupport.push({
          StudentID: student.StudentID,
          Name: student.Name,
          Class: student.Class,
          Skill: skill,
          Status: row ? row.Status : 'Belum Menguasai',
          TPLevel: row ? row.TPLevel : 'TP1'
        });
      }
    });
  });

  const tpSummary = TP_LEVELS.map(tp => ({
    TPLevel: tp,
    Count: assessments.filter(row => row.TPLevel === tp).length
  }));

  return {
    totalStudents: students.length,
    classCounts,
    skillSummary,
    needsSupport,
    tpSummary,
    classDevelopmentText: buildClassDevelopmentText_(students, skillSummary)
  };
}

function buildClassDevelopmentText_(students, skillSummary) {
  if (!students.length) {
    return 'Belum ada data murid. Tambah murid untuk menjana ringkasan perkembangan kelas.';
  }
  const strongest = skillSummary.slice().sort((a, b) => b.MasteryPercent - a.MasteryPercent)[0];
  const weakest = skillSummary.slice().sort((a, b) => a.MasteryPercent - b.MasteryPercent)[0];
  return `Kelas mempunyai ${students.length} murid. Kemahiran paling kukuh ialah ${strongest.Skill} (${strongest.MasteryPercent}%). Fokus intervensi disarankan pada ${weakest.Skill} (${weakest.MasteryPercent}%).`;
}

function buildLatestSkillMap_(assessments) {
  const map = {};
  assessments.forEach(row => {
    const skill = row.Skill;
    if (!skill) return;
    const current = map[skill];
    const currentDate = current ? new Date(current.AssessmentDate || current.UpdatedAt || 0).getTime() : 0;
    const rowDate = new Date(row.AssessmentDate || row.UpdatedAt || 0).getTime();
    if (!current || rowDate >= currentDate) {
      map[skill] = row;
    }
  });
  return map;
}

function calculateOverall_(latestBySkill) {
  let score = 0;
  let tpTotal = 0;
  let tpCount = 0;

  LANGUAGE_SKILLS.forEach(skill => {
    const row = latestBySkill[skill];
    if (!row) return;
    score += STATUS_SCORE[row.Status] || 0;
    const tp = parseInt(String(row.TPLevel || '').replace('TP', ''), 10);
    if (!isNaN(tp)) {
      tpTotal += tp;
      tpCount++;
    }
  });

  const maxScore = LANGUAGE_SKILLS.length * 2;
  return {
    score,
    maxScore,
    percent: maxScore ? Math.round((score / maxScore) * 100) : 0,
    averageTP: tpCount ? Math.round((tpTotal / tpCount) * 10) / 10 : 0
  };
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== 'PASTE_SPREADSHEET_ID_HERE') {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error('Sila masukkan SPREADSHEET_ID dalam Code.gs atau bind script kepada Google Sheet.');
}

function getOrCreateSheet_(ss, sheetName) {
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function getSheet_(sheetName) {
  return getOrCreateSheet_(getSpreadsheet_(), sheetName);
}

function ensureHeader_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = range.getValues()[0];
  const needsHeader = current.join('') === '' || headers.some((header, index) => current[index] !== header);
  if (needsHeader) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function seedDefaultSettings_() {
  const existing = readRows_(SHEETS.SETTINGS).reduce((acc, row) => {
    acc[row.Key] = row.Value;
    return acc;
  }, {});

  const defaults = {
    DriveFolderID: '',
    SchoolName: '',
    SystemName: CONFIG.APP_TITLE,
    AllowedEmails: ''
  };

  Object.keys(defaults).forEach(key => {
    if (!(key in existing)) {
      appendObject_(SHEETS.SETTINGS, { Key: key, Value: defaults[key] });
    }
  });
}

function readRows_(sheetName) {
  setupSheetOnly_(sheetName);
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => rowToObject_(headers, row));
}

function setupSheetOnly_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, sheetName);
  ensureHeader_(sheet, HEADERS[sheetName]);
}

function rowToObject_(headers, row) {
  return headers.reduce((obj, header, index) => {
    obj[header] = formatCell_(row[index]);
    return obj;
  }, {});
}

function appendObject_(sheetName, object) {
  setupSheetOnly_(sheetName);
  const sheet = getSheet_(sheetName);
  const headers = HEADERS[sheetName];
  sheet.appendRow(headers.map(header => object[header] || ''));
}

function updateObjectById_(sheetName, idHeader, idValue, object) {
  const sheet = getSheet_(sheetName);
  const headers = HEADERS[sheetName];
  const idIndex = headers.indexOf(idHeader);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(idValue)) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([headers.map(header => object[header] || '')]);
      return true;
    }
  }
  return false;
}

function findRowById_(sheetName, idHeader, idValue) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idIndex = headers.indexOf(idHeader);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(idValue)) {
      return { rowNumber: i + 1, object: rowToObject_(headers, values[i]) };
    }
  }
  return null;
}

function deleteRowsByValue_(sheetName, idHeader, idValue) {
  setupSheetOnly_(sheetName);
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idIndex = headers.indexOf(idHeader);

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idIndex]) === String(idValue)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function appendEvidenceUrlToAssessment_(assessmentId, driveUrl) {
  const found = findRowById_(SHEETS.ASSESSMENTS, 'AssessmentID', assessmentId);
  if (!found) return;
  const current = clean_(found.object.EvidenceURL);
  found.object.EvidenceURL = current ? `${current}\n${driveUrl}` : driveUrl;
  found.object.UpdatedAt = nowIso_();
  updateObjectById_(SHEETS.ASSESSMENTS, 'AssessmentID', assessmentId, found.object);
}

function getSettingValue_(key) {
  const rows = readRows_(SHEETS.SETTINGS);
  const found = rows.find(row => row.Key === key);
  return found ? clean_(found.Value) : '';
}

function assertAuthorized_() {
  const allowed = getAllowedEmailsSafe_();
  if (!allowed.length) return true;

  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) {
    throw new Error('Akses ditolak. Sistem tidak dapat mengenal pasti akaun Google pengguna.');
  }
  if (allowed.indexOf(email) === -1) {
    throw new Error(`Akses ditolak untuk ${email}.`);
  }
  return true;
}

function getAllowedEmailsSafe_() {
  try {
    const value = getSettingValue_('AllowedEmails');
    if (!value) return [];
    return value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function makeId_(prefix) {
  return `${prefix}-${Utilities.getUuid()}`;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss");
}

function todayIso_() {
  return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
}

function formatDateForFile_(date) {
  return Utilities.formatDate(date, CONFIG.TIME_ZONE, 'yyyyMMdd-HHmmss');
}

function formatCell_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, CONFIG.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return value === null || value === undefined ? '' : value;
}

function clean_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function sanitizeFileName_(name) {
  return clean_(name).replace(/[\\/:*?"<>|#%{}~&]/g, '_').slice(0, 180) || 'evidens';
}
