import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { DetectionResponse, InputCsvRow, OutputCsvRow } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const SOURCE_CSV_PATH = path.join(ROOT_DIR, "source.csv");
const RESULT_CSV_PATH = path.join(ROOT_DIR, "result.csv");

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://127.0.0.1:8000/detect";

const CDN_BASE_URL =
  process.env.CDN_BASE_URL || "https://cdn.ballwool.com/products/s";

function formatPercent(score?: number | null): string {
  if (score === undefined || score === null || Number.isNaN(score)) {
    return "";
  }

  return (score * 100).toFixed(2);
}

function guessMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function readInputCsv(filePath: string): Promise<InputCsvRow[]> {
  const raw = await fs.readFile(filePath, "utf8");

  const records = parse(raw, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];

  const rows: InputCsvRow[] = [];

  for (const record of records) {
    const id = record[0]?.trim();
    const fileName = record[1]?.trim();

    if (!id || !fileName) {
      continue;
    }

    rows.push({ id, fileName });
  }

  return rows;
}

async function downloadImage(fileName: string): Promise<{
  arrayBuffer: ArrayBuffer;
  contentType: string;
}> {
  const url = `${CDN_BASE_URL}/${encodeURIComponent(fileName)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") || guessMimeType(fileName);

  return {
    arrayBuffer,
    contentType,
  };
}

async function sendToPython(
  fileName: string,
  arrayBuffer: ArrayBuffer,
  contentType: string,
): Promise<DetectionResponse> {
  const formData = new FormData();

  const blob = new Blob([arrayBuffer], { type: contentType });
  formData.append("image", blob, fileName);

  const response = await fetch(PYTHON_API_URL, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as DetectionResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Python service returned ${response.status}`);
  }

  return data;
}

async function processRow(row: InputCsvRow): Promise<OutputCsvRow> {
  const { id, fileName } = row;

  const image = await downloadImage(fileName);
  const detection = await sendToPython(
    fileName,
    image.arrayBuffer,
    image.contentType,
  );

  return {
    id,
    file_name: fileName,
    ai_generated_percent: formatPercent(detection.aiScore),
  };
}

async function main() {
  console.log("Source CSV:", SOURCE_CSV_PATH);
  console.log("Result CSV:", RESULT_CSV_PATH);
  console.log("Python API:", PYTHON_API_URL);
  console.log("CDN base:", CDN_BASE_URL);

  const rows = await readInputCsv(SOURCE_CSV_PATH);

  if (rows.length === 0) {
    throw new Error("No rows found in source.csv");
  }

  console.log(`Found ${rows.length} rows`);

  const resultRows: OutputCsvRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    console.log(`[${index + 1}/${rows.length}] Processing ${row.fileName}`);

    try {
      const result = await processRow(row);
      resultRows.push(result);
      console.log(`  OK | AI: ${result.ai_generated_percent}%`);
    } catch (error) {
      console.log(
        `  ERROR | ${error instanceof Error ? error.message : "Unknown error"}`,
      );

      resultRows.push({
        id: row.id,
        file_name: row.fileName,
        ai_generated_percent: "",
      });
    }
  }

  const csv = stringify(resultRows, {
    header: false,
    columns: ["id", "file_name", "ai_generated_percent"],
  });

  await fs.writeFile(RESULT_CSV_PATH, csv, "utf8");

  console.log("Done.");
  console.log("Saved result CSV:", RESULT_CSV_PATH);
}

main().catch((error) => {
  console.error("Batch process failed:", error);
  process.exit(1);
});
