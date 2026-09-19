import { EmailMessage, EmailAttachment } from '../types';
import { parseXmlContent } from './xmlParser';
import { unpackZipAttachment } from './zipHandler';

/**
 * Extracts email and name directly from the JWT access token payload if available
 */
export function extractAccountInfoFromToken(token: string): { email?: string; name?: string } {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    const email = parsed.email || parsed.preferred_username || parsed.upn || parsed.unique_name;
    const name = parsed.name;
    return { email, name };
  } catch {
    return {};
  }
}

export interface FetchProgress {
  scannedEmails: number;
  foundInvoices: number;
  statusText: string;
}

export interface FetchMessagesOptions {
  maxEmailsToScan?: number;
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string;   // Format: YYYY-MM-DD
  onProgress?: (progress: FetchProgress) => void;
}

/**
 * Microsoft Graph API Client for Outlook.com and Office 365
 */
export class MicrosoftGraphClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken.trim();
  }

  /**
   * Universal fetch helper for Graph API.
   * Handles relative paths and absolute nextLink URLs.
   */
  async fetchGraph(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `https://graph.microsoft.com/v1.0${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || errJson.error?.code || JSON.stringify(errJson);
      } catch {
        errDetail = await response.text();
      }

      if (response.status === 401) {
        throw new Error('El token de acceso ha expirado o no es válido. Por favor genera uno nuevo en Graph Explorer.');
      }
      if (response.status === 403 || errDetail.toLowerCase().includes('accessdenied')) {
        throw new Error(
          'Falta el permiso "Mail.Read" en tu token. En Graph Explorer ve a "Modify Permissions", busca "Mail.Read", haz clic en "Consent" y vuelve a copiar el token.'
        );
      }
      throw new Error(`Error en Microsoft Graph (${response.status}): ${errDetail}`);
    }

    return await response.json();
  }

  /**
   * Retrieves profile of the logged-in Outlook user
   */
  async getUserProfile(): Promise<{ displayName?: string; mail?: string; userPrincipalName?: string }> {
    try {
      return await this.fetchGraph('/me?$select=displayName,mail,userPrincipalName');
    } catch {
      return {};
    }
  }

  /**
   * Scans Outlook mailbox for emails with attachments, filtering for XML and ZIP.
   * Supports date range filters ($filter=receivedDateTime ge ... and le ...)
   * Uses multi-page pagination (@odata.nextLink) to guarantee finding all invoices.
   */
  async fetchMessagesWithAttachments(options: FetchMessagesOptions = {}): Promise<EmailMessage[]> {
    const maxEmails = options.maxEmailsToScan || 350;
    const onProgress = options.onProgress;
    const { startDate, endDate } = options;

    let rawMessages: any[] = [];
    let nextUrl: string | null = null;

    // Build filter expressions
    const filterParts: string[] = ['hasAttachments eq true'];
    if (startDate) {
      filterParts.push(`receivedDateTime ge ${startDate}T00:00:00Z`);
    }
    if (endDate) {
      filterParts.push(`receivedDateTime le ${endDate}T23:59:59Z`);
    }
    const filterQuery = encodeURIComponent(filterParts.join(' and '));

    // Strategy 1: Filter with hasAttachments and date range
    try {
      const initialEndpoint = `/me/messages?$filter=${filterQuery}&$select=id,subject,sender,receivedDateTime,hasAttachments,bodyPreview&$top=50&$orderby=receivedDateTime desc`;
      const data = await this.fetchGraph(initialEndpoint);
      rawMessages = data.value || [];
      nextUrl = data['@odata.nextLink'] || null;

      if (onProgress) {
        onProgress({
          scannedEmails: rawMessages.length,
          foundInvoices: 0,
          statusText: `Buscando correos con adjuntos en el período (${rawMessages.length} encontrados)...`,
        });
      }

      // Follow nextLink pages to fetch up to maxEmails
      while (nextUrl && rawMessages.length < maxEmails) {
        try {
          const nextData = await this.fetchGraph(nextUrl);
          const newItems = nextData.value || [];
          if (newItems.length === 0) break;
          rawMessages.push(...newItems);
          nextUrl = nextData['@odata.nextLink'] || null;

          if (onProgress) {
            onProgress({
              scannedEmails: rawMessages.length,
              foundInvoices: 0,
              statusText: `Buscando más correos en la bandeja (${rawMessages.length} encontrados)...`,
            });
          }
        } catch (pageErr) {
          console.warn('Deteniendo paginación por error:', pageErr);
          break;
        }
      }
    } catch (filterErr) {
      console.warn('Filtro hasAttachments + date falló con orderby, probando sin orderby:', filterErr);

      // Strategy 2: Without orderby (compatible with personal Outlook folders that restrict orderby)
      try {
        const initialEndpoint = `/me/messages?$filter=${filterQuery}&$select=id,subject,sender,receivedDateTime,hasAttachments,bodyPreview&$top=50`;
        const data = await this.fetchGraph(initialEndpoint);
        rawMessages = data.value || [];
        nextUrl = data['@odata.nextLink'] || null;

        while (nextUrl && rawMessages.length < maxEmails) {
          try {
            const nextData = await this.fetchGraph(nextUrl);
            const newItems = nextData.value || [];
            if (newItems.length === 0) break;
            rawMessages.push(...newItems);
            nextUrl = nextData['@odata.nextLink'] || null;
          } catch {
            break;
          }
        }
      } catch (noOrderbyErr) {
        console.warn('Filtro sin orderby falló, probando consulta general con filtrado local:', noOrderbyErr);

        // Strategy 3: General messages with pagination, then filter dates in memory
        try {
          const initialEndpoint = `/me/messages?$filter=hasAttachments eq true&$select=id,subject,sender,receivedDateTime,hasAttachments,bodyPreview&$top=50`;
          const data = await this.fetchGraph(initialEndpoint);
          rawMessages = data.value || [];
          nextUrl = data['@odata.nextLink'] || null;

          while (nextUrl && rawMessages.length < maxEmails) {
            try {
              const nextData = await this.fetchGraph(nextUrl);
              const newItems = nextData.value || [];
              if (newItems.length === 0) break;
              rawMessages.push(...newItems);
              nextUrl = nextData['@odata.nextLink'] || null;
            } catch {
              break;
            }
          }
        } catch {
          // Strategy 4: Inbox direct
          const data = await this.fetchGraph(`/me/mailFolders/Inbox/messages?$top=50`);
          rawMessages = data.value || [];
        }
      }
    }

    if (rawMessages.length === 0) {
      return [];
    }

    // Client-side date boundary enforcement as safety guarantee
    let filteredList = rawMessages.filter((m) => m.hasAttachments);
    if (startDate) {
      const startTimestamp = new Date(`${startDate}T00:00:00Z`).getTime();
      filteredList = filteredList.filter((m) => {
        const msgTime = new Date(m.receivedDateTime).getTime();
        return !isNaN(msgTime) && msgTime >= startTimestamp;
      });
    }
    if (endDate) {
      const endTimestamp = new Date(`${endDate}T23:59:59Z`).getTime();
      filteredList = filteredList.filter((m) => {
        const msgTime = new Date(m.receivedDateTime).getTime();
        return !isNaN(msgTime) && msgTime <= endTimestamp;
      });
    }

    const messages: EmailMessage[] = [];
    let scannedCount = 0;

    for (let i = 0; i < filteredList.length; i++) {
      const msg = filteredList[i];
      scannedCount++;

      if (onProgress && i % 3 === 0) {
        onProgress({
          scannedEmails: filteredList.length,
          foundInvoices: messages.length,
          statusText: `Inspeccionando adjuntos (${scannedCount} de ${filteredList.length} correos)...`,
        });
      }

      try {
        const attData = await this.fetchGraph(`/me/messages/${msg.id}/attachments?$select=id,name,contentType,size,isInline`);
        const rawAttachments = attData.value || [];

        const relevantAttachments: EmailAttachment[] = [];

        for (const att of rawAttachments) {
          const name = (att.name || '').toLowerCase();
          if (name.endsWith('.xml')) {
            relevantAttachments.push({
              id: att.id,
              name: att.name,
              contentType: att.contentType || 'application/xml',
              size: att.size || 0,
              isInline: !!att.isInline,
              sourceType: 'xml',
            });
          } else if (name.endsWith('.zip')) {
            relevantAttachments.push({
              id: att.id,
              name: att.name,
              contentType: att.contentType || 'application/zip',
              size: att.size || 0,
              isInline: !!att.isInline,
              sourceType: 'zip',
            });
          }
        }

        if (relevantAttachments.length > 0) {
          messages.push({
            id: msg.id,
            subject: msg.subject || 'Sin Asunto',
            sender: {
              name: msg.sender?.emailAddress?.name || 'Desconocido',
              email: msg.sender?.emailAddress?.address || 'sin-correo',
            },
            receivedDateTime: msg.receivedDateTime,
            hasAttachments: true,
            previewSnippet: msg.bodyPreview,
            attachments: relevantAttachments,
          });
        }
      } catch (attErr) {
        console.warn(`No se pudieron obtener adjuntos para el correo ${msg.id}:`, attErr);
      }
    }

    return messages;
  }

  /**
   * Downloads and unpacks an attachment from a specific Outlook message
   */
  async loadAttachmentContent(messageId: string, attachment: EmailAttachment): Promise<EmailAttachment[]> {
    const endpoint = `/me/messages/${messageId}/attachments/${attachment.id}`;
    const data = await this.fetchGraph(endpoint);
    const base64Content = data.contentBytes;

    if (!base64Content) {
      throw new Error('No se recibieron datos de contenido del archivo adjunto');
    }

    if (attachment.sourceType === 'xml') {
      let xmlText = '';
      try {
        xmlText = decodeURIComponent(
          atob(base64Content)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } catch {
        xmlText = atob(base64Content);
      }

      const parsed = parseXmlContent(xmlText);
      const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8' });

      return [
        {
          ...attachment,
          base64Data: base64Content,
          blob,
          parsedXmlData: parsed,
        },
      ];
    } else if (attachment.sourceType === 'zip') {
      // Unpack the zip file in browser
      const extracted = await unpackZipAttachment(attachment.name, base64Content);
      return [
        {
          ...attachment,
          base64Data: base64Content,
        },
        ...extracted,
      ];
    }

    return [attachment];
  }
}
