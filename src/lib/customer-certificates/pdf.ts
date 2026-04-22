import "server-only";

import { inflateSync } from "node:zlib";
import type {
  CertificateConfidenceLevel,
  CertificateProcessingStatus,
  CustomerCertificateSituation,
  CustomerCertificateStatus,
} from "@prisma/client";

export type CertificatePdfAnalysis = {
  certificateType: string | null;
  confidenceLevel: CertificateConfidenceLevel;
  detectedSituation: CustomerCertificateSituation;
  expirationDate: Date | null;
  extractedText: string;
  issueDate: Date | null;
  issuingAgency: string | null;
  processStatus: CertificateProcessingStatus;
  status: CustomerCertificateStatus;
};

type PdfStream = {
  content: string;
  decoded: boolean;
  dictionary: string;
};

type PdfTextToken = {
  bytes: Buffer;
  fallbackText: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sanitizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
}

function decodePdfLiteral(value: string) {
  const content = value.slice(1, -1);

  return content
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function textToByteBuffer(value: string) {
  return Buffer.from(
    Array.from(value, (char) => char.charCodeAt(0) & 0xff),
  );
}

function normalizeHex(value: string) {
  const hex = value.replace(/[<>\s]/g, "");

  return hex.length % 2 === 0 ? hex : `${hex}0`;
}

function decodeUtf16BeBuffer(bytes: Buffer) {
  const chars: string[] = [];

  for (let index = 0; index + 1 < bytes.length; index += 2) {
    chars.push(String.fromCharCode(bytes.readUInt16BE(index)));
  }

  return chars.join("");
}

function decodeHexString(value: string) {
  const hex = normalizeHex(value);

  if (hex.length < 4 || hex.length % 2 !== 0) {
    return "";
  }

  const bytes = Buffer.from(hex, "hex");
  const hasUtf16Pattern =
    bytes.length >= 4 &&
    bytes.length % 2 === 0 &&
    bytes.filter((byte, index) => index % 2 === 0 && byte === 0).length >=
      Math.floor(bytes.length / 3);

  if (hasUtf16Pattern) {
    return decodeUtf16BeBuffer(bytes);
  }

  return bytes.toString("utf8");
}

function getPdfStreams(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const streams: PdfStream[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(source))) {
    const streamText = match[1];
    const dictionaryStart = source.lastIndexOf("<<", match.index);
    const dictionaryEnd = source.lastIndexOf(">>", match.index);
    const dictionary =
      dictionaryStart >= 0 && dictionaryEnd > dictionaryStart
        ? source.slice(dictionaryStart, dictionaryEnd + 2)
        : source.slice(Math.max(0, match.index - 700), match.index);
    const streamBuffer = Buffer.from(streamText, "latin1");

    streams.push({
      content: streamText,
      decoded: !dictionary.includes("/FlateDecode"),
      dictionary,
    });

    if (dictionary.includes("/FlateDecode")) {
      try {
        streams.push({
          content: inflateSync(streamBuffer).toString("latin1"),
          decoded: true,
          dictionary,
        });
      } catch {
        // PDFs vary by producer. When a stream cannot be inflated, the raw
        // stream is still kept for lightweight keyword extraction.
      }
    }
  }

  return streams;
}

function hexToNumber(value: string) {
  const hex = value.replace(/\s/g, "");

  return hex ? Number.parseInt(hex, 16) : Number.NaN;
}

function decodeUnicodeHex(value: string) {
  const hex = normalizeHex(value);

  if (hex.length < 4) {
    return "";
  }

  return decodeUtf16BeBuffer(Buffer.from(hex, "hex"));
}

function addCMapRange(input: {
  endCode: number;
  map: Map<number, string>;
  startCode: number;
  startUnicode: number;
}) {
  const rangeSize = input.endCode - input.startCode;

  if (
    rangeSize < 0 ||
    rangeSize > 4096 ||
    !Number.isFinite(input.startUnicode)
  ) {
    return;
  }

  for (let offset = 0; offset <= rangeSize; offset += 1) {
    input.map.set(
      input.startCode + offset,
      String.fromCharCode(input.startUnicode + offset),
    );
  }
}

function addCMapArrayRange(input: {
  endCode: number;
  map: Map<number, string>;
  startCode: number;
  values: string;
}) {
  const values = Array.from(
    input.values.matchAll(/<([0-9A-Fa-f\s]+)>/g),
    (match) => match[1],
  );
  const rangeSize = input.endCode - input.startCode;

  if (rangeSize < 0 || values.length === 0) {
    return;
  }

  for (let offset = 0; offset <= rangeSize && offset < values.length; offset += 1) {
    input.map.set(input.startCode + offset, decodeUnicodeHex(values[offset]));
  }
}

function parseCMap(content: string) {
  const map = new Map<number, string>();
  const bfCharSections = content.matchAll(
    /beginbfchar([\s\S]*?)endbfchar/g,
  );
  const bfRangeSections = content.matchAll(
    /beginbfrange([\s\S]*?)endbfrange/g,
  );

  for (const section of bfCharSections) {
    const entryRegex = /<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>/g;
    let entry: RegExpExecArray | null;

    while ((entry = entryRegex.exec(section[1]))) {
      const sourceCode = hexToNumber(entry[1]);
      const targetText = decodeUnicodeHex(entry[2]);

      if (Number.isFinite(sourceCode) && targetText) {
        map.set(sourceCode, targetText);
      }
    }
  }

  for (const section of bfRangeSections) {
    const entryRegex =
      /<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>\s*(?:<([0-9A-Fa-f\s]+)>|\[([\s\S]*?)\])/g;
    let entry: RegExpExecArray | null;

    while ((entry = entryRegex.exec(section[1]))) {
      const startCode = hexToNumber(entry[1]);
      const endCode = hexToNumber(entry[2]);

      if (!Number.isFinite(startCode) || !Number.isFinite(endCode)) {
        continue;
      }

      if (entry[3]) {
        addCMapRange({
          endCode,
          map,
          startCode,
          startUnicode: hexToNumber(entry[3]),
        });
      } else if (entry[4]) {
        addCMapArrayRange({
          endCode,
          map,
          startCode,
          values: entry[4],
        });
      }
    }
  }

  return map;
}

function buildUnicodeMap(streams: PdfStream[]) {
  const unicodeMap = new Map<number, string>();

  for (const stream of streams) {
    if (
      !stream.content.includes("begincmap") &&
      !stream.content.includes("beginbfchar") &&
      !stream.content.includes("beginbfrange")
    ) {
      continue;
    }

    for (const [code, value] of parseCMap(stream.content)) {
      unicodeMap.set(code, value);
    }
  }

  return unicodeMap;
}

function decodeMappedBytes(bytes: Buffer, unicodeMap: Map<number, string>) {
  if (unicodeMap.size === 0 || bytes.length === 0) {
    return "";
  }

  const mappedText: string[] = [];
  let hits = 0;
  let misses = 0;

  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = bytes.readUInt16BE(index);
    const mappedChar = unicodeMap.get(code);

    if (mappedChar) {
      hits += 1;
      mappedText.push(mappedChar);
    } else {
      misses += 1;
      mappedText.push(String.fromCharCode(code));
    }
  }

  if (hits > 0 && hits >= misses) {
    return mappedText.join("");
  }

  const singleByteText: string[] = [];

  hits = 0;
  misses = 0;

  for (const byte of bytes) {
    const mappedChar = unicodeMap.get(byte);

    if (mappedChar) {
      hits += 1;
      singleByteText.push(mappedChar);
    } else {
      misses += 1;
      singleByteText.push(String.fromCharCode(byte));
    }
  }

  return hits > 0 && hits >= misses ? singleByteText.join("") : "";
}

function decodePdfTextToken(
  token: PdfTextToken,
  unicodeMap: Map<number, string>,
) {
  return decodeMappedBytes(token.bytes, unicodeMap) || token.fallbackText;
}

function getLiteralTextToken(value: string): PdfTextToken {
  const fallbackText = decodePdfLiteral(value);

  return {
    bytes: textToByteBuffer(fallbackText),
    fallbackText,
  };
}

function getHexTextToken(value: string): PdfTextToken {
  const hex = normalizeHex(value);

  return {
    bytes: Buffer.from(hex, "hex"),
    fallbackText: decodeHexString(value),
  };
}

function isExtractableTextStream(stream: PdfStream) {
  const content = stream.content;

  return (
    stream.decoded &&
    !stream.dictionary.includes("/Subtype /Image") &&
    !content.includes("begincmap") &&
    (/\bBT\b/.test(content) || /\bTj\b/.test(content) || /\bTJ\b/.test(content))
  );
}

function extractTextFromTextStream(
  stream: PdfStream,
  unicodeMap: Map<number, string>,
) {
  const extractedTexts: string[] = [];
  const content = stream.content;
  const literalOperatorRegex =
    /(\((?:\\[\s\S]|[^\\)])*\))\s*(?:Tj|'|")/g;
  const hexOperatorRegex = /(<[0-9A-Fa-f\s]{4,}>)\s*(?:Tj|'|")/g;
  const arrayOperatorRegex = /\[([\s\S]*?)\]\s*TJ/g;
  let match: RegExpExecArray | null;

  while ((match = literalOperatorRegex.exec(content))) {
    extractedTexts.push(
      decodePdfTextToken(getLiteralTextToken(match[1]), unicodeMap),
    );
  }

  while ((match = hexOperatorRegex.exec(content))) {
    extractedTexts.push(
      decodePdfTextToken(getHexTextToken(match[1]), unicodeMap),
    );
  }

  while ((match = arrayOperatorRegex.exec(content))) {
    const arrayContent = match[1];
    const tokenRegex = /(\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f\s]{4,}>)/g;
    let tokenMatch: RegExpExecArray | null;
    const arrayTexts: string[] = [];

    while ((tokenMatch = tokenRegex.exec(arrayContent))) {
      const token = tokenMatch[1].startsWith("(")
        ? getLiteralTextToken(tokenMatch[1])
        : getHexTextToken(tokenMatch[1]);

      arrayTexts.push(decodePdfTextToken(token, unicodeMap));
    }

    extractedTexts.push(arrayTexts.join(""));
  }

  return extractedTexts.join(" ");
}

export function extractTextFromPdfBuffer(buffer: Buffer) {
  const streams = getPdfStreams(buffer);
  const unicodeMap = buildUnicodeMap(streams);
  const extractedTexts = streams
    .filter(isExtractableTextStream)
    .map((stream) => extractTextFromTextStream(stream, unicodeMap))
    .filter(Boolean);
  const extracted = normalizeWhitespace(
    sanitizeExtractedText(extractedTexts.join(" ")),
  );

  if (extracted) {
    return extracted;
  }

  const fallbackTexts = streams
    .filter(isExtractableTextStream)
    .flatMap((stream) =>
      Array.from(
        stream.content.matchAll(/\((?:\\[\s\S]|[^\\)])*\)/g),
        ([value]) => decodePdfLiteral(value),
      ),
    );

  return normalizeWhitespace(sanitizeExtractedText(fallbackTexts.join(" ")));
}

function parseBrazilianDate(day: string, month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

function extractDates(text: string) {
  const dates = Array.from(
    text.matchAll(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/g),
    (match) => parseBrazilianDate(match[1], match[2], match[3]),
  ).filter((date): date is Date => Boolean(date));

  return {
    expirationDate: dates.length > 1 ? dates[dates.length - 1] : null,
    issueDate: dates[0] ?? null,
  };
}

function detectCertificateIdentity(lowerText: string) {
  if (
    lowerText.includes("procuradoria-geral da fazenda nacional") ||
    lowerText.includes("procuradoria geral da fazenda nacional") ||
    lowerText.includes("pgfn")
  ) {
    return {
      certificateType: "Certidao Receita Federal / PGFN",
      issuingAgency: "Receita Federal / PGFN",
    };
  }

  if (lowerText.includes("receita federal")) {
    return {
      certificateType: "Certidao Receita Federal",
      issuingAgency: "Receita Federal",
    };
  }

  if (lowerText.includes("fgts")) {
    return {
      certificateType: "Certidao FGTS",
      issuingAgency: "Caixa Economica Federal",
    };
  }

  if (lowerText.includes("trabalhista")) {
    return {
      certificateType: "Certidao Trabalhista",
      issuingAgency: "Tribunal Superior do Trabalho",
    };
  }

  return {
    certificateType: null,
    issuingAgency: null,
  };
}

function detectSituation(lowerText: string): CustomerCertificateSituation {
  if (
    lowerText.includes("positiva com efeitos de negativa") ||
    lowerText.includes("positiva com efeito de negativa")
  ) {
    return "POSITIVE_WITH_NEGATIVE_EFFECTS";
  }

  if (lowerText.includes("certidao positiva")) {
    return "POSITIVE";
  }

  if (lowerText.includes("certidao negativa")) {
    return "NEGATIVE";
  }

  return "UNKNOWN";
}

function getConfidenceLevel(score: number): CertificateConfidenceLevel {
  if (score >= 4) {
    return "HIGH";
  }

  if (score >= 2) {
    return "MEDIUM";
  }

  return "LOW";
}

function getCertificateStatus(input: {
  confidenceLevel: CertificateConfidenceLevel;
  detectedSituation: CustomerCertificateSituation;
  expirationDate: Date | null;
}): CustomerCertificateStatus {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  if (input.detectedSituation === "POSITIVE") {
    return "POSITIVE";
  }

  if (input.expirationDate && input.expirationDate < today) {
    return "EXPIRED";
  }

  if (input.confidenceLevel === "HIGH") {
    return "PROCESSED";
  }

  return "PENDING_VALIDATION";
}

export function analyzeCertificatePdf(buffer: Buffer): CertificatePdfAnalysis {
  const extractedText = extractTextFromPdfBuffer(buffer).slice(0, 120_000);
  const normalizedSearchText = normalizeForSearch(extractedText);
  const identity = detectCertificateIdentity(normalizedSearchText);
  const detectedSituation = detectSituation(normalizedSearchText);
  const dates = extractDates(extractedText);
  const score =
    Number(Boolean(identity.certificateType)) +
    Number(Boolean(identity.issuingAgency)) +
    Number(detectedSituation !== "UNKNOWN") +
    Number(Boolean(dates.issueDate)) +
    Number(Boolean(dates.expirationDate));
  const confidenceLevel = getConfidenceLevel(score);
  const status = getCertificateStatus({
    confidenceLevel,
    detectedSituation,
    expirationDate: dates.expirationDate,
  });
  const processStatus =
    extractedText.length === 0
      ? "FAILED"
      : confidenceLevel === "HIGH"
        ? "PROCESSED"
        : "PENDING_VALIDATION";

  return {
    ...identity,
    confidenceLevel,
    detectedSituation,
    extractedText,
    issueDate: dates.issueDate,
    expirationDate: dates.expirationDate,
    processStatus,
    status,
  };
}
