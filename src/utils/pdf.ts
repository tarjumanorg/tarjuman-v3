
export async function countPdfPages(file: File): Promise<number> {
    // Guard against SSR execution just in case, though this function should only be called in browser events.
    if (typeof window === 'undefined') {
        return 0;
    }

    try {
        // Dynamic import to avoid loading pdfjs-dist during SSR (which causes DOMMatrix error)
        const pdfjsLib = await import('pdfjs-dist');

        // @ts-ignore
        // Vite handles this dynamic import with ?url correctly in browser
        const workerUrlModule = await import('pdfjs-dist/build/pdf.worker.min?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = (workerUrlModule.default || workerUrlModule) as string;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        return pdf.numPages;
    } catch (error) {
        console.error('Error counting PDF pages:', error);
        return 0;
    }
}
