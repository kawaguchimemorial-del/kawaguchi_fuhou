async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) {
        return;
      }

      if ("decode" in image) {
        try {
          await image.decode();
          return;
        } catch {
          // Fall back to load/error events below.
        }
      }

      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }),
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inlineImagesAsDataUrls(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src") || image.currentSrc || image.src;

      if (!source || source.startsWith("data:")) {
        return;
      }

      try {
        const url = new URL(source, window.location.origin);
        const response = await fetch(url.toString(), { cache: "force-cache" });

        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        image.src = await blobToDataUrl(blob);
      } catch (error) {
        console.warn("Failed to inline image for PDF", source, error);
      }
    }),
  );
}

function fitImageToPage(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  const ratio = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const width = imageWidth * ratio;
  const height = imageHeight * ratio;

  return {
    width,
    height,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
  };
}

function addSlicedCanvasToPdf(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
) {
  const sliceHeight = Math.max(
    1,
    Math.floor(canvas.width * (pageHeight / pageWidth)),
  );
  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = canvas.width;
  const context = sliceCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create PDF canvas context.");
  }

  for (let y = 0; y < canvas.height; y += sliceHeight) {
    const currentSliceHeight = Math.min(sliceHeight, canvas.height - y);
    sliceCanvas.height = currentSliceHeight;
    context.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    context.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      currentSliceHeight,
      0,
      0,
      canvas.width,
      currentSliceHeight,
    );

    if (y > 0) {
      pdf.addPage();
    }

    const imageData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const drawHeight = Math.min(
      pageHeight,
      (currentSliceHeight / canvas.width) * pageWidth,
    );
    pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, drawHeight);
  }
}

export async function createPdfBlobFromElement(element: HTMLElement) {
  const pageElements = Array.from(
    element.querySelectorAll<HTMLElement>(".pdf-page"),
  );
  const pages = pageElements.length > 0 ? pageElements : [element];
  const shouldSliceLongPage = pageElements.length === 0;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (const [pageIndex, page] of pages.entries()) {
    await inlineImagesAsDataUrls(page);
    await waitForImages(page);

    const width = page.scrollWidth || 794;
    const height = page.scrollHeight || 1124;
    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      onclone: (clonedDocument, clonedElement) => {
        clonedDocument.documentElement.style.backgroundColor = "#ffffff";
        clonedDocument.body.style.margin = "0";
        clonedDocument.body.style.backgroundColor = "#ffffff";
        clonedDocument.body.style.color = "#0f172a";
        clonedDocument.body.replaceChildren(clonedElement);

        clonedElement.style.position = "static";
        clonedElement.style.left = "auto";
        clonedElement.style.top = "auto";
        clonedElement.style.transform = "none";
        clonedElement.style.backgroundColor = "#ffffff";
        clonedElement.style.color = "#0f172a";
      },
    });

    if (!shouldSliceLongPage && pageIndex > 0) {
      pdf.addPage();
    }

    if (shouldSliceLongPage) {
      addSlicedCanvasToPdf(pdf, canvas, pageWidth, pageHeight);
      continue;
    }

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    const draw = fitImageToPage(
      canvas.width,
      canvas.height,
      pageWidth,
      pageHeight,
    );

    pdf.addImage(
      imageData,
      "JPEG",
      draw.x,
      draw.y,
      draw.width,
      draw.height,
    );
  }

  return pdf.output("blob");
}

export function downloadPdfBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return url;
}

export async function createPdfFromElement(
  element: HTMLElement,
  filename: string,
) {
  const blob = await createPdfBlobFromElement(element);
  const url = downloadPdfBlob(blob, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
