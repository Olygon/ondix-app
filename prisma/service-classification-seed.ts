import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

import type { EntityStatus, PrismaClient } from "@prisma/client";

type XlsxRow = Record<string, string>;

type ZipEntry = {
  compressedSize: number;
  localHeaderOffset: number;
  method: number;
  name: string;
};

type ServiceClassificationSeedSummary = {
  law116Codes: number;
  municipalTaxCodes: number;
  municipalTaxDuplicates: number;
  nbsCodes: number;
};

type ServiceLaw116CodeImport = {
  category: string | null;
  cTribNac: string;
  description: string;
  requiresConstruction: boolean;
  requiresEvent: boolean;
  requiresProperty: boolean;
  status: EntityStatus;
};

type ServiceNbsCodeImport = {
  category: string | null;
  code: string;
  description: string;
  status: EntityStatus;
};

type MunicipalTaxCodeImport = {
  cTribMun: string;
  defaultIssRate: string;
  description: string;
  municipalityIbgeCode: string;
  municipalityName: string;
  stateCode: string;
  status: EntityStatus;
};

const publicDirectory = path.join(process.cwd(), "public");

const sourceFiles = {
  law116: path.join(publicDirectory, "Tabela-lei-116.xlsx"),
  municipalTax: path.join(publicDirectory, "Lista-cTribMun.xlsx"),
  nbs: path.join(publicDirectory, "Tabela-NBS.xlsx"),
};

const municipalityIbgeCodeByCityState = new Map([
  ["DF|BRASILIA", "5300108"],
]);

function findEndOfCentralDirectory(buffer: Buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Arquivo XLSX invalido: diretorio central do ZIP nao localizado.");
}

function readZipEntries(filePath: string) {
  if (!existsSync(filePath)) {
    throw new Error(`Planilha nao localizada: ${filePath}`);
  }

  const fileBuffer = readFileSync(filePath);
  const endOfCentralDirectoryOffset = findEndOfCentralDirectory(fileBuffer);
  const entryCount = fileBuffer.readUInt16LE(endOfCentralDirectoryOffset + 10);
  let centralDirectoryOffset = fileBuffer.readUInt32LE(endOfCentralDirectoryOffset + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    if (fileBuffer.readUInt32LE(centralDirectoryOffset) !== 0x02014b50) {
      throw new Error("Arquivo XLSX invalido: cabecalho central do ZIP inesperado.");
    }

    const entry: ZipEntry = {
      compressedSize: fileBuffer.readUInt32LE(centralDirectoryOffset + 20),
      localHeaderOffset: fileBuffer.readUInt32LE(centralDirectoryOffset + 42),
      method: fileBuffer.readUInt16LE(centralDirectoryOffset + 10),
      name: fileBuffer
        .subarray(
          centralDirectoryOffset + 46,
          centralDirectoryOffset + 46 + fileBuffer.readUInt16LE(centralDirectoryOffset + 28),
        )
        .toString("utf8"),
    };
    const fileNameLength = fileBuffer.readUInt16LE(centralDirectoryOffset + 28);
    const extraLength = fileBuffer.readUInt16LE(centralDirectoryOffset + 30);
    const commentLength = fileBuffer.readUInt16LE(centralDirectoryOffset + 32);

    centralDirectoryOffset += 46 + fileNameLength + extraLength + commentLength;

    if (fileBuffer.readUInt32LE(entry.localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Arquivo XLSX invalido: cabecalho local ausente para ${entry.name}.`);
    }

    const localFileNameLength = fileBuffer.readUInt16LE(entry.localHeaderOffset + 26);
    const localExtraLength = fileBuffer.readUInt16LE(entry.localHeaderOffset + 28);
    const dataStart = entry.localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = fileBuffer.subarray(dataStart, dataStart + entry.compressedSize);
    const data =
      entry.method === 0
        ? compressedData
        : entry.method === 8
          ? inflateRawSync(compressedData)
          : null;

    if (!data) {
      throw new Error(`Metodo de compressao ZIP nao suportado em ${entry.name}: ${entry.method}`);
    }

    entries.set(entry.name, data);
  }

  return entries;
}

function readZipEntryText(entries: Map<string, Buffer>, entryName: string) {
  const entry = entries.get(entryName);

  if (!entry) {
    throw new Error(`Entrada ${entryName} nao encontrada na planilha XLSX.`);
  }

  return entry.toString("utf8");
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function decodeExcelEscapes(value: string) {
  return value.replace(/_x([0-9a-f]{4})_/gi, (_, code: string) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );
}

function normalizeCellText(value: string) {
  return decodeExcelEscapes(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAttribute(tagAttributes: string, attributeName: string) {
  const match = tagAttributes.match(new RegExp(`${attributeName}="([^"]*)"`));

  return match ? decodeXml(match[1]) : "";
}

function extractTextNodes(xml: string) {
  return Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
    .map((match) => decodeXml(match[1]))
    .join("");
}

function readSharedStrings(entries: Map<string, Buffer>) {
  if (!entries.has("xl/sharedStrings.xml")) {
    return [];
  }

  const sharedStringsXml = readZipEntryText(entries, "xl/sharedStrings.xml");

  return Array.from(sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match) =>
    normalizeCellText(extractTextNodes(match[1])),
  );
}

function getColumnReference(cellReference: string) {
  const match = cellReference.match(/^[A-Z]+/i);

  return match?.[0].toUpperCase() ?? "";
}

function readCellValue(cellAttributes: string, cellXml: string, sharedStrings: string[]) {
  const type = extractAttribute(cellAttributes, "t");

  if (type === "inlineStr") {
    return normalizeCellText(extractTextNodes(cellXml));
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);

  if (!valueMatch) {
    return "";
  }

  const rawValue = decodeXml(valueMatch[1]);

  if (type === "s") {
    const sharedString = sharedStrings[Number(rawValue)];

    return normalizeCellText(sharedString ?? "");
  }

  return normalizeCellText(rawValue);
}

function readFirstWorksheetRows(filePath: string) {
  const entries = readZipEntries(filePath);
  const sharedStrings = readSharedStrings(entries);
  const sheetXml = readZipEntryText(entries, "xl/worksheets/sheet1.xml");
  const rows: XlsxRow[] = [];

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: XlsxRow = {};

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const columnReference = getColumnReference(extractAttribute(cellMatch[1], "r"));

      if (!columnReference) {
        continue;
      }

      row[columnReference] = readCellValue(cellMatch[1], cellMatch[2], sharedStrings);
    }

    if (Object.values(row).some(Boolean)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeRequiredValue(value: string | undefined, fieldName: string) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    throw new Error(`Campo obrigatorio ausente na importacao: ${fieldName}`);
  }

  return normalized;
}

function normalizeOptionalValue(value: string | undefined) {
  const normalized = value?.trim() ?? "";

  return normalized || null;
}

function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function parseStatus(value: string | undefined): EntityStatus {
  const normalized = normalizeLookupKey(value ?? "");

  if (normalized === "ATIVO" || normalized === "ACTIVE") {
    return "ACTIVE";
  }

  if (normalized === "INATIVO" || normalized === "INACTIVE") {
    return "INACTIVE";
  }

  throw new Error(`Status desconhecido na importacao: ${value ?? ""}`);
}

function parseStatusOrActive(value: string | undefined): EntityStatus {
  const normalized = normalizeLookupKey(value ?? "");

  if (normalized === "INATIVO" || normalized === "INACTIVE") {
    return "INACTIVE";
  }

  return "ACTIVE";
}

function parseBooleanFlag(value: string | undefined) {
  const normalized = normalizeLookupKey(value ?? "");

  return normalized === "SIM" || normalized === "S" || normalized === "TRUE" || normalized === "1";
}

function parseDecimalInput(value: string | undefined) {
  const rawValue = normalizeRequiredValue(value, "valor decimal");
  const normalized =
    rawValue.includes(",") && rawValue.includes(".")
      ? rawValue.replace(/\./g, "").replace(",", ".")
      : rawValue.replace(",", ".");
  const decimal = Number(normalized);

  if (!Number.isFinite(decimal)) {
    throw new Error(`Valor decimal invalido na importacao: ${rawValue}`);
  }

  return decimal;
}

function formatDecimal(decimal: number) {
  return decimal.toFixed(4).replace(/\.?0+$/, "") || "0";
}

function parseIssRate(value: string | undefined) {
  const decimal = parseDecimalInput(value);
  const percentValue = decimal > 0 && decimal <= 1 ? decimal * 100 : decimal;

  return formatDecimal(percentValue);
}

function resolveMunicipalityIbgeCode(city: string, stateCode: string) {
  const key = `${normalizeLookupKey(stateCode)}|${normalizeLookupKey(city)}`;
  const ibgeCode = municipalityIbgeCodeByCityState.get(key);

  if (!ibgeCode) {
    throw new Error(`Codigo IBGE municipal nao mapeado para ${city}/${stateCode}.`);
  }

  return ibgeCode;
}

function withoutHeader(rows: XlsxRow[]) {
  return rows.slice(1);
}

function parseServiceLaw116Codes(): ServiceLaw116CodeImport[] {
  return withoutHeader(readFirstWorksheetRows(sourceFiles.law116)).map((row) => ({
    category: normalizeOptionalValue(row.B),
    cTribNac: normalizeRequiredValue(row.A, "Codigo Nacional"),
    description: normalizeRequiredValue(row.C, "Descricao Lei 116"),
    requiresConstruction: parseBooleanFlag(row.E),
    requiresEvent: parseBooleanFlag(row.F),
    requiresProperty: parseBooleanFlag(row.G),
    status: parseStatus(row.D),
  }));
}

function parseServiceNbsCodes(): ServiceNbsCodeImport[] {
  return withoutHeader(readFirstWorksheetRows(sourceFiles.nbs)).map((row) => ({
    category: normalizeOptionalValue(row.B),
    code: normalizeRequiredValue(row.A, "Codigo NBS"),
    description: normalizeRequiredValue(row.D, "Descricao NBS"),
    status: parseStatusOrActive(row.C),
  }));
}

function parseMunicipalTaxCodes() {
  const importedCodes = withoutHeader(readFirstWorksheetRows(sourceFiles.municipalTax)).map(
    (row): MunicipalTaxCodeImport => {
      const stateCode = normalizeRequiredValue(row.F, "UF").toUpperCase();
      const city = normalizeRequiredValue(row.E, "Cidade");

      return {
        cTribMun: normalizeRequiredValue(row.A, "CodigoTribMun"),
        defaultIssRate: parseIssRate(row.C),
        description: normalizeRequiredValue(row.B, "Descricao cTribMun"),
        municipalityIbgeCode: resolveMunicipalityIbgeCode(city, stateCode),
        municipalityName: city,
        stateCode,
        status: parseStatus(row.D),
      };
    },
  );
  const uniqueCodes = new Map<string, MunicipalTaxCodeImport>();

  for (const code of importedCodes) {
    const key = `${code.municipalityIbgeCode}|${code.cTribMun}`;

    if (!uniqueCodes.has(key)) {
      uniqueCodes.set(key, code);
    }
  }

  return {
    codes: Array.from(uniqueCodes.values()),
    duplicateCount: importedCodes.length - uniqueCodes.size,
  };
}

async function runInChunks<T>(
  items: T[],
  chunkSize: number,
  handler: (item: T) => Promise<unknown>,
) {
  for (let index = 0; index < items.length; index += chunkSize) {
    await Promise.all(items.slice(index, index + chunkSize).map(handler));
  }
}

export async function seedServiceClassificationTables(
  prisma: PrismaClient,
): Promise<ServiceClassificationSeedSummary> {
  const law116Codes = parseServiceLaw116Codes();
  const nbsCodes = parseServiceNbsCodes();
  const municipalTax = parseMunicipalTaxCodes();

  await runInChunks(law116Codes, 100, (code) =>
    prisma.serviceLaw116Code.upsert({
      create: code,
      update: {
        category: code.category,
        description: code.description,
        requiresConstruction: code.requiresConstruction,
        requiresEvent: code.requiresEvent,
        requiresProperty: code.requiresProperty,
        status: code.status,
      },
      where: { cTribNac: code.cTribNac },
    }),
  );

  await runInChunks(nbsCodes, 100, (code) =>
    prisma.serviceNbsCode.upsert({
      create: code,
      update: {
        category: code.category,
        description: code.description,
        status: code.status,
      },
      where: { code: code.code },
    }),
  );

  await runInChunks(municipalTax.codes, 100, (code) =>
    prisma.municipalTaxCode.upsert({
      create: {
        cTribMun: code.cTribMun,
        defaultIssRate: code.defaultIssRate,
        description: code.description,
        municipalityIbgeCode: code.municipalityIbgeCode,
        municipalityName: code.municipalityName,
        stateCode: code.stateCode,
        status: code.status,
      },
      update: {
        defaultIssRate: code.defaultIssRate,
        description: code.description,
        municipalityName: code.municipalityName,
        stateCode: code.stateCode,
        status: code.status,
      },
      where: {
        municipalityIbgeCode_cTribMun: {
          cTribMun: code.cTribMun,
          municipalityIbgeCode: code.municipalityIbgeCode,
        },
      },
    }),
  );

  return {
    law116Codes: law116Codes.length,
    municipalTaxCodes: municipalTax.codes.length,
    municipalTaxDuplicates: municipalTax.duplicateCount,
    nbsCodes: nbsCodes.length,
  };
}
