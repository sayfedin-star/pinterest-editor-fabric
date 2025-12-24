/**
 * 🎨 Pinterest Pin Generator - Google Sheets Integration
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Save (Ctrl+S)
 * 4. Click Run → testSingleGeneration
 * 5. Grant permissions when prompted
 * 6. Once test works, use the "Pin Generator" menu that appears
 */

// ============================================
// ⚙️ CONFIGURATION
// ============================================
const CONFIG = {
  API_KEY:
    "pingen_0b3253bbff13cd942b8d2a389bdc816e068e310d58bed104fde061a189026de4",
  TEMPLATE_ID: "TMPL-AADA84C0",
  API_BASE_URL: "https://pinterest-editor-fabric.vercel.app",

  SHEET_NAME: "Sheet1",
  HEADER_ROW: 1,
  DATA_START_ROW: 2,

  // Maps template field names → spreadsheet column names
  // Template has: "Text 1", "Image 1", "Image 2"
  // Sheet has: "Image1", "Image2", "Image Text"
  FIELD_MAPPING: {
    text1: "Image Text", // Template text field → Sheet column
    image1: "Image1", // Template image field → Sheet column
    image2: "Image2", // Template image field → Sheet column
  },

  OUTPUT_COLUMN: "D", // Where to write generated URLs

  // IMPORTANT: Set to 1 to avoid Vercel 60s timeout
  // Each row takes ~10-20 seconds due to external image fetching
  BATCH_SIZE: 1,

  // Delay between batches in milliseconds (prevent rate limiting)
  BATCH_DELAY_MS: 2000,
};

// ============================================
// 🚀 MAIN FUNCTIONS
// ============================================

function testSingleGeneration() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEET_NAME
  );
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet not found: " + CONFIG.SHEET_NAME);
    return;
  }

  const headers = getHeaders(sheet);
  const dataRows = getDataRows(sheet, headers);

  if (dataRows.length === 0) {
    SpreadsheetApp.getUi().alert("No data rows found!");
    return;
  }

  Logger.log("Testing with row: " + JSON.stringify(dataRows[0].data));

  try {
    const result = callGenerateApi([dataRows[0].data]);
    Logger.log("API Response: " + JSON.stringify(result));

    if (result.success && result.generated.length > 0) {
      const url = result.generated[0].url;
      writeOutputUrl(sheet, dataRows[0].rowNumber, url);
      SpreadsheetApp.getUi().alert(
        "✅ Test Successful!\n\nGenerated URL:\n" +
          url +
          "\n\nProcessing time: " +
          result.meta.processing_time_ms +
          "ms"
      );
    } else {
      const errorMsg =
        result.error || result.failed[0]?.error || "Unknown error";
      SpreadsheetApp.getUi().alert("❌ Test Failed\n\nError: " + errorMsg);
    }
  } catch (error) {
    Logger.log("Error: " + error.message);
    SpreadsheetApp.getUi().alert("❌ API Error: " + error.message);
  }
}

function generatePins() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    CONFIG.SHEET_NAME
  );
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet not found: " + CONFIG.SHEET_NAME);
    return;
  }

  const headers = getHeaders(sheet);
  const dataRows = getDataRows(sheet, headers);

  if (dataRows.length === 0) {
    SpreadsheetApp.getUi().alert("No data rows found!");
    return;
  }

  // Check for existing URLs and filter out already-processed rows
  const outputCol = CONFIG.OUTPUT_COLUMN.charCodeAt(0) - 64;
  const rowsToProcess = dataRows.filter((row) => {
    const existingValue = sheet
      .getRange(row.rowNumber, outputCol)
      .getValue()
      .toString();
    // Skip if already has a URL (starts with http)
    return !existingValue.startsWith("http");
  });

  const alreadyDone = dataRows.length - rowsToProcess.length;

  if (rowsToProcess.length === 0) {
    SpreadsheetApp.getUi().alert(
      "✅ All rows already processed!\n\n" + alreadyDone + " rows have URLs."
    );
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "🎨 Generate Pins",
    (alreadyDone > 0
      ? "📋 Resuming: " + alreadyDone + " rows already done\n"
      : "") +
      "🔄 Rows to process: " +
      rowsToProcess.length +
      "\n\n" +
      "⏱️ Estimated time: " +
      Math.ceil((rowsToProcess.length * 15) / 60) +
      "-" +
      Math.ceil((rowsToProcess.length * 25) / 60) +
      " minutes\n\n" +
      "Continue?",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  Logger.log(
    "Processing " +
      rowsToProcess.length +
      " rows (skipping " +
      alreadyDone +
      " already done)"
  );
  let totalGenerated = 0,
    totalFailed = 0,
    totalSkipped = alreadyDone;

  // Process one row at a time to avoid timeout
  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i];
    Logger.log(
      "Processing row " +
        (i + 1) +
        "/" +
        rowsToProcess.length +
        " (sheet row " +
        row.rowNumber +
        ")"
    );

    // Update status in sheet (optional - shows progress)
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Processing " +
        (i + 1) +
        "/" +
        rowsToProcess.length +
        " (skipped " +
        totalSkipped +
        ")",
      "🎨 Pin Generator"
    );

    try {
      const result = callGenerateApi([row.data]);

      if (result.success && result.generated.length > 0) {
        writeOutputUrl(sheet, row.rowNumber, result.generated[0].url);
        totalGenerated++;
        Logger.log(
          "Row " + row.rowNumber + " success: " + result.generated[0].url
        );
      } else {
        const errorMsg = result.error || result.failed[0]?.error || "Unknown";
        Logger.log("Row " + row.rowNumber + " failed: " + errorMsg);
        writeOutputUrl(sheet, row.rowNumber, "ERROR: " + errorMsg);
        totalFailed++;
      }
    } catch (error) {
      Logger.log("Row " + row.rowNumber + " error: " + error.message);
      writeOutputUrl(sheet, row.rowNumber, "ERROR: " + error.message);
      totalFailed++;
    }

    // Delay between rows to prevent rate limiting
    if (i < rowsToProcess.length - 1) {
      Utilities.sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  SpreadsheetApp.getUi().alert(
    "✅ Generation Complete!\n\n" +
      "✅ Generated: " +
      totalGenerated +
      "\n" +
      "❌ Failed: " +
      totalFailed +
      "\n" +
      "⏭️ Skipped (already done): " +
      totalSkipped
  );
}

function debugApiConnection() {
  const url = CONFIG.API_BASE_URL + "/api/v1/generate";
  Logger.log("Testing: " + url);

  try {
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { Authorization: "Bearer " + CONFIG.API_KEY },
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    Logger.log(
      "Status: " + status + ", Response: " + response.getContentText()
    );

    if (status === 200) {
      SpreadsheetApp.getUi().alert(
        "✅ API Connection OK!\n\nYou can now run testSingleGeneration()"
      );
    } else {
      SpreadsheetApp.getUi().alert(
        "❌ API returned status " + status + "\n\n" + response.getContentText()
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert("❌ Connection Failed: " + error.message);
  }
}

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

function getHeaders(sheet) {
  const values = sheet
    .getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const headers = {};
  values.forEach((h, i) => {
    if (h) headers[h.toString().trim()] = i;
  });
  return headers;
}

function getDataRows(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) return [];

  const data = sheet
    .getRange(
      CONFIG.DATA_START_ROW,
      1,
      lastRow - CONFIG.DATA_START_ROW + 1,
      sheet.getLastColumn()
    )
    .getValues();
  const headerNames = Object.keys(headers);

  return data
    .map((row, i) => {
      if (row.every((c) => !c || c.toString().trim() === "")) return null;
      const rowData = {};
      headerNames.forEach((h) => {
        rowData[h] = row[headers[h]]?.toString() || "";
      });
      return { rowNumber: CONFIG.DATA_START_ROW + i, data: rowData };
    })
    .filter((r) => r !== null);
}

function callGenerateApi(rows) {
  const url = CONFIG.API_BASE_URL + "/api/v1/generate";

  const payload = {
    template_id: CONFIG.TEMPLATE_ID,
    rows: rows,
    field_mapping: CONFIG.FIELD_MAPPING,
    multiplier: 1, // 1x for original canvas size (faster, smaller files)
  };

  Logger.log("Request: " + JSON.stringify(payload));

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + CONFIG.API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  Logger.log("Response (" + status + "): " + text);

  if (status >= 400) {
    const err = JSON.parse(text);
    return {
      success: false,
      error: err.error || "HTTP " + status,
      generated: [],
      failed: [],
    };
  }

  return JSON.parse(text);
}

function writeOutputUrl(sheet, rowNumber, url) {
  const col = CONFIG.OUTPUT_COLUMN.charCodeAt(0) - 64;
  sheet.getRange(rowNumber, col).setValue(url);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ============================================
// 📋 CUSTOM MENU
// ============================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🎨 Pin Generator")
    .addItem("🧪 Test Single Row", "testSingleGeneration")
    .addItem("📊 Generate All Pins", "generatePins")
    .addSeparator()
    .addItem("🔧 Debug Connection", "debugApiConnection")
    .addToUi();
}
