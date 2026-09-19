import JSZip from 'jszip';
import { EmailAttachment } from '../types';
import { parseXmlContent } from './xmlParser';

/**
 * Unpacks a ZIP file (from ArrayBuffer or base64) and returns any extracted XML files
 * (as well as PDFs if included), keeping track of the parent zip container.
 */
export async function unpackZipAttachment(
  zipName: string,
  zipData: ArrayBuffer | Uint8Array | string
): Promise<EmailAttachment[]> {
  const extractedAttachments: EmailAttachment[] = [];

  try {
    const zip = new JSZip();
    let loadedZip: JSZip;

    if (typeof zipData === 'string') {
      // Clean potential base64 prefix
      const cleanBase64 = zipData.replace(/^data:application\/(zip|x-zip-compressed);base64,/, '');
      loadedZip = await zip.loadAsync(cleanBase64, { base64: true });
    } else {
      loadedZip = await zip.loadAsync(zipData);
    }

    const fileEntries = Object.entries(loadedZip.files);

    for (const [relativePath, zipEntry] of fileEntries) {
      if (zipEntry.dir) continue;

      const lowerName = relativePath.toLowerCase();
      const baseFileName = relativePath.split('/').pop() || relativePath;

      if (lowerName.endsWith('.xml')) {
        const textContent = await zipEntry.async('text');
        const parsed = parseXmlContent(textContent);
        const blob = new Blob([textContent], { type: 'application/xml;charset=utf-8' });

        extractedAttachments.push({
          id: `extracted-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: baseFileName,
          contentType: 'application/xml',
          size: textContent.length,
          isInline: false,
          sourceType: 'xml',
          extractedFromZip: zipName,
          blob,
          parsedXmlData: parsed,
        });
      } else if (lowerName.endsWith('.pdf')) {
        const pdfBlob = await zipEntry.async('blob');
        extractedAttachments.push({
          id: `extracted-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: baseFileName,
          contentType: 'application/pdf',
          size: pdfBlob.size,
          isInline: false,
          sourceType: 'other',
          extractedFromZip: zipName,
          blob: pdfBlob,
        });
      }
    }
  } catch (error) {
    console.error(`Error desempacando el archivo ZIP ${zipName}:`, error);
  }

  return extractedAttachments;
}

/**
 * Creates a single consolidated ZIP archive with all selected XML (and optional accompanying) files
 * for one-click mass download.
 */
export async function generateMassDownloadZip(
  attachments: EmailAttachment[],
  options: {
    includePdfs?: boolean;
    folderStructure?: 'flat' | 'by-issuer' | 'by-date' | 'by-period';
    customRootFolder?: string;
  } = {}
): Promise<Blob> {
  const masterZip = new JSZip();
  const rootFolderName = options.customRootFolder || 'Facturas_y_XMLs_Outlook';
  const folder = options.folderStructure === 'flat' ? masterZip : masterZip.folder(rootFolderName);

  for (const item of attachments) {
    // Only package XMLs (or PDFs if enabled)
    if (item.sourceType !== 'xml' && !(options.includePdfs && item.contentType === 'application/pdf')) {
      continue;
    }

    let targetFolder = folder;

    if (options.folderStructure === 'by-issuer' && item.parsedXmlData?.emisorNombre) {
      const sanitizedIssuer = item.parsedXmlData.emisorNombre.replace(/[/\\?%*:|"<>]/g, '_').trim();
      targetFolder = folder?.folder(sanitizedIssuer) || folder;
    } else if (options.folderStructure === 'by-date' && item.parsedXmlData?.fecha) {
      const datePrefix = item.parsedXmlData.fecha.slice(0, 7) || 'Sin_Fecha';
      targetFolder = folder?.folder(datePrefix) || folder;
    } else if (options.folderStructure === 'by-period') {
      const dateStr = item.parsedXmlData?.fecha?.slice(0, 7) || 'Sin_Periodo';
      let periodFolder = folder?.folder(dateStr) || folder;
      if (item.parsedXmlData?.emisorNombre) {
        const sanitizedIssuer = item.parsedXmlData.emisorNombre.replace(/[/\\?%*:|"<>]/g, '_').trim();
        targetFolder = periodFolder?.folder(sanitizedIssuer) || periodFolder;
      } else {
        targetFolder = periodFolder;
      }
    }

    if (item.parsedXmlData?.rawXmlText) {
      targetFolder?.file(item.name, item.parsedXmlData.rawXmlText);
    } else if (item.blob) {
      targetFolder?.file(item.name, item.blob);
    } else if (item.base64Data) {
      targetFolder?.file(item.name, item.base64Data, { base64: true });
    }
  }

  return await masterZip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Generates an Excel-compatible CSV report with summary of all extracted XML files.
 */
export function generateCsvReport(attachments: EmailAttachment[]): Blob {
  const xmlItems = attachments.filter((a) => a.sourceType === 'xml');

  const headers = [
    'Archivo XML',
    'Origen',
    'Tipo Documento',
    'Emisor',
    'RFC Emisor',
    'Receptor',
    'RFC Receptor',
    'Folio/Serie',
    'UUID / Folio Fiscal',
    'Fecha',
    'Moneda',
    'Subtotal',
    'Total',
  ];

  const rows = xmlItems.map((item) => {
    const data = item.parsedXmlData;
    return [
      item.name,
      item.extractedFromZip ? `Extraído de ${item.extractedFromZip}` : 'Adjunto Directo',
      data?.docType?.toUpperCase() || 'XML',
      data?.emisorNombre || '',
      data?.emisorRfc || '',
      data?.receptorNombre || '',
      data?.receptorRfc || '',
      [data?.serie, data?.folio].filter(Boolean).join('-'),
      data?.uuid || '',
      data?.fecha || '',
      data?.moneda || 'MXN',
      data?.subtotal ? data.subtotal.toFixed(2) : '',
      data?.total ? data.total.toFixed(2) : '',
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  // Include UTF-8 BOM so Excel opens with proper accents
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Helper to trigger browser download of a Blob.
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
