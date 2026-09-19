import { EmailMessage } from '../types';
import { parseXmlContent } from './xmlParser';

// Sample XML content templates
const SAMPLE_XML_CFDI_1 = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="4.0" Serie="F" Folio="10492" Fecha="2026-09-15T10:30:00" SubTotal="14500.00" Total="16820.00" Moneda="MXN" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="06000">
  <cfdi:Emisor Rfc="TEL980214XYZ" Nombre="TELECOMUNICACIONES Y REDES DEL NORTE S.A. DE C.V." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ALD120405H89" Nombre="AL DIA SERVICIOS CORPORATIVOS S.A." DomicilioFiscalReceptor="03100" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="81112100" Cantidad="1" ClaveUnidad="E48" Descripcion="Servicio de Enlace Dedicado de Fibra Óptica 1Gbps - Septiembre 2026" ValorUnitario="14500.00" Importe="14500.00"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="4A9B1C2D-3E4F-5A6B-7C8D-9E0F1A2B3C4D" FechaTimbrado="2026-09-15T10:31:12" RfcProvCertif="SAT970701NN3"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

const SAMPLE_XML_CFDI_2 = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="EXP" Folio="4819" Fecha="2026-09-12T14:15:20" SubTotal="3200.50" Total="3712.58" Moneda="MXN" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="PAP890101QW1" Nombre="PAPELERIA Y SUMINISTROS DE OFICINA S.A. DE C.V." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ALD120405H89" Nombre="AL DIA SERVICIOS CORPORATIVOS S.A." RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Cantidad="10" Descripcion="Cajas de Papel Bond Carta 75g" ValorUnitario="180.00" Importe="1800.00"/>
    <cfdi:Concepto Cantidad="2" Descripcion="Tóner Laser Original HP" ValorUnitario="700.25" Importe="1400.50"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="8E7D6C5B-4A3F-2E1D-0C9B-8A7F6E5D4C3B" FechaTimbrado="2026-09-12T14:16:05"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

const SAMPLE_XML_CFDI_3 = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="H" Folio="302" Fecha="2026-09-08T09:00:00" SubTotal="8500.00" Total="8500.00" Moneda="USD" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="CLO740520AB3" Nombre="CLOUD INFRASTRUCTURE &amp; HOSTING GLOBAL LLC" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ALD120405H89" Nombre="AL DIA SERVICIOS CORPORATIVOS S.A." RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Cantidad="1" Descripcion="Suscripción Mensual Servidores Cloud &amp; Almacenamiento Seguro" ValorUnitario="8500.00" Importe="8500.00"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="99AA88BB-77CC-66DD-55EE-44FF33AA22BB" FechaTimbrado="2026-09-08T09:02:10"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

const SAMPLE_XML_CFDI_4_INSIDE_ZIP_A = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="CONS" Folio="992" Fecha="2026-09-04T16:45:00" SubTotal="28000.00" Total="32480.00" Moneda="MXN" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="CON150612ZZ9" Nombre="CONSULTORES FISCALES Y CONTABLES ASOCIADOS S.C." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ALD120405H89" Nombre="AL DIA SERVICIOS CORPORATIVOS S.A." RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Cantidad="1" Descripcion="Honorarios por Auditoría Fiscal y Asesoría Contable Tercer Trimestre" ValorUnitario="28000.00" Importe="28000.00"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="33221100-AABB-CCDD-EEFF-998877665544" FechaTimbrado="2026-09-04T16:48:00"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

const SAMPLE_XML_CFDI_5_INSIDE_ZIP_B = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="GAS" Folio="184002" Fecha="2026-09-02T11:20:00" SubTotal="1250.00" Total="1450.00" Moneda="MXN" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="GAS030201AA1" Nombre="ESTACION DE SERVICIO Y COMBUSTIBLES METROPOLITANOS S.A." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ALD120405H89" Nombre="AL DIA SERVICIOS CORPORATIVOS S.A." RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Cantidad="65.4" Descripcion="Gasolina Premium 91 Octanos" ValorUnitario="19.11" Importe="1250.00"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="7F6E5D4C-3B2A-1098-7654-3210FEDCBA98" FechaTimbrado="2026-09-02T11:22:15"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

export function getDemoOutlookEmails(): EmailMessage[] {
  return [
    {
      id: 'msg-101',
      subject: 'Envío de Factura Telecomunicaciones - Septiembre 2026',
      sender: {
        name: 'Facturación Telecomunicaciones del Norte',
        email: 'facturacion@telecomdelnorte.com',
      },
      receivedDateTime: '2026-09-15T10:32:00Z',
      hasAttachments: true,
      previewSnippet: 'Estimado cliente, adjuntamos comprobante fiscal digital CFDI correspondiente a su servicio mensual...',
      attachments: [
        {
          id: 'att-101-1',
          name: 'Factura_F10492_Telecom.xml',
          contentType: 'application/xml',
          size: 2840,
          isInline: false,
          sourceType: 'xml',
          parsedXmlData: parseXmlContent(SAMPLE_XML_CFDI_1),
        },
      ],
    },
    {
      id: 'msg-102',
      subject: 'Paquete Factura y Comprobantes de Pago ZIP - Auditoría Trimestral',
      sender: {
        name: 'Despacho Consultores Fiscales S.C.',
        email: 'contacto@consultoresfiscales.com.mx',
      },
      receivedDateTime: '2026-09-04T16:50:00Z',
      hasAttachments: true,
      previewSnippet: 'Le enviamos en archivo comprimido los comprobantes fiscales y recibos de pago del mes...',
      attachments: [
        {
          id: 'att-102-zip',
          name: 'Factura_Honorarios_Audit_Q3.zip',
          contentType: 'application/zip',
          size: 42300,
          isInline: false,
          sourceType: 'zip',
        },
        // Auto-extracted XML from the ZIP!
        {
          id: 'att-102-extracted-xml',
          name: 'CFDI_Honorarios_CONS992.xml',
          contentType: 'application/xml',
          size: 3120,
          isInline: false,
          sourceType: 'xml',
          extractedFromZip: 'Factura_Honorarios_Audit_Q3.zip',
          parsedXmlData: parseXmlContent(SAMPLE_XML_CFDI_4_INSIDE_ZIP_A),
        },
      ],
    },
    {
      id: 'msg-103',
      subject: 'Comprobante Fiscal Digital Papelería y Oficina',
      sender: {
        name: 'Papelería Suministros Corporativos',
        email: 'ventas@papeleriasuministros.com',
      },
      receivedDateTime: '2026-09-12T14:18:00Z',
      hasAttachments: true,
      previewSnippet: 'Muchas gracias por su compra. Adjunto encontrará el XML de su pedido número 4819...',
      attachments: [
        {
          id: 'att-103-1',
          name: 'CFDI_EXP4819_Papeleria.xml',
          contentType: 'application/xml',
          size: 2950,
          isInline: false,
          sourceType: 'xml',
          parsedXmlData: parseXmlContent(SAMPLE_XML_CFDI_2),
        },
      ],
    },
    {
      id: 'msg-104',
      subject: 'Invoice & Digital Receipts - Cloud Infrastructure Hosting',
      sender: {
        name: 'Cloud Infrastructure Global Billing',
        email: 'billing@cloudhostingglobal.com',
      },
      receivedDateTime: '2026-09-08T09:05:00Z',
      hasAttachments: true,
      previewSnippet: 'Your monthly cloud hosting invoice is ready. Please find the attached XML receipt...',
      attachments: [
        {
          id: 'att-104-1',
          name: 'Invoice_Cloud_H302.xml',
          contentType: 'application/xml',
          size: 2680,
          isInline: false,
          sourceType: 'xml',
          parsedXmlData: parseXmlContent(SAMPLE_XML_CFDI_3),
        },
      ],
    },
    {
      id: 'msg-105',
      subject: 'Comprobantes de Combustible Flotilla (Paquete Semanal .ZIP)',
      sender: {
        name: 'Gasolineras y Combustibles Metropolitanos',
        email: 'cfdi@combustiblesmetro.mx',
      },
      receivedDateTime: '2026-09-02T11:25:00Z',
      hasAttachments: true,
      previewSnippet: 'Adjuntamos el paquete ZIP con los XML de consumo de combustible correspondientes...',
      attachments: [
        {
          id: 'att-105-zip',
          name: 'Comprobantes_Combustible_Semana35.zip',
          contentType: 'application/zip',
          size: 21500,
          isInline: false,
          sourceType: 'zip',
        },
        // Auto-extracted XML from the ZIP!
        {
          id: 'att-105-extracted-xml',
          name: 'CFDI_GAS184002_Metropolitano.xml',
          contentType: 'application/xml',
          size: 2790,
          isInline: false,
          sourceType: 'xml',
          extractedFromZip: 'Comprobantes_Combustible_Semana35.zip',
          parsedXmlData: parseXmlContent(SAMPLE_XML_CFDI_5_INSIDE_ZIP_B),
        },
      ],
    },
  ];
}
