import Papa from "papaparse";

interface RawCsvRow {
  JobDate: string;
  "ID Number": string;
  CustName: string;
  Phone: string;
  "Booking Purpose": string;
  PUAddr: string;
  "PU Unit": string;
  PickupCity: string;
  PUState: string;
  PickZip: string;
  DOAddr: string;
  "DO Unit": string;
  DropCity: string;
  DOState: string;
  DropZip: string;
  "Assistive Device": string;
  nTotalWheelChairs: string;
  nTotalPassengers: string;
  SchPU: string;
  AptTime: string;
  Notes: string;
  JobID: string;
}

export interface ParsedManifestRow {
  jobDate: string;
  idNumber: string;
  custName: string;
  phone: string;
  bookingPurpose: string;
  puAddr: string;
  puUnit: string;
  pickupCity: string;
  puState: string;
  pickZip: string;
  doAddr: string;
  doUnit: string;
  dropCity: string;
  doState: string;
  dropZip: string;
  assistiveDevice: string;
  nTotalWheelChairs: number;
  nTotalPassengers: number;
  schPU: string;
  aptTime: string;
  notes: string;
  jobID: string;
  legType: "pickup" | "dropoff";
}

function deriveLegType(jobID: string): "pickup" | "dropoff" {
  if (jobID.endsWith("-A")) return "pickup";
  if (jobID.endsWith("-B")) return "dropoff";
  // Default to pickup if suffix is missing
  return "pickup";
}

export function parseManifestCSV(csvString: string): {
  rows: ParsedManifestRow[];
  errors: string[];
} {
  const errors: string[] = [];

  const result = Papa.parse<RawCsvRow>(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(`Row ${err.row ?? "?"}: ${err.message}`);
    }
  }

  const rows: ParsedManifestRow[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const raw = result.data[i];
    const rowNum = i + 2; // +2 because header is row 1, data starts at row 2

    const jobID = (raw.JobID ?? "").trim();
    const custName = (raw.CustName ?? "").trim();

    if (!jobID) {
      errors.push(`Row ${rowNum}: Missing JobID, skipping`);
      continue;
    }
    if (!custName) {
      errors.push(`Row ${rowNum}: Missing CustName, skipping`);
      continue;
    }

    rows.push({
      jobDate: (raw.JobDate ?? "").trim(),
      idNumber: (raw["ID Number"] ?? "").trim(),
      custName,
      phone: (raw.Phone ?? "").trim(),
      bookingPurpose: (raw["Booking Purpose"] ?? "").trim(),
      puAddr: (raw.PUAddr ?? "").trim(),
      puUnit: (raw["PU Unit"] ?? "").trim(),
      pickupCity: (raw.PickupCity ?? "").trim(),
      puState: (raw.PUState ?? "").trim(),
      pickZip: (raw.PickZip ?? "").trim(),
      doAddr: (raw.DOAddr ?? "").trim(),
      doUnit: (raw["DO Unit"] ?? "").trim(),
      dropCity: (raw.DropCity ?? "").trim(),
      doState: (raw.DOState ?? "").trim(),
      dropZip: (raw.DropZip ?? "").trim(),
      assistiveDevice: (raw["Assistive Device"] ?? "").trim(),
      nTotalWheelChairs: parseInt(raw.nTotalWheelChairs, 10) || 0,
      nTotalPassengers: parseInt(raw.nTotalPassengers, 10) || 0,
      schPU: (raw.SchPU ?? "").trim(),
      aptTime: (raw.AptTime ?? "").trim(),
      notes: (raw.Notes ?? "").trim(),
      jobID,
      legType: deriveLegType(jobID),
    });
  }

  return { rows, errors };
}
