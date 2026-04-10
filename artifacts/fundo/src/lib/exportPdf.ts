import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { Envelope } from "@/context/FundoContext";

export async function exportEnvelopeToPdf(envelope: Envelope): Promise<void> {
  const element = (document.getElementById("envelope-pdf-root") ??
    document.querySelector("main") ??
    document.body) as HTMLElement;
  
  // Use the inner container to avoid outer margin offsets
  const inner = element.querySelector(".max-w-4xl") as HTMLElement ?? element;
  await captureToPdf(inner, envelope.name);
}

async function captureToPdf(element: HTMLElement, filename: string): Promise<void> {
  // Temporarily expand to full scroll size
  const originalOverflow = element.style.overflow;
  element.style.overflow = "visible";

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
   width: Math.max(element.scrollWidth, element.offsetWidth, 1200),
    height: element.scrollHeight,
    style: {
      overflow: "visible",
      transform: "none",
      maxWidth: "none",
       width: "1200px",
    },
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
  const usableH = pageH - margin * 2;

  // Scale image to fit page width
  const scale = usableW / img.naturalWidth;
  const totalImgH = img.naturalHeight * scale; // total height in mm

  // How many px per page (in image coordinates)
  const pageHeightInPx = usableH / scale;
  const totalPages = Math.ceil(img.naturalHeight / pageHeightInPx);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const srcY = page * pageHeightInPx;
    const srcH = Math.min(pageHeightInPx, img.naturalHeight - srcY);

    // Create a slice canvas
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = img.naturalWidth;
    sliceCanvas.height = srcH;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, img.naturalWidth, srcH);

    const sliceData = sliceCanvas.toDataURL("image/png");
    const sliceH = srcH * scale;
    pdf.addImage(sliceData, "PNG", margin, margin, usableW, sliceH);
  }

  const safeFilename = filename
    .replace(/[^a-z0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  pdf.save(`${safeFilename}-fundo.pdf`);
}