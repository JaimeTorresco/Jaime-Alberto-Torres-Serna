import { FileText, Archive, Mail, DollarSign, Download, AlertTriangle, RotateCcw } from 'lucide-react';
import { EmailMessage } from '../types';

interface StatsBarProps {
  emails: EmailMessage[];
  allEmails?: EmailMessage[];
  onMassDownloadZip: () => void;
  onMassDownloadAllZip?: () => void;
  onExportCsv: () => void;
  onClearFilter?: () => void;
  hasActiveFilter?: boolean;
  isProcessing: boolean;
}

export function StatsBar({
  emails,
  allEmails = [],
  onMassDownloadZip,
  onMassDownloadAllZip,
  onExportCsv,
  onClearFilter,
  hasActiveFilter = false,
  isProcessing,
}: StatsBarProps) {
  // Aggregate stats for currently filtered view
  let totalXmlCount = 0;
  let totalZipCount = 0;
  let totalSumMxn = 0;

  emails.forEach((email) => {
    email.attachments.forEach((att) => {
      if (att.sourceType === 'xml') {
        totalXmlCount++;
        if (att.parsedXmlData?.total) {
          totalSumMxn += att.parsedXmlData.total;
        }
      } else if (att.sourceType === 'zip') {
        totalZipCount++;
      }
    });
  });

  // Aggregate stats for total unfiltered pool
  let totalAllXmlCount = 0;
  allEmails.forEach((email) => {
    email.attachments.forEach((att) => {
      if (att.sourceType === 'xml') {
        totalAllXmlCount++;
      }
    });
  });

  const isFilteredOut = hasActiveFilter && totalXmlCount === 0 && totalAllXmlCount > 0;

  return (
    <div id="stats-summary-bar" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-6">
      {/* Alert banner when date filter hides all available invoices */}
      {isFilteredOut && (
        <div className="mb-4 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-900 text-sm">
                Tienes {totalAllXmlCount} facturas XML extraídas, pero el filtro de fecha actual no coincide.
              </p>
              <p className="text-amber-800 mt-0.5">
                Las fechas seleccionadas no tienen facturas asociadas. Haz clic en quitar filtro o descarga directamente todas las facturas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {onClearFilter && (
              <button
                onClick={onClearFilter}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Quitar Filtro ({totalAllXmlCount} XMLs)</span>
              </button>
            )}
            {onMassDownloadAllZip && (
              <button
                onClick={onMassDownloadAllZip}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Todas ({totalAllXmlCount})</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div id="stat-emails" className="flex items-center space-x-3.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Correos Escaneados</p>
            <p className="text-xl font-bold text-slate-800">
              {emails.length}
              {hasActiveFilter && allEmails.length > 0 && emails.length !== allEmails.length && (
                <span className="text-xs font-normal text-slate-400 ml-1">de {allEmails.length}</span>
              )}
            </p>
          </div>
        </div>

        <div id="stat-xmls" className="flex items-center space-x-3.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100/80">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Archivos XML Listos</p>
            <p className="text-xl font-bold text-emerald-900">
              {totalXmlCount}
              {hasActiveFilter && totalAllXmlCount > 0 && totalXmlCount !== totalAllXmlCount && (
                <span className="text-xs font-normal text-emerald-600 ml-1">de {totalAllXmlCount}</span>
              )}
            </p>
          </div>
        </div>

        <div id="stat-zips" className="flex items-center space-x-3.5 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100/80">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Paquetes ZIP Detectados</p>
            <p className="text-xl font-bold text-indigo-900">{totalZipCount}</p>
          </div>
        </div>

        <div id="stat-total-amount" className="flex items-center space-x-3.5 p-3 rounded-lg bg-amber-50/60 border border-amber-100/80">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Total Facturado Detectado</p>
            <p className="text-xl font-bold text-amber-900">
              ${totalSumMxn.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-600">
          {totalXmlCount > 0 ? (
            <span>
              <strong>{totalXmlCount} archivos XML</strong> disponibles para empaquetar y descargar.
              {hasActiveFilter && ` (Filtrados por fecha).`}
            </span>
          ) : totalAllXmlCount > 0 ? (
            <span className="text-amber-800 font-medium">
              Hay {totalAllXmlCount} archivos XML disponibles sin filtro. Quita el filtro de fechas para descargarlos.
            </span>
          ) : (
            <span>No hay archivos XML cargados aún. Conecta Outlook, arrastra correos o usa los datos de prueba.</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-export-csv"
            onClick={onExportCsv}
            disabled={(totalXmlCount === 0 && totalAllXmlCount === 0) || isProcessing}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Exportar Reporte CSV</span>
          </button>

          {/* If filtered out to 0 but all has invoices, offer direct download all */}
          {isFilteredOut && onMassDownloadAllZip ? (
            <button
              id="btn-mass-download-all"
              onClick={onMassDownloadAllZip}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              title={`Descarga todas las ${totalAllXmlCount} facturas XML extraídas`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Todas ({totalAllXmlCount} XMLs en ZIP)</span>
            </button>
          ) : (
            <button
              id="btn-mass-download"
              onClick={onMassDownloadZip}
              disabled={totalXmlCount === 0 || isProcessing}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {totalXmlCount > 0
                  ? `Descargar ${totalXmlCount} XMLs en un Solo ZIP`
                  : 'Descargar Todo en un Solo ZIP'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
