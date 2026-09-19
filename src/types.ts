export interface EmailMessage {
  id: string;
  subject: string;
  sender: {
    name: string;
    email: string;
  };
  receivedDateTime: string;
  hasAttachments: boolean;
  previewSnippet?: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  base64Data?: string;
  blob?: Blob;
  sourceType: 'xml' | 'zip' | 'other';
  extractedFromZip?: string; // name of parent zip if unpacked
  parsedXmlData?: ParsedInvoiceData;
}

export interface ParsedInvoiceData {
  isValidXml: boolean;
  docType: 'cfdi' | 'dian' | 'facturae' | 'generic_xml';
  uuid?: string;
  folio?: string;
  serie?: string;
  fecha?: string;
  emisorNombre?: string;
  emisorRfc?: string;
  receptorNombre?: string;
  receptorRfc?: string;
  subtotal?: number;
  total?: number;
  moneda?: string;
  conceptosCount?: number;
  rootElement?: string;
  rawXmlText?: string;
}

export interface ExtractionFilterOptions {
  searchQuery: string;
  fileType: 'all' | 'xml' | 'zip';
  dateFrom: string;
  dateTo: string;
  onlyInvoices: boolean;
}

export interface MicrosoftAuthConfig {
  clientId: string;
  accessToken: string;
  userEmail?: string;
  userName?: string;
  isConnected: boolean;
}
