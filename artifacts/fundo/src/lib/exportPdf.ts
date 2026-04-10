import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { Envelope } from "@/context/FundoContext";

export async function exportEnvelopeToPdf(envelope: Envelope): Promise<void> {
  const element = document.getElementById("envelope-pdf-root") 
    ?? document.querySelector("main") as HTMLElement 
    ?? document.body;
  await captureToPdf(element as HTMLElement, envelope.name);
}

async function captureToPdf(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    filter: (el) => !el.classList?.contains("print:hidden"),
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise((res) => (img.onload = res));

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const imgH = (img.naturalHeight * usableW) / img.naturalWidth;

  let remainingH = imgH;
  let srcYmm = 0;

  while (remainingH > 0) {
    const sliceH = Math.min(remainingH, pageH - margin * 2);
    if (srcYmm > 0) pdf.addPage();
    pdf.addImage(dataUrl, "PNG", margin, margin, usableW, imgH, "", "FAST", 0);
    srcYmm += sliceH;
    remainingH -= sliceH;
  }

  const safeFilename = filename.replace(/[^a-z0-9\s-]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
  pdf.save(`${safeFilename}-fundo.pdf`);
}