import * as XLSX from 'xlsx';

export function readClinicsFromSpreadsheet(filePath) {
  return new Promise((resolve, reject) => {
    // Fetch the file from the specified path
    fetch(filePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        // Read the array buffer using XLSX
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

        // Get the first sheet's name and content
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert the sheet content to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        resolve(jsonData); // Return the JSON data
      })
      .catch(error => {
        reject(`Error reading spreadsheet: ${error.message}`);
      });
  });
}
