export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * SpaceCraft Workspace Backend - Google Apps Script Engine
 * Paste this script into your Google Sheets Extensions > Apps Script editor.
 * 
 * It will automatically initialize the required Sheets:
 * 1. workspaces
 * 2. documents
 * 3. canvas_elements
 */

function doGet(e) {
  var action = e.parameter.action;
  var workspaceId = e.parameter.workspace_id;
  
  // Set CORS headers
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss); // Auto-initialize sheets on first run
    
    var data = [];
    if (action === "getWorkspaces") {
      data = getRows(ss.getSheetByName("workspaces"));
    } else if (action === "getDocs") {
      data = getRows(ss.getSheetByName("documents"));
      if (workspaceId) {
        data = data.filter(function(r) { return String(r.workspace_id) === String(workspaceId); });
      }
    } else if (action === "getCanvas") {
      data = getRows(ss.getSheetByName("canvas_elements"));
      if (workspaceId) {
        data = data.filter(function(r) { return String(r.workspace_id) === String(workspaceId); });
      }
    } else if (action === "test") {
      return output.setContent(JSON.stringify({ success: true, message: "Connection successful!", database: ss.getName() }));
    } else {
      return output.setContent(JSON.stringify({ success: false, error: "Invalid action: " + action }));
    }
    
    return output.setContent(JSON.stringify({ success: true, data: data }));
  } catch(err) {
    return output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
}

function doPost(e) {
  // Set CORS headers
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    var action = payload.action;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    if (action === "saveWorkspace") {
      upsertRow(ss.getSheetByName("workspaces"), payload.data, ["id"]);
    } else if (action === "deleteWorkspace") {
      deleteRow(ss.getSheetByName("workspaces"), payload.id);
      // Cascading deletations
      deleteRowsByFilter(ss.getSheetByName("documents"), "workspace_id", payload.id);
      deleteRowsByFilter(ss.getSheetByName("canvas_elements"), "workspace_id", payload.id);
    } else if (action === "saveDoc") {
      upsertRow(ss.getSheetByName("documents"), payload.data, ["id"]);
    } else if (action === "saveCanvasElement") {
      upsertRow(ss.getSheetByName("canvas_elements"), payload.data, ["id"]);
    } else if (action === "saveCanvasBatch") {
      saveCanvasBatch(ss.getSheetByName("canvas_elements"), payload.workspace_id, payload.elements);
    } else if (action === "deleteCanvasElement") {
      deleteRow(ss.getSheetByName("canvas_elements"), payload.id);
    } else if (action === "test") {
      return output.setContent(JSON.stringify({ success: true, message: "Write test connection successful!" }));
    } else {
      return output.setContent(JSON.stringify({ success: false, error: "Invalid POST action: " + action }));
    }
    
    return output.setContent(JSON.stringify({ success: true }));
  } catch(err) {
    return output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
}

// Ensure sheets exist with correct columns
function initSheets(ss) {
  var sheets = {
    "workspaces": ["id", "name", "created_at"],
    "documents": ["id", "workspace_id", "title", "content", "updated_at"],
    "canvas_elements": ["id", "workspace_id", "type", "position_x", "position_y", "text_content", "updated_at"]
  };
  
  for (var name in sheets) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      // Apply professional header styling
      var headerRange = sheet.getRange(1, 1, 1, sheets[name].length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#374151");
      headerRange.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
  }
}

// Extract rows from sheet as object list
function getRows(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rawValues = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  var results = [];
  for (var r = 0; r < rawValues.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var headerName = headers[c];
      var val = rawValues[r][c];
      
      // Auto-cast numerical types for positions
      if (headerName === "position_x" || headerName === "position_y") {
        obj[headerName] = Number(val) || 0;
      } else {
        obj[headerName] = val;
      }
    }
    results.push(obj);
  }
  return results;
}

// Update or Insert a row in a sheet based on unique key match
function upsertRow(sheet, data, keyFields) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Create row array mapped to headers
  var newRowValues = [];
  for (var i = 0; i < headers.length; i++) {
    newRowValues.push(data[headers[i]] !== undefined ? data[headers[i]] : "");
  }
  
  if (lastRow <= 1) {
    sheet.appendRow(newRowValues);
    return;
  }
  
  var existingRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  // Look for match
  var matchIndex = -1;
  for (var r = 0; r < existingRows.length; r++) {
    var isMatch = true;
    for (var k = 0; k < keyFields.length; k++) {
      var colIdx = headers.indexOf(keyFields[k]);
      if (colIdx !== -1 && String(existingRows[r][colIdx]) !== String(data[keyFields[k]])) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) {
      matchIndex = r + 2; // Rows are 1-indexed, starts from row 2
      break;
    }
  }
  
  if (matchIndex !== -1) {
    // Overwrite existing row
    sheet.getRange(matchIndex, 1, 1, headers.length).setValues([newRowValues]);
  } else {
    // Append new row
    sheet.appendRow(newRowValues);
  }
}

// Delete row from sheet by primary ID
function deleteRow(sheet, id) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf("id");
  if (idColIdx === -1) return;
  
  var values = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
  for (var r = values.length - 1; r >= 0; r--) {
    if (String(values[r][0]) === String(id)) {
      sheet.deleteRow(r + 2);
    }
  }
}

// Bulk delete rows containing matching value in specific column
function deleteRowsByFilter(sheet, filterColName, filterVal) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx = headers.indexOf(filterColName);
  if (colIdx === -1) return;
  
  var values = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
  for (var r = values.length - 1; r >= 0; r--) {
    if (String(values[r][0]) === String(filterVal)) {
      sheet.deleteRow(r + 2);
    }
  }
}

// Overwrite all canvas elements for a specific workspace to maintain latest positions
function saveCanvasBatch(sheet, workspaceId, elements) {
  if (!sheet) return;
  
  // First, wipe out all elements matching this workspace_id
  deleteRowsByFilter(sheet, "workspace_id", workspaceId);
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Bulk append new elements
  if (elements && elements.length > 0) {
    var rowsToAppend = [];
    for (var e = 0; e < elements.length; e++) {
      var elem = elements[e];
      var row = [];
      for (var h = 0; h < headers.length; h++) {
        row.push(elem[headers[h]] !== undefined ? elem[headers[h]] : "");
      }
      rowsToAppend.push(row);
    }
    // Append in single range set to avoid speed issues
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
}
`;
