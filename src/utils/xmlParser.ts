import { ParsedInvoiceData } from '../types';

/**
 * Parses XML text and detects whether it is an electronic invoice (CFDI 3.3/4.0, DIAN, etc.)
 * or general XML, extracting key accounting attributes.
 */
export function parseXmlContent(xmlText: string): ParsedInvoiceData {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return {
        isValidXml: false,
        docType: 'generic_xml',
        rawXmlText: xmlText,
      };
    }

    const rootElement = doc.documentElement.nodeName;
    const lowerRoot = rootElement.toLowerCase();

    // Check for Mexican CFDI (Comprobante Fiscal Digital por Internet)
    const isCfdi = lowerRoot.includes('comprobante') || doc.querySelector('[Version="3.3"], [Version="4.0"], [version="3.3"], [version="4.0"]');
    
    if (isCfdi) {
      const comprobante = doc.documentElement;
      const total = parseFloat(comprobante.getAttribute('Total') || comprobante.getAttribute('total') || '0');
      const subtotal = parseFloat(comprobante.getAttribute('SubTotal') || comprobante.getAttribute('subTotal') || '0');
      const moneda = comprobante.getAttribute('Moneda') || comprobante.getAttribute('moneda') || 'MXN';
      const fecha = comprobante.getAttribute('Fecha') || comprobante.getAttribute('fecha') || '';
      const folio = comprobante.getAttribute('Folio') || comprobante.getAttribute('folio') || '';
      const serie = comprobante.getAttribute('Serie') || comprobante.getAttribute('serie') || '';

      // Emisor
      const emisorNode = doc.querySelector('cfdi\\:Emisor, Emisor, emisor');
      const emisorNombre = emisorNode?.getAttribute('Nombre') || emisorNode?.getAttribute('nombre') || 'Emisor Desconocido';
      const emisorRfc = emisorNode?.getAttribute('Rfc') || emisorNode?.getAttribute('rfc') || '';

      // Receptor
      const receptorNode = doc.querySelector('cfdi\\:Receptor, Receptor, receptor');
      const receptorNombre = receptorNode?.getAttribute('Nombre') || receptorNode?.getAttribute('nombre') || 'Receptor Desconocido';
      const receptorRfc = receptorNode?.getAttribute('Rfc') || receptorNode?.getAttribute('rfc') || '';

      // Timbre Fiscal Digital (UUID)
      const timbreNode = doc.querySelector('tfd\\:TimbreFiscalDigital, TimbreFiscalDigital, timbreFiscalDigital');
      const uuid = timbreNode?.getAttribute('UUID') || timbreNode?.getAttribute('uuid') || '';

      // Conceptos
      const conceptos = doc.querySelectorAll('cfdi\\:Concepto, Concepto, concepto');

      return {
        isValidXml: true,
        docType: 'cfdi',
        rootElement,
        uuid: uuid || `CFDI-${folio || 'DOC'}-${Date.now().toString(36)}`,
        folio: folio || undefined,
        serie: serie || undefined,
        fecha: fecha || new Date().toISOString().split('T')[0],
        emisorNombre,
        emisorRfc,
        receptorNombre,
        receptorRfc,
        subtotal: isNaN(subtotal) ? 0 : subtotal,
        total: isNaN(total) ? 0 : total,
        moneda,
        conceptosCount: conceptos.length || 1,
        rawXmlText: xmlText,
      };
    }

    // Check for DIAN / UBL Factura electrónica (Colombia, Perú SUNAT, etc.)
    const isUbl = lowerRoot.includes('invoice') || doc.querySelector('Invoice, CreditNote, DebitNote');
    if (isUbl) {
      const idNode = doc.querySelector('ID, cbc\\:ID');
      const issueDate = doc.querySelector('IssueDate, cbc\\:IssueDate');
      const payableAmount = doc.querySelector('PayableAmount, cbc\\:PayableAmount');
      const partyName = doc.querySelector('AccountingSupplierParty PartyName Name, cbc\\:Name');
      const customerName = doc.querySelector('AccountingCustomerParty PartyName Name, cbc\\:RegistrationName');
      const uuidNode = doc.querySelector('UUID, cbc\\:UUID');

      return {
        isValidXml: true,
        docType: 'dian',
        rootElement,
        uuid: uuidNode?.textContent?.trim() || undefined,
        folio: idNode?.textContent?.trim() || undefined,
        fecha: issueDate?.textContent?.trim() || undefined,
        emisorNombre: partyName?.textContent?.trim() || 'Proveedor UBL',
        receptorNombre: customerName?.textContent?.trim() || 'Cliente Registrado',
        total: payableAmount?.textContent ? parseFloat(payableAmount.textContent) : undefined,
        moneda: payableAmount?.getAttribute('currencyID') || 'COP',
        rawXmlText: xmlText,
      };
    }

    // Generic valid XML
    return {
      isValidXml: true,
      docType: 'generic_xml',
      rootElement,
      rawXmlText: xmlText,
    };
  } catch (err) {
    return {
      isValidXml: false,
      docType: 'generic_xml',
      rawXmlText: xmlText,
    };
  }
}

/**
 * Formats XML with pretty indentation for clear visual inspection.
 */
export function formatXml(xml: string): string {
  let formatted = '';
  let pad = 0;
  // Clean whitespace between tags
  const clean = xml.replace(/>\s*</g, '><').trim();
  const reg = /(>)(<)(\/*)/g;
  const parts = clean.replace(reg, '$1\r\n$2$3').split('\r\n');

  for (let i = 0; i < parts.length; i++) {
    let node = parts[i];
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }

    let padding = '';
    for (let j = 0; j < pad; j++) {
      padding += '  ';
    }

    formatted += padding + node + '\r\n';
    pad += indent;
  }

  return formatted.trim();
}
