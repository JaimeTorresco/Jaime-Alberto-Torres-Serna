import { useState, useRef } from 'react';
import { Upload, FileCode, Archive, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { EmailMessage } from '../types';
import { parseEmlFile } from '../utils/emlParser';
import { unpackZipAttachment } from '../utils/zipHandler';
import { parseXmlContent } from '../utils/xmlParser';

interface FileUploadDropzoneProps {
  onFilesProcessed: (messages: EmailMessage[]) => void;
}

export function FileUploadDropzone({ onFilesProcessed }: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processUploadedFiles = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    setStatusText('Procesando archivos...');

    const newMessages: EmailMessage[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const lowerName = file.name.toLowerCase();

        setStatusText(`Leyendo ${file.name} (${i + 1}/${fileList.length})...`);

        if (lowerName.endsWith('.eml')) {
          // Parse EML message
          const msg = await parseEmlFile(file);
          if (msg.attachments.length > 0) {
            newMessages.push(msg);
          } else {
            newMessages.push({
              ...msg,
              previewSnippet: 'Este correo no contenía adjuntos XML ni ZIP.',
            });
          }
        } else if (lowerName.endsWith('.zip')) {
          // Unpack ZIP directly
          const arrayBuffer = await file.arrayBuffer();
          const extracted = await unpackZipAttachment(file.name, arrayBuffer);

          newMessages.push({
            id: `zip-upload-${Date.now()}-${i}`,
            subject: `Archivo comprimido: ${file.name}`,
            sender: {
              name: 'Archivo ZIP Local',
              email: 'archivo-cargado@local',
            },
            receivedDateTime: new Date(file.lastModified || Date.now()).toISOString(),
            hasAttachments: true,
            previewSnippet: `Se extrajeron ${extracted.length} archivo(s) desde este archivo ZIP.`,
            attachments: extracted,
          });
        } else if (lowerName.endsWith('.xml')) {
          // Direct XML file
          const text = await file.text();
          const parsed = parseXmlContent(text);
          const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });

          newMessages.push({
            id: `xml-upload-${Date.now()}-${i}`,
            subject: `XML importado: ${file.name}`,
            sender: {
              name: 'Importación Manual',
              email: 'archivo-cargado@local',
            },
            receivedDateTime: new Date(file.lastModified || Date.now()).toISOString(),
            hasAttachments: true,
            attachments: [
              {
                id: `att-direct-${Date.now()}-${i}`,
                name: file.name,
                contentType: 'application/xml',
                size: file.size,
                isInline: false,
                sourceType: 'xml',
                blob,
                parsedXmlData: parsed,
              },
            ],
          });
        }
      }

      if (newMessages.length > 0) {
        onFilesProcessed(newMessages);
        setStatusText(`¡Listo! Se agregaron ${newMessages.length} elemento(s).`);
        setTimeout(() => setStatusText(null), 4000);
      } else {
        setStatusText('No se encontraron archivos XML o ZIP válidos en los archivos seleccionados.');
        setTimeout(() => setStatusText(null), 5000);
      }
    } catch (err: any) {
      console.error('Error al procesar archivos:', err);
      setStatusText(`Error al procesar: ${err.message || 'Formato no soportado'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Extracción directa: Arrastra correos (.eml) o archivos ZIP / XML</span>
          </h2>
          <p className="text-xs text-slate-500">
            Puedes exportar correos desde Outlook o soltar archivos ZIP para extraer automáticamente todos sus XMLs
          </p>
        </div>
      </div>

      <div
        id="file-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".eml,.zip,.xml"
          onChange={(e) => e.target.files && processUploadedFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {isProcessing ? (
            <div className="flex flex-col items-center py-2 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm font-medium">{statusText}</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Arrastra aquí tus correos <span className="text-blue-600">.eml</span>, paquetes <span className="text-blue-600">.zip</span> o <span className="text-blue-600">.xml</span>
              </p>
              <p className="text-xs text-slate-500">
                o haz clic para examinar archivos desde tu computadora
              </p>

              <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Correos .eml de Outlook
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5" /> Archivos .zip
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileCode className="w-3.5 h-3.5" /> Archivos .xml
                </span>
              </div>
            </>
          )}

          {statusText && !isProcessing && (
            <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {statusText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
