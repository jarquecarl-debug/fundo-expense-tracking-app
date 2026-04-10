import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Envelope } from "@/context/FundoContext";

export async function exportEnvelopeToPdf(envelope: Envelope): Promise<void> {
  const element = document.getElementById("envelope-pdf-root");
  if (!element) {
    // fallback: capture the whole main content area
    const main = document.querySelector("main") ?? document.body;
    await captureToPdf(main as HTMLElement, envelope.name);
    return;
  }
  await captureToPdf(element, envelope.name);
}

async function captureToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    // Ignore print:hidden elements
    ignoreElements: (el) => el.classList.contains("print:hidden"),
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const imgH = (canvas.height * usableW) / canvas.width;

  let y = margin;
  let remainingH = imgH;

  // Slice across multiple pages if content is long
  while (remainingH > 0) {
    const sliceH = Math.min(remainingH, pageH - margin * 2);
    const srcY = ((imgH - remainingH) / imgH) * canvas.height;
    const srcH = (sliceH / imgH) * canvas.height;

    // Create a slice canvas
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = srcH;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    if (y > margin) {
      pdf.addPage();
      y = margin;
    }

    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, y, usableW, sliceH);
    remainingH -= sliceH;
  }

  const safeFilename = filename.replace(/[^a-z0-9\s-]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
  pdf.save(`${safeFilename}-fundo.pdf`);
}