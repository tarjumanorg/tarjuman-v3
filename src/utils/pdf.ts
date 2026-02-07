
const PDFJS_VERSION = '5.4.624'; // Match installed version
const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export async function countPdfPages(file: File): Promise<number> {
    try {
        // Dynamically import pdfjs-dist to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdf.numPages;
    } catch (error) {
        console.error('Error counting PDF pages:', error);
        return 1; // Fallback to 1 page if detection fails
    }
}
