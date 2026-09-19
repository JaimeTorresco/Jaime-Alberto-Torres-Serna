import { Calendar, X, Clock, RefreshCw, Filter, AlertTriangle, RotateCcw } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  isConnected: boolean;
  onScanOutlookRange?: () => void;
  isProcessing?: boolean;
  matchingCount?: number;
  totalCount?: number;
  availableYears?: number[];
  dateRangeDetected?: { min?: string; max?: string };
}

export function DateRangeFilter({
  startDate,
  endDate,
  onDateChange,
  isConnected,
  onScanOutlookRange,
  isProcessing = false,
  matchingCount,
  totalCount,
  availableYears = [],
  dateRangeDetected,
}: DateRangeFilterProps) {
  // Helper presets
  const applyPreset = (preset: 'current-month' | 'previous-month' | 'last-30' | 'last-90' | 'all') => {
    if (preset === 'all') {
      onDateChange('', '');
      return;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (preset === 'current-month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = `${year}-${pad(month + 1)}-01`;
      const lastDay = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
      onDateChange(firstDay, lastDay);
    } else if (preset === 'previous-month') {
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const firstDay = `${year}-${pad(month + 1)}-01`;
      const lastDay = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
      onDateChange(firstDay, lastDay);
    } else if (preset === 'last-30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startStr = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
      const endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      onDateChange(startStr, endStr);
    } else if (preset === 'last-90') {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startStr = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
      const endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      onDateChange(startStr, endStr);
    }
  };

  const applyYear = (year: number) => {
    onDateChange(`${year}-01-01`, `${year}-12-31`);
  };

  const handleClear = () => {
    onDateChange('', '');
  };

  const hasActiveFilter = Boolean(startDate || endDate);
  const isFilteredToZero = hasActiveFilter && matchingCount === 0 && (totalCount || 0) > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Header / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Filtrar por Rango de Fechas</span>
              {hasActiveFilter && (
                <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Filtro activo
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Parametriza las fechas para consultar o descargar facturas de un período contable específico.
            </p>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {hasActiveFilter && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Quitar filtro de fechas y ver todas las facturas"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar / Ver Todas</span>
            </button>
          )}

          {/* If connected to Outlook, provide direct server scan button */}
          {isConnected && onScanOutlookRange && (
            <button
              onClick={onScanOutlookRange}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Buscar en Outlook todos los correos dentro de este rango exacto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Escanear en Outlook</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert when filter yields 0 matches */}
      {isFilteredToZero && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-amber-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>No se encontraron facturas en el rango {startDate} a {endDate}.</strong>
              {dateRangeDetected?.min && dateRangeDetected?.max && (
                <span className="ml-1 text-amber-800">
                  (Tus facturas en bandeja tienen fechas entre <strong>{dateRangeDetected.min}</strong> y <strong>{dateRangeDetected.max}</strong>).
                </span>
              )}
            </span>
          </div>
          <button
            onClick={handleClear}
            className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-md transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Ver todas las {totalCount} facturas</span>
          </button>
        </div>
      )}

      {/* Quick Presets Row */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
          <span className="font-semibold text-slate-500 text-[11px] flex items-center gap-1 mr-1">
            <Clock className="w-3 h-3" /> Períodos:
          </span>

          {/* Dynamic buttons for detected invoice years */}
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => applyYear(yr)}
              className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 font-bold transition-colors cursor-pointer"
            >
              Año {yr}
            </button>
          ))}

          <button
            onClick={() => applyPreset('current-month')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Este Mes
          </button>
          <button
            onClick={() => applyPreset('previous-month')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Mes Anterior
          </button>
          <button
            onClick={() => applyPreset('last-30')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Últimos 30 días
          </button>
          <button
            onClick={() => applyPreset('last-90')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Últimos 90 días
          </button>
          <button
            onClick={handleClear}
            className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors cursor-pointer"
          >
            Todas ({totalCount || 0})
          </button>
        </div>

        {/* Status Count feedback */}
        {hasActiveFilter && matchingCount !== undefined && totalCount !== undefined && (
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-500" />
            <span>
              Mostrando <strong className="text-blue-700 font-bold">{matchingCount}</strong> de {totalCount} facturas
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
