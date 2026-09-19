import { useState } from 'react';
import {
  X,
  Key,
  Shield,
  ExternalLink,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Copy,
  Check,
  Upload,
} from 'lucide-react';
import { MicrosoftAuthConfig } from '../types';
import { MicrosoftGraphClient } from '../utils/graphClient';

interface OutlookConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (config: MicrosoftAuthConfig) => void;
  initialConfig: MicrosoftAuthConfig;
}

export function OutlookConnectModal({
  isOpen,
  onClose,
  onConnected,
  initialConfig,
}: OutlookConnectModalProps) {
  const [token, setToken] = useState(initialConfig.accessToken || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStepByStep, setShowStepByStep] = useState(true);

  if (!isOpen) return null;

  const handleTestAndConnect = async () => {
    if (!token.trim()) {
      setError('Por favor pega el Token de Acceso copiado desde Microsoft Graph Explorer.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = new MicrosoftGraphClient(token.trim());
      const profile = await client.getUserProfile();

      onConnected({
        clientId: '',
        accessToken: token.trim(),
        userEmail: profile.mail || profile.userPrincipalName,
        userName: profile.displayName,
        isConnected: true,
      });

      onClose();
    } catch (err: any) {
      console.error('Error al conectar con Microsoft Graph:', err);
      setError(
        'No se pudo autenticar con el token proporcionado. Asegúrate de haber iniciado sesión con tu cuenta de Outlook en Graph Explorer y de haber copiado el texto completo del token.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Conectar con tu cuenta de Outlook.com
              </h3>
              <p className="text-xs text-slate-500">
                Paso a paso para autorizar la lectura de adjuntos XML y ZIP
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Helpful Explainer */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>¿Cómo obtener el Token en 3 simples pasos?</span>
            </div>
            <p className="text-blue-800">
              Microsoft proporciona una herramienta oficial y segura para conectar con tu cuenta de Outlook (personal o empresarial) sin necesidad de programar ni pagar nada.
            </p>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-slate-900 mb-1">
                  Abre Microsoft Graph Explorer (Sitio Oficial de Microsoft):
                </p>
                <a
                  href="https://developer.microsoft.com/es-es/graph/graph-explorer"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors mt-1 shadow-2xs"
                >
                  <span>Abrir Graph Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-1">
                  Inicia sesión con tu correo de Outlook:
                </p>
                <p>
                  En la esquina superior derecha de esa página verás el ícono de perfil que dice <strong>«Iniciar sesión»</strong>. Inicia sesión con tu cuenta de <em>Outlook.com</em> o <em>Hotmail</em>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-1">
                  Copia el Access Token:
                </p>
                <p>
                  Debajo de la barra de direcciones verás una pestaña llamada <strong>«Access token»</strong> (Token de acceso). Haz clic en ella y presiona el botón <strong>«Copiar»</strong> (o selecciona todo el texto largo que empieza con <code>eyJ...</code>).
                </p>
              </div>
            </div>
          </div>

          {/* Form Input for Token */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Pega aquí el Token de Acceso que copiaste:</span>
              <span className="text-[11px] font-normal text-slate-500">Comienza con eyJ...</span>
            </label>
            <textarea
              rows={4}
              placeholder="Pega aquí el texto largo del token..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Alternative reminder */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>¿Prefieres no conectar tu cuenta?</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Usa arrastrar y soltar
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleTestAndConnect}
            disabled={loading || !token.trim()}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Validar y Conectar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
