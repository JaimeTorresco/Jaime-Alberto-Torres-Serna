import { useState } from 'react';
import { X, Copy, Download, Check, FileText, Code2, Tag, DollarSign, Calendar, Hash } from 'lucide-react';
import { EmailAttachment } from '../types';
import { formatXml } from '../utils/xmlParser';
import { downloadBlob } from '../utils/zipHandler';

interface XmlPreviewModalProps {
  attachment: EmailAttachment | null;
  onClose: () => void;
}

export function XmlPreviewModal({ attachment, onClose }: XmlPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'code'>('info');
  const [copied, setCopied] = useState(false);

  if (!attachment) return null;

  const invoice = attachment.parsedXmlData;
  const rawXml = invoice?.rawXmlText || '';
  const formattedXml = formatXml(rawXml);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawXml || formattedXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (attachment.blob) {
      downloadBlob(attachment.blob, attachment.name);
    } else if (rawXml) {
      const blob = new Blob([rawXml], { type: 'application/xml;charset=utf-8' });
      downloadBlob(blob, attachment.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                {attachment.name}
              </h3>
              <p className="text-xs text-slate-500">
                {attachment.extractedFromZip
                  ? `Extraído de archivo comprimido: ${attachment.extractedFromZip}`
                  : 'Archivo XML adjunto directo'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Ficha del Comprobante</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'code'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Código XML</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar XML'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Financial summary card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Importe Total</span>
                  <span className="text-2xl font-black text-slate-900">
                    ${invoice?.total ? invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}{' '}
                    <span className="text-xs font-normal text-slate-500">{invoice?.moneda || 'MXN'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Subtotal</span>
                  <span className="text-lg font-bold text-slate-700">
                    ${invoice?.subtotal ? invoice.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Tipo de Documento</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 mt-1">
                    {invoice?.docType?.toUpperCase() || 'CFDI 4.0'}
                  </span>
                </div>
              </div>

              {/* Entity info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Emisor / Proveedor
                  </h4>
                  <p className="text-sm font-bold text-slate-900">{invoice?.emisorNombre || 'No especificado'}</p>
                  {invoice?.emisorRfc && (
                    <p className="text-xs text-slate-500 font-mono mt-1">RFC: {invoice.emisorRfc}</p>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Receptor / Cliente
                  </h4>
                  <p className="text-sm font-bold text-slate-900">{invoice?.receptorNombre || 'No especificado'}</p>
                  {invoice?.receptorRfc && (
                    <p className="text-xs text-slate-500 font-mono mt-1">RFC: {invoice.receptorRfc}</p>
                  )}
                </div>
              </div>

              {/* Fiscal Identification and metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Identificadores Fiscales y Fechas
                </h4>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                  {invoice?.uuid && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-500">Folio Fiscal (UUID):</span>
                      <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 select-all">
                        {invoice.uuid}
                      </span>
                    </div>
                  )}

                  {invoice?.folio && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Serie y Folio:</span>
                      <span className="font-semibold">{[invoice.serie, invoice.folio].filter(Boolean).join('-')}</span>
                    </div>
                  )}

                  {invoice?.fecha && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Fecha de Emisión:</span>
                      <span>{invoice.fecha}</span>
                    </div>
                  )}

                  {invoice?.conceptosCount && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Cantidad de Conceptos:</span>
                      <span className="font-semibold">{invoice.conceptosCount} concepto(s)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed select-all">
                <code>{formattedXml || rawXml || 'Sin contenido XML disponible'}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
