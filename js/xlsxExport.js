/**
 * Pure Vanilla JS Excel (.xlsx) Builder — zero external CDN dependency.
 * Generates valid PKZIP (Store / UTF-8 filenames) + OOXML SpreadsheetML (.xlsx)
 * compatible with Microsoft Excel, LibreOffice Calc, and Google Sheets.
 */
(function (global) {
  'use strict';

  const encoder = new TextEncoder();

  // Precompute IEEE 802.3 CRC32 lookup table
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function sanitizeXmlText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, '');
  }

  function escapeXml(value) {
    return sanitizeXmlText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function colIndexToLetter(index) {
    let n = index + 1;
    let letters = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      letters = String.fromCharCode(65 + rem) + letters;
      n = Math.floor((n - 1) / 26);
    }
    return letters;
  }

  function sanitizeSheetName(rawName, usedNames) {
    let cleaned = sanitizeXmlText(rawName || 'Sheet')
      .replace(/[:\\\/\?\*\[\]]/g, '_')
      .trim()
      .replace(/^'+|'+$/g, '');
    if (!cleaned) cleaned = 'Sheet';
    cleaned = cleaned.slice(0, 31);
    let candidate = cleaned;
    let suffix = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      const tag = `_${suffix++}`;
      candidate = cleaned.slice(0, Math.max(1, 31 - tag.length)) + tag;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  function measureDisplayWidth(val) {
    if (val === null || val === undefined) return 0;
    const str = String(val);
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      width += code > 0xFF ? 2.1 : 1.05;
    }
    return width;
  }

  function getDosTimeDate(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime =
      ((date.getHours() & 0x1F) << 11) |
      ((date.getMinutes() & 0x3F) << 5) |
      ((date.getSeconds() >> 1) & 0x1F);
    const dosDate =
      (((year - 1980) & 0x7F) << 9) |
      (((date.getMonth() + 1) & 0x0F) << 5) |
      (date.getDate() & 0x1F);
    return { dosTime, dosDate };
  }

  function buildZipStore(entries) {
    const { dosTime, dosDate } = getDosTimeDate();
    const localChunks = [];
    const centralChunks = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.path);
      const dataBytes = entry.bytes instanceof Uint8Array ? entry.bytes : encoder.encode(String(entry.bytes));
      const crc = crc32(dataBytes);
      const size = dataBytes.length;

      // Local File Header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034B50, true); // Local file header signature
      lv.setUint16(4, 20, true);         // Version needed (2.0)
      lv.setUint16(6, 0x0800, true);     // General purpose flag: UTF-8 filename
      lv.setUint16(8, 0, true);          // Compression method: 0 (Store)
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);      // Compressed size
      lv.setUint32(22, size, true);      // Uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);         // Extra field length
      localHeader.set(nameBytes, 30);

      localChunks.push(localHeader, dataBytes);

      // Central Directory Header (46 bytes + filename)
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdHeader.buffer);
      cv.setUint32(0, 0x02014B50, true); // Central directory signature
      cv.setUint16(4, 20, true);         // Version made by
      cv.setUint16(6, 20, true);         // Version needed
      cv.setUint16(8, 0x0800, true);     // UTF-8 flag
      cv.setUint16(10, 0, true);         // Store
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);         // Extra length
      cv.setUint16(32, 0, true);         // Comment length
      cv.setUint16(34, 0, true);         // Disk number
      cv.setUint16(36, 0, true);         // Internal attrs
      cv.setUint32(38, 0, true);         // External attrs
      cv.setUint32(42, offset, true);    // Local header offset
      cdHeader.set(nameBytes, 46);

      centralChunks.push(cdHeader);
      offset += localHeader.length + dataBytes.length;
    }

    const centralDirSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);      // End of central directory signature
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralDirSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const totalLen = offset + centralDirSize + eocd.length;
    const output = new Uint8Array(totalLen);
    let cursor = 0;
    for (const chunk of localChunks) {
      output.set(chunk, cursor);
      cursor += chunk.length;
    }
    for (const chunk of centralChunks) {
      output.set(chunk, cursor);
      cursor += chunk.length;
    }
    output.set(eocd, cursor);
    return output;
  }

  function buildStylesXml() {
    // Style indices:
    // s="0": Default body (Microsoft JhengHei 11pt)
    // s="1": Header row (bold white on deep slate blue #334155, centered)
    // s="2": Title banner row (bold dark #1E293B on soft tint #F1F5F9)
    // s="3": Bold accent number/text
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><color rgb="FF1F2937"/><name val="Microsoft JhengHei"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/></font>
    <font><b/><sz val="12"/><color rgb="FF0F172A"/><name val="Microsoft JhengHei"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF334155"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0"/>
</styleSheet>`;
  }

  function buildWorksheetXml(sheet) {
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const headerRowIndex = Number.isInteger(sheet.headerRowIndex) ? sheet.headerRowIndex : 0;
    const titleRowIndexes = new Set(Array.isArray(sheet.titleRowIndexes) ? sheet.titleRowIndexes : []);
    const freezeRow = Number.isInteger(sheet.freezeRow) ? sheet.freezeRow : (headerRowIndex >= 0 ? headerRowIndex + 1 : 0);

    // Measure column widths
    const colWidths = [];
    rows.forEach((row) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, cIdx) => {
        const w = measureDisplayWidth(cell);
        if (!colWidths[cIdx] || w > colWidths[cIdx]) colWidths[cIdx] = w;
      });
    });

    let colsXml = '';
    if (colWidths.length > 0) {
      const colDefs = colWidths.map((w, idx) => {
        const clamped = Math.min(44, Math.max(9, Math.ceil(w + 3)));
        return `<col min="${idx + 1}" max="${idx + 1}" width="${clamped}" customWidth="1"/>`;
      }).join('');
      colsXml = `<cols>${colDefs}</cols>`;
    }

    let sheetViewsXml = '<sheetViews><sheetView workbookViewId="0"/>';
    if (freezeRow > 0 && rows.length > freezeRow) {
      sheetViewsXml = `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    } else {
      sheetViewsXml = '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    }

    const rowParts = [];
    rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 1;
      if (!Array.isArray(row) || row.length === 0) {
        rowParts.push(`<row r="${rowNum}"/>`);
        return;
      }
      let styleAttr = ' s="0"';
      if (rIdx === headerRowIndex) styleAttr = ' s="1"';
      else if (titleRowIndexes.has(rIdx)) styleAttr = ' s="2"';

      const cellParts = [];
      row.forEach((val, cIdx) => {
        if (val === null || val === undefined || val === '') {
          if (rIdx === headerRowIndex || titleRowIndexes.has(rIdx)) {
            const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
            cellParts.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t></t></is></c>`);
          }
          return;
        }
        const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
        if (typeof val === 'number' && Number.isFinite(val)) {
          cellParts.push(`<c r="${ref}"${styleAttr}><v>${val}</v></c>`);
        } else {
          const escaped = escapeXml(val);
          cellParts.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escaped}</t></is></c>`);
        }
      });

      const htAttr = rIdx === headerRowIndex ? ' ht="24" customHeight="1"' : (titleRowIndexes.has(rIdx) ? ' ht="22" customHeight="1"' : '');
      rowParts.push(`<row r="${rowNum}"${htAttr}>${cellParts.join('')}</row>`);
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${sheetViewsXml}
  <sheetFormatPr defaultRowHeight="19"/>
  ${colsXml}
  <sheetData>${rowParts.join('')}</sheetData>
</worksheet>`;
  }

  const XlsxBuilder = {
    buildWorkbookBytes(sheets) {
      const inputSheets = Array.isArray(sheets) && sheets.length > 0
        ? sheets
        : [{ name: 'Sheet1', rows: [['無資料']] }];

      const usedNames = new Set();
      const normalizedSheets = inputSheets.map((s, idx) => ({
        ...s,
        safeName: sanitizeSheetName(s.name || `Sheet${idx + 1}`, usedNames),
        path: `xl/worksheets/sheet${idx + 1}.xml`,
        relTarget: `worksheets/sheet${idx + 1}.xml`,
        rId: `rId${idx + 1}`,
        sheetId: idx + 1
      }));

      const contentTypeOverrides = normalizedSheets
        .map(s => `<Override PartName="/${s.path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('');

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${contentTypeOverrides}
</Types>`;

      const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

      const workbookSheetsXml = normalizedSheets
        .map(s => `<sheet name="${escapeXml(s.safeName)}" sheetId="${s.sheetId}" r:id="${s.rId}"/>`)
        .join('');

      const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheetsXml}</sheets>
</workbook>`;

      const stylesRelId = `rId${normalizedSheets.length + 1}`;
      const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${normalizedSheets.map(s => `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${s.relTarget}"/>`).join('')}
  <Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

      const zipEntries = [
        { path: '[Content_Types].xml', bytes: encoder.encode(contentTypesXml) },
        { path: '_rels/.rels', bytes: encoder.encode(rootRelsXml) },
        { path: 'xl/workbook.xml', bytes: encoder.encode(workbookXml) },
        { path: 'xl/_rels/workbook.xml.rels', bytes: encoder.encode(workbookRelsXml) },
        { path: 'xl/styles.xml', bytes: encoder.encode(buildStylesXml()) }
      ];

      normalizedSheets.forEach(s => {
        zipEntries.push({
          path: s.path,
          bytes: encoder.encode(buildWorksheetXml(s))
        });
      });

      return buildZipStore(zipEntries);
    },

    buildWorkbookBlob(sheets) {
      const bytes = this.buildWorkbookBytes(sheets);
      return new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    },

    downloadWorkbook(filename, sheets) {
      const safeFilename = String(filename || 'export.xlsx').endsWith('.xlsx')
        ? String(filename || 'export.xlsx')
        : `${filename}.xlsx`;
      const blob = this.buildWorkbookBlob(sheets);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return safeFilename;
    }
  };

  global.XlsxBuilder = XlsxBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
