import { useState, useMemo } from 'react';
import {
  FileText,
  Archive,
  Search,
  Eye,
  Download,
  Calendar,
  User,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { EmailMessage, EmailAttachment } from '../types';
import { downloadBlob } from '../utils/zipHandler';

interface EmailListTableProps {
  emails: EmailMessage[];
  onPreviewXml: (attachment: EmailAttachment) => void;
  onDownloadAttachment: (attachment: EmailAttachment) => void;
}

export function EmailListTable({
  emails,
  onPreviewXml,
  onDownloadAttachment,
}: EmailListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'xml' | 'zip'>('all');
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedEmails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      const q = searchQuery.toLowerCase().trim();

      // Search match across subject, sender, and attachment details
      const matchesSearch =
        !q ||
        email.subject.toLowerCase().includes(q) ||
        email.sender.name.toLowerCase().includes(q) ||
        email.sender.email.toLowerCase().includes(q) ||
        email.attachments.some(
          (att) =>
            att.name.toLowerCase().includes(q) ||
            att.parsedXmlData?.emisorNombre?.toLowerCase().includes(q) ||
            att.parsedXmlData?.emisorRfc?.toLowerCase().includes(q) ||
            att.parsedXmlData?.uuid?.toLowerCase().includes(q) ||
            att.parsedXmlData?.folio?.toLowerCase().includes(q)
        );

      if (!matchesSearch) return false;

      if (filterType === 'xml') {
        return email.attachments.some((a) => a.sourceType === 'xml');
      } else if (filterType === 'zip') {
        return email.attachments.some((a) => a.sourceType === 'zip' || a.extractedFromZip);
      }

      return true;
    });
  }, [emails, searchQuery, filterType]);

  const handleDownloadEmailAttachments = (email: EmailMessage) => {
    email.attachments.forEach((att) => {
      onDownloadAttachment(att);
    });
  };

  return (
    <div id="email-list-container" className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Search and Filters Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-input"
              type="text"
              placeholder="Buscar por emisor, RFC, folio, asunto, nombre de archivo o UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium text-slate-600">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'all' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                Todos ({emails.length})
              </button>
              <button
                onClick={() => setFilterType('xml')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'xml' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                Solo XML
              </button>
              <button
                onClick={() => setFilterType('zip')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'zip' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                Con ZIP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredEmails.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No se encontraron correos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? `No hay coincidencias para "${searchQuery}". Intenta con otros términos o limpia el filtro.`
              : 'Conéctate a Outlook o arrastra correos .eml para comenzar a extraer archivos.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredEmails.map((email) => {
            const isExpanded = expandedEmails[email.id] !== false; // default expanded
            const xmlAttachments = email.attachments.filter((a) => a.sourceType === 'xml');
            const zipAttachments = email.attachments.filter((a) => a.sourceType === 'zip');

            return (
              <div key={email.id} className="p-4 sm:p-5 hover:bg-slate-50/40 transition-colors">
                {/* Email Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => toggleExpand(email.id)}
                      className="mt-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {email.subject}
                        </span>

                        {xmlAttachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FileText className="w-3 h-3" />
                            {xmlAttachments.length} XML
                          </span>
                        )}

                        {zipAttachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Archive className="w-3 h-3" />
                            {zipAttachments.length} ZIP
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <strong className="text-slate-700">{email.sender.name}</strong>
                          <span className="text-slate-400">&lt;{email.sender.email}&gt;</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(email.receivedDateTime).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</span>
                        </span>
                      </div>

                      {email.previewSnippet && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {email.previewSnippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownloadEmailAttachments(email)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Descargar todos los adjuntos de este correo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Descargar correo</span>
                    </button>
                  </div>
                </div>

                {/* Attachments Section */}
                {isExpanded && email.attachments.length > 0 && (
                  <div className="mt-3.5 ml-7 space-y-2 border-l-2 border-slate-200 pl-3">
                    {email.attachments.map((att) => {
                      const isXml = att.sourceType === 'xml';
                      const isZip = att.sourceType === 'zip';
                      const invoice = att.parsedXmlData;

                      return (
                        <div
                          key={att.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white gap-2 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isXml
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isZip
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isXml ? <FileText className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                                  {att.name}
                                </span>

                                {att.extractedFromZip && (
                                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-purple-50 text-purple-700 border border-purple-200">
                                    Extraído de {att.extractedFromZip}
                                  </span>
                                )}

                                {invoice?.docType === 'cfdi' && (
                                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    CFDI
                                  </span>
                                )}
                              </div>

                              {/* Key XML Invoice details */}
                              {invoice?.isValidXml && invoice.emisorNombre && (
                                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3">
                                  <span>
                                    Emisor: <strong className="text-slate-700">{invoice.emisorNombre}</strong>
                                    {invoice.emisorRfc && ` (${invoice.emisorRfc})`}
                                  </span>
                                  {invoice.total !== undefined && invoice.total > 0 && (
                                    <span className="text-emerald-700 font-bold">
                                      Total: ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {invoice.moneda}
                                    </span>
                                  )}
                                  {invoice.folio && <span>Folio: {invoice.folio}</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Item Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {isXml && (
                              <button
                                onClick={() => onPreviewXml(att)}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                title="Ver código XML y datos parseados"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>
                            )}

                            <button
                              onClick={() => onDownloadAttachment(att)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              title="Descargar este archivo individual"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Descargar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
