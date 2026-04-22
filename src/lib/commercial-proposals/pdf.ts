import "server-only";

import type { CommercialProposalPdfPayload } from "@/lib/commercial-proposals/service";

type PdfPage = {
  commands: string[];
};

const pageWidth = 595;
const pageHeight = 842;
const marginX = 42;
const bottomMargin = 56;

function stripPdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return stripPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxLength: number) {
  const words = stripPdfText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function textCommand(input: {
  bold?: boolean;
  color?: string;
  fontSize: number;
  text: string;
  x: number;
  y: number;
}) {
  const font = input.bold ? "F2" : "F1";

  return `${input.color ?? "0.08 0.10 0.14 rg"} BT /${font} ${input.fontSize} Tf ${input.x} ${input.y} Td (${escapePdfText(input.text)}) Tj ET`;
}

function rectCommand(input: {
  color: string;
  height: number;
  width: number;
  x: number;
  y: number;
}) {
  return `${input.color} ${input.x} ${input.y} ${input.width} ${input.height} re f`;
}

function lineCommand(input: {
  color?: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}) {
  return `${input.color ?? "0.82 0.84 0.87 RG"} ${input.fromX} ${input.fromY} m ${input.toX} ${input.toY} l S`;
}

function buildPages(payload: CommercialProposalPdfPayload) {
  const pages: PdfPage[] = [];
  let currentPage: PdfPage = { commands: [] };
  let y = 0;

  function startPage() {
    currentPage = { commands: [] };
    pages.push(currentPage);
    y = pageHeight - 52;
    currentPage.commands.push(rectCommand({
      color: "0.95 0.29 0 rg",
      height: 6,
      width: pageWidth,
      x: 0,
      y: pageHeight - 6,
    }));
    currentPage.commands.push(textCommand({
      bold: true,
      fontSize: 18,
      text: "ONDIX",
      x: marginX,
      y,
    }));
    currentPage.commands.push(textCommand({
      fontSize: 9,
      text: payload.company.name,
      x: marginX,
      y: y - 16,
    }));
    currentPage.commands.push(textCommand({
      bold: true,
      fontSize: 14,
      text: `Proposta Comercial ${payload.proposal.code}`,
      x: 330,
      y,
    }));
    currentPage.commands.push(textCommand({
      fontSize: 9,
      text: `Emissao ${payload.proposal.issueDate} | Validade ${payload.proposal.validUntil}`,
      x: 330,
      y: y - 16,
    }));
    y -= 48;
    currentPage.commands.push(lineCommand({
      fromX: marginX,
      fromY: y,
      toX: pageWidth - marginX,
      toY: y,
    }));
    y -= 24;
  }

  function ensureSpace(height: number) {
    if (y - height < bottomMargin) {
      startPage();
    }
  }

  function addText(text: string, options?: { bold?: boolean; fontSize?: number; indent?: number }) {
    ensureSpace(16);
    currentPage.commands.push(textCommand({
      bold: options?.bold,
      fontSize: options?.fontSize ?? 9,
      text,
      x: marginX + (options?.indent ?? 0),
      y,
    }));
    y -= (options?.fontSize ?? 9) + 6;
  }

  function addSection(title: string) {
    ensureSpace(28);
    y -= 4;
    currentPage.commands.push(textCommand({
      bold: true,
      fontSize: 11,
      text: title,
      x: marginX,
      y,
    }));
    y -= 18;
  }

  function addKeyValue(label: string, value: string, x: number, width = 220) {
    currentPage.commands.push(textCommand({
      bold: true,
      fontSize: 8,
      text: label,
      x,
      y,
    }));
    currentPage.commands.push(textCommand({
      fontSize: 9,
      text: value || "-",
      x,
      y: y - 13,
    }));
    return width;
  }

  startPage();

  addSection("Empresa");
  ensureSpace(38);
  addKeyValue("Razao social", payload.company.legalName, marginX, 250);
  addKeyValue("CNPJ", payload.company.taxId, marginX + 270, 120);
  addKeyValue("Contato", [payload.company.email, payload.company.phone].filter(Boolean).join(" | "), marginX + 400, 130);
  y -= 36;
  addText(
    [payload.company.street, payload.company.city, payload.company.stateCode]
      .filter(Boolean)
      .join(" - "),
  );

  addSection("Cliente");
  ensureSpace(38);
  addKeyValue("Cliente", payload.customer.name, marginX, 250);
  addKeyValue("Documento", payload.customer.document, marginX + 270, 120);
  addKeyValue("Contato", [payload.customer.email, payload.customer.phone].filter(Boolean).join(" | "), marginX + 400, 130);
  y -= 36;
  addText(
    [payload.customer.street, payload.customer.city, payload.customer.stateCode]
      .filter(Boolean)
      .join(" - "),
  );

  addSection("Itens");
  ensureSpace(34);
  currentPage.commands.push(rectCommand({
    color: "0.96 0.97 0.98 rg",
    height: 18,
    width: pageWidth - marginX * 2,
    x: marginX,
    y: y - 4,
  }));
  currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: "Codigo", x: marginX + 6, y }));
  currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: "Descricao", x: marginX + 72, y }));
  currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: "Qtd", x: marginX + 322, y }));
  currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: "Unitario", x: marginX + 365, y }));
  currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: "Desconto", x: marginX + 430, y }));
  currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: "Total", x: marginX + 492, y }));
  y -= 24;

  payload.items.forEach((item) => {
    const descriptionLines = wrapText(item.description, 50);
    const rowHeight = Math.max(20, descriptionLines.length * 11 + 8);

    ensureSpace(rowHeight);
    currentPage.commands.push(textCommand({ fontSize: 8, text: item.code, x: marginX + 6, y }));
    descriptionLines.forEach((line, index) => {
      currentPage.commands.push(textCommand({
        fontSize: 8,
        text: line,
        x: marginX + 72,
        y: y - index * 11,
      }));
    });
    currentPage.commands.push(textCommand({ fontSize: 8, text: item.quantity, x: marginX + 322, y }));
    currentPage.commands.push(textCommand({ fontSize: 8, text: item.unitPrice, x: marginX + 365, y }));
    currentPage.commands.push(textCommand({ fontSize: 8, text: item.discountAmount, x: marginX + 430, y }));
    currentPage.commands.push(textCommand({ bold: true, fontSize: 8, text: item.totalAmount, x: marginX + 492, y }));
    y -= rowHeight;
    currentPage.commands.push(lineCommand({
      color: "0.89 0.90 0.92 RG",
      fromX: marginX,
      fromY: y + 4,
      toX: pageWidth - marginX,
      toY: y + 4,
    }));
  });

  addSection("Totais e condicoes comerciais");
  ensureSpace(116);
  addKeyValue("Subtotal", payload.proposal.subtotalAmount, marginX);
  addKeyValue("Descontos", payload.proposal.totalDiscountAmount, marginX + 140);
  addKeyValue("Entrega", payload.proposal.deliveryCostAmount, marginX + 280);
  addKeyValue("Material", payload.proposal.materialCostAmount, marginX + 420);
  y -= 36;
  addKeyValue("Outros valores", payload.proposal.otherCostAmount, marginX);
  addKeyValue("Forma de pagamento", payload.proposal.paymentMethod, marginX + 140);
  addKeyValue("Entrada", payload.proposal.downPaymentAmount, marginX + 280);
  addKeyValue("Prazo de entrega", payload.proposal.deliveryDeadline || "-", marginX + 420);
  y -= 44;
  currentPage.commands.push(rectCommand({
    color: "0.08 0.10 0.14 rg",
    height: 34,
    width: pageWidth - marginX * 2,
    x: marginX,
    y: y - 8,
  }));
  currentPage.commands.push(textCommand({
    bold: true,
    color: "1 1 1 rg",
    fontSize: 11,
    text: "Valor total final",
    x: marginX + 14,
    y: y + 4,
  }));
  currentPage.commands.push(textCommand({
    bold: true,
    color: "1 1 1 rg",
    fontSize: 15,
    text: payload.proposal.totalAmount,
    x: pageWidth - marginX - 130,
    y: y + 2,
  }));
  y -= 52;

  if (payload.proposal.notes) {
    addSection("Observacoes");
    wrapText(payload.proposal.notes, 92).forEach((line) => addText(line));
  }

  pages.forEach((page, index) => {
    page.commands.push(textCommand({
      fontSize: 8,
      text: `Pagina ${index + 1} de ${pages.length} | Gerado pelo ONDIX`,
      x: marginX,
      y: 28,
    }));
  });

  return pages;
}

export function buildCommercialProposalPdf(payload: CommercialProposalPdfPayload) {
  const pages = buildPages(payload);
  const objects: string[] = [];

  function addObject(content: string) {
    objects.push(content);
    return objects.length;
  }

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  void catalogId;
  addObject("PAGES_PLACEHOLDER");
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  for (const page of pages) {
    const stream = page.commands.join("\n");
    const contentId = addObject(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
    const pageId = addObject(
      [
        "<< /Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${pageWidth} ${pageHeight}]`,
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`,
        `/Contents ${contentId} 0 R`,
        ">>",
      ].join(" "),
    );

    pageIds.push(pageId);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pageIds.length} >>`;

  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "latin1"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(output, "latin1");

  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, "latin1");
}
