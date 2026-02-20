export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("PDF conversion must run in browser only");
  }

  if (pdfjsLib) return pdfjsLib;

  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker?url");

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  pdfjsLib = pdfjs;
  return pdfjsLib;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    const pdfjs = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjs.getDocument({
      data: arrayBuffer,
    }).promise;

    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error: "Canvas context not available",
      };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvas, // ✅ required for v4
      viewport,
    }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve({
            imageUrl: "",
            file: null,
            error: "Failed to create image blob",
          });
          return;
        }

        const imageFile = new File(
          [blob],
          file.name.replace(/\.pdf$/i, ".png"),
          { type: "image/png" }
        );

        resolve({
          imageUrl: URL.createObjectURL(blob),
          file: imageFile,
        });
      }, "image/png");
    });
  } catch (error: any) {
    console.error("PDF ERROR:", error);

    return {
      imageUrl: "",
      file: null,
      error: error.message || "Failed to convert PDF",
    };
  }
}