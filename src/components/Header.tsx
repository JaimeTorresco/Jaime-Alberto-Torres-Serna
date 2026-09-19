import { Mail, ShieldCheck, HelpCircle, RefreshCw, UploadCloud, PlayCircle, LogOut } from 'lucide-react';
import { MicrosoftAuthConfig } from '../types';

interface HeaderProps {
  authConfig: MicrosoftAuthConfig;
  onOpenConnectModal: () => void;
  onLoadDemoData: () => void;
  onOpenGuide: () => void;
  isDemoMode: boolean;
  onReset: () => void;
  onDisconnect?: () => void;
}

export function Header({
  authConfig,
  onOpenConnectModal,
  onLoadDemoData,
  onOpenGuide,
  isDemoMode,
  onReset,
  onDisconnect,
}: HeaderProps) {
  return (
    <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Extractor XML y ZIP
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Outlook &amp; M365
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Extracción masiva de facturas electrónicas y documentos fiscales
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-open-guide"
            onClick={onOpenGuide}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1.5"
            title="Ver guía paso a paso de Outlook"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">¿Cómo funciona?</span>
          </button>

          {isDemoMode ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Modo Prueba</span>
              </span>
              <button
                id="btn-reset-demo"
                onClick={onReset}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                title="Limpiar datos"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-load-demo"
              onClick={onLoadDemoData}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Cargar Datos de Ejemplo</span>
              <span className="sm:hidden">Ejemplo</span>
            </button>
          )}

          {authConfig.isConnected ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm shadow-2xs"
                title={`Cuenta activa: ${authConfig.userEmail || 'Microsoft Outlook'}`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-bold leading-tight truncate max-w-[150px] sm:max-w-[260px]">
                    {authConfig.userEmail || 'Outlook Conectado'}
                  </span>
                  {authConfig.userName && (
                    <span className="text-[10px] text-emerald-600 truncate max-w-[150px] sm:max-w-[260px]">
                      {authConfig.userName}
                    </span>
                  )}
                </div>
              </div>
              {onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Desconectar o cambiar a otra cuenta de Outlook"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Cambiar cuenta</span>
                </button>
              )}
            </div>
          ) : (
            <button
              id="btn-connect-outlook"
              onClick={onOpenConnectModal}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Conectar Outlook</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
