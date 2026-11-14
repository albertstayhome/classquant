/**
 * ClassQuant Hub - Google Apps Script 雲端後端 (雙向留言板 + 全系統定期／隨時雲端備份)
 *
 * 【初次 3 分鐘部署指南（免費使用您自己的 Google 帳號試算表）】：
 * 1. 在 Google 雲端硬碟建立一個新的「Google 試算表」，命名為「ClassQuant 雲端資料庫」。
 * 2. 點擊試算表頂部選單「擴充功能」➔「Apps Script」。
 * 3. 清空原本的程式碼，將本檔案的全部內容複製貼上，按下 Ctrl+S 儲存。
 * 4. 點擊右上角「部署」➔「新增部署作業」：
 *    - 種類選擇：「網頁應用程式」 (Web app)
 *    - 說明：ClassQuant Cloud Backup & Feedback API
 *    - 執行身分：「我 (您的 Google 帳號)」
 *    - 誰可以存取：「所有人 (Anyone)」  <--- 必選，讓手機與平板免登入即可自動備份
 * 5. 點擊「部署」，依畫面指示授權權限（「進階」➔「前往...(不安全)」➔「允許」）。
 * 6. 複製產生的「網頁應用程式網址」（https://script.google.com/macros/s/.../exec）。
 * 7. 貼回 ClassQuant Hub ➔「AI與備份」分頁的「Google 雲端備份設定」即可自動定期／隨時備份＆一鍵還原！
 *
 * 💡 若您先前已部署過舊版留言板腳本，只要覆蓋貼上本程式碼並按「部署」➔「管理部署作業」➔「編輯」➔選「新版本」➔「部署」，
 *    原本的網址完全不用改，立刻升級擁有【教師名單＋標籤＋成績無限容量分片備份／還原】功能！
 */

const SHEET_NAME = 'Feedbacks';
const HEADERS = ['ID', '時間', '稱謂', '身份', '類別', '留言內容', '點讚數', '回覆內容', '回覆者', '回覆時間'];

const BACKUP_SHEET_NAME = 'Backups';
const BACKUP_HEADERS = [
  'BackupID', 'ISO時間', '本地時間', '備份原因', '裝置標記',
  '班級數', '學生數', '評量數', '事件數', '資料雜湊', '分片數', 'JSON資料分片1'
];
const CHUNK_SIZE = 45000; // 安全低於 Google 試算表單格 50,000 字元上限
const MAX_BACKUP_ROWS = 30;

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateBackupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BACKUP_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BACKUP_SHEET_NAME);
    sheet.appendRow(BACKUP_HEADERS);
    sheet.getRange(1, 1, 1, BACKUP_HEADERS.length).setFontWeight('bold').setBackground('#fce7f3');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 📥 doGet：讀取留言板資料 / 連線測試 / 讀取雲端備份清單與還原資料
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'get';

    if (action === 'ping') {
      return jsonOut({ status: 'ok', version: '2.0', supportsBackups: true });
    }

    if (action === 'list_backups') {
      const sheet = getOrCreateBackupSheet();
      const data = sheet.getDataRange().getValues();
      const list = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        list.push({
          id: String(row[0]),
          timestamp: row[1] ? new Date(row[1]).toISOString() : '',
          localTimeStr: String(row[2] || ''),
          reason: String(row[3] || ''),
          deviceLabel: String(row[4] || ''),
          summary: {
            classCount: Number(row[5] || 0),
            studentCount: Number(row[6] || 0),
            assessmentCount: Number(row[7] || 0),
            eventCount: Number(row[8] || 0)
          },
          hash: String(row[9] || ''),
          chunkCount: Number(row[10] || 1)
        });
      }
      list.sort(function(a, b) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      return jsonOut(list);
    }

    if (action === 'get_backup') {
      const targetId = e && e.parameter && e.parameter.id ? String(e.parameter.id) : '';
      const sheet = getOrCreateBackupSheet();
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (String(row[0]) === targetId || (!targetId && row[0])) {
          const chunkCount = Number(row[10] || 1);
          let dataJson = '';
          for (let c = 0; c < chunkCount; c++) {
            dataJson += String(row[11 + c] || '');
          }
          // 相容 fallback：若分片後方仍有文字也一併接回
          if (!dataJson) {
            for (let c = 11; c < row.length; c++) {
              if (row[c]) dataJson += String(row[c]);
            }
          }
          return jsonOut({
            id: String(row[0]),
            timestamp: row[1] ? new Date(row[1]).toISOString() : '',
            localTimeStr: String(row[2] || ''),
            reason: String(row[3] || ''),
            dataJson: dataJson
          });
        }
      }
      return jsonOut({ error: '找不到指定的雲端備份版本：' + targetId });
    }

    // Default: 讀取所有留言
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    const feedbacks = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      feedbacks.push({
        id: String(row[0]),
        timestamp: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
        author: String(row[2] || '訪客'),
        role: String(row[3] || '導師'),
        category: String(row[4] || 'feedback'),
        content: String(row[5] || ''),
        likes: Number(row[6] || 0),
        reply: String(row[7] || ''),
        replyAuthor: String(row[8] || ''),
        replyTimestamp: row[9] ? new Date(row[9]).toISOString() : ''
      });
    }

    feedbacks.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return jsonOut(feedbacks);
  } catch (err) {
    return jsonOut({ error: err.toString() });
  }
}

// 📤 doPost：接收留言寫入／刪除 或 全系統備份分片上傳
function doPost(e) {
  try {
    const contents = e.postData.contents;
    const entry = JSON.parse(contents);

    // A. 全系統雲端備份上傳 (標籤 + 名單 + 分數 + 事件 + 座位 + 課表)
    if (entry && entry.type === 'backup' && entry.dataJson) {
      const sheet = getOrCreateBackupSheet();
      const rawJson = String(entry.dataJson);
      const chunks = [];
      for (let i = 0; i < rawJson.length; i += CHUNK_SIZE) {
        chunks.push(rawJson.substring(i, i + CHUNK_SIZE));
      }
      if (chunks.length === 0) chunks.push('{}');

      // 若分片數超過目前標題欄數，動態補齊標題欄
      const neededCols = 11 + chunks.length;
      const curLastCol = sheet.getLastColumn();
      if (curLastCol < neededCols) {
        for (let c = curLastCol + 1; c <= neededCols; c++) {
          sheet.getRange(1, c).setValue('JSON資料分片' + (c - 11)).setFontWeight('bold').setBackground('#fce7f3');
        }
      }

      const s = entry.summary || {};
      const rowData = [
        entry.id || ('bk_' + Date.now()),
        entry.timestamp || new Date().toISOString(),
        entry.localTimeStr || '',
        entry.reason || '雲端備份',
        entry.deviceLabel || '',
        Number(s.classCount || 0),
        Number(s.studentCount || 0),
        Number(s.assessmentCount || 0),
        Number(s.eventCount || 0),
        String(entry.hash || ''),
        chunks.length
      ].concat(chunks);

      // 新備份插入第 2 列（最新在最上面）
      sheet.insertRowBefore(2);
      sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);

      // 只保留最新 MAX_BACKUP_ROWS 筆，避免試算表過度膨脹
      const totalRows = sheet.getLastRow();
      if (totalRows > MAX_BACKUP_ROWS + 1) {
        sheet.deleteRows(MAX_BACKUP_ROWS + 2, totalRows - (MAX_BACKUP_ROWS + 1));
      }

      return jsonOut({ status: 'success', id: rowData[0], chunks: chunks.length });
    }

    // B. 留言板刪除同步
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    if (entry && entry.action === 'delete' && entry.id) {
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]) === String(entry.id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return jsonOut({ status: 'deleted', id: entry.id });
    }

    // C. 留言板新增／更新（支援單筆或陣列）
    const incoming = Array.isArray(entry) ? entry : [entry];
    incoming.forEach(function(item) {
      if (!item || !item.id) return;
      const latestData = sheet.getDataRange().getValues();
      let foundRowIndex = -1;
      for (let i = 1; i < latestData.length; i++) {
        if (String(latestData[i][0]) === String(item.id)) {
          foundRowIndex = i + 1;
          break;
        }
      }

      const rowData = [
        item.id || ('fb-' + Date.now()),
        item.timestamp || new Date().toISOString(),
        item.author || '訪客',
        item.role || '導師',
        item.category || 'feedback',
        item.content || '',
        item.likes || 0,
        item.reply || '',
        item.replyAuthor || '',
        item.replyTimestamp || ''
      ];

      if (foundRowIndex > 0) {
        sheet.getRange(foundRowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
    });

    return jsonOut({ status: 'success' });
  } catch (err) {
    return jsonOut({ status: 'error', message: err.toString() });
  }
}
