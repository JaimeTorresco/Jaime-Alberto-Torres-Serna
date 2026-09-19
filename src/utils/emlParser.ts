import { EmailMessage, EmailAttachment } from '../types';
import { parseXmlContent } from './xmlParser';
import { unpackZipAttachment } from './zipHandler';

/**
 * Parses raw text of an .eml (MIME format) email to extract metadata and attachments.
 */
export async function parseEmlFile(file: File): Promise<EmailMessage> {
  const content = await file.text();
  const id = `eml-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Extract common headers
  const subjectMatch = content.match(/^Subject:\s*(.+)$/im);
  const fromMatch = content.match(/^From:\s*(.+)$/im);
  const dateMatch = content.match(/^Date:\s*(.+)$/im);

  let senderName = 'Remitente Desconocido';
  let senderEmail = 'desconocido@correo.com';

  if (fromMatch && fromMatch[1]) {
    const rawFrom = fromMatch[1].trim();
    const emailMatch = rawFrom.match(/<([^>]+)>/);
    if (emailMatch) {
      senderEmail = emailMatch[1];
      senderName = rawFrom.replace(/<[^>]+>/, '').replace(/["']/g, '').trim() || senderEmail;
    } else {
      senderEmail = rawFrom;
      senderName = rawFrom;
    }
  }

  const subject = subjectMatch ? subjectMatch[1].trim() : file.name.replace(/\.[^/.]+$/, '');
  const receivedDateTime = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

  // Find boundary for multipart
  const boundaryMatch = content.match(/boundary="?([^";\r\n]+)"?/i);
  const attachments: EmailAttachment[] = [];

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = content.split(`--${boundary}`);

    for (const part of parts) {
      const fileNameMatch = part.match(/filename="?([^";\r\n]+)"?/i) || part.match(/name="?([^";\r\n]+)"?/i);
      if (!fileNameMatch) continue;

      const fileName = fileNameMatch[1].trim();
      const lowerName = fileName.toLowerCase();

      // Check if it's xml or zip
      if (!lowerName.endsWith('.xml') && !lowerName.endsWith('.zip')) {
        continue;
      }

      // Extract body after blank line
      const headerBodySplit = part.split(/\r?\n\r?\n/);
      if (headerBodySplit.length < 2) continue;

      const bodyData = headerBodySplit.slice(1).join('\n').replace(/\r?\n/g, '').trim();

      if (lowerName.endsWith('.xml')) {
        let xmlText = '';
        try {
          xmlText = atob(bodyData);
        } catch {
          // If not base64, use direct raw text
          xmlText = bodyData;
        }

        const parsed = parseXmlContent(xmlText);
        const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8' });

        attachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: fileName,
          contentType: 'application/xml',
          size: xmlText.length,
          isInline: false,
          sourceType: 'xml',
          blob,
          parsedXmlData: parsed,
        });
      } else if (lowerName.endsWith('.zip')) {
        // Direct zip unpacking
        const unpacked = await unpackZipAttachment(fileName, bodyData);
        if (unpacked.length > 0) {
          attachments.push(...unpacked);
        }
      }
    }
  }

  return {
    id,
    subject,
    sender: {
      name: senderName,
      email: senderEmail,
    },
    receivedDateTime,
    hasAttachments: attachments.length > 0,
    attachments,
  };
}
