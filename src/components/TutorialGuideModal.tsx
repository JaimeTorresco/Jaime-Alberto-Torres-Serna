import { X, CheckCircle2, FileText, Archive, Mail, Download, ShieldCheck } from 'lucide-react';

interface TutorialGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialGuideModal({ isOpen, onClose }: TutorialGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Guía de Extracción Masiva para Outlook.com
              </h3>
              <p className="text-xs text-slate-500">
                Aprende cómo funciona el proceso de extracción de archivos XML y ZIP
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Localización de Correos con Adjuntos</h4>
              <p className="text-xs text-slate-600">
                En Outlook, muchas empresas y proveedores envían facturas en dos formatos:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 mt-1.5 space-y-1">
                <li>
                  <strong>Archivos XML directos:</strong> Adjuntos sueltos con extensión <code>.xml</code>.
                </li>
                <li>
                  <strong>Paquetes ZIP:</strong> Archivos comprimidos <code>.zip</code> que contienen el XML y el PDF juntos para ahorrar espacio.
                </li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Descompresión Automática en Memoria</h4>
              <p className="text-xs text-slate-600">
                Esta aplicación incluye un motor integrado que detecta los archivos ZIP recibidos y los desempaca en la memoria de tu navegador. Si el ZIP contenía facturas XML, se extraen de inmediato con la etiqueta <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-200">Extraído de [nombre.zip]</span> para que no tengas que descomprimirlos manualmente.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Descarga Masiva en un Solo Clic</h4>
              <p className="text-xs text-slate-600">
                Al presionar <strong>«Descargar Todo en un Solo ZIP»</strong>, la aplicación empaqueta todos los archivos XML en un único archivo comprimido listo para tu contabilidad o almacenamiento, junto con un informe en Excel/CSV de todos los emisores, folios, fechas e importes.
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Privacidad y confidencialidad:</strong> Todo el procesamiento de descompresión y lectura de XML ocurre localmente en tu sesión. Tus comprobantes fiscales no se comparten con terceros.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
