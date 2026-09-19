import { useState, useMemo } from 'react';
import { Key, CheckCircle2, AlertCircle, Loader2, RefreshCw, Filter } from 'lucide-react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { FileUploadDropzone } from './components/FileUploadDropzone';
import { EmailListTable } from './components/EmailListTable';
import { XmlPreviewModal } from './components/XmlPreviewModal';
import { OutlookConnectModal } from './components/OutlookConnectModal';
import { TutorialGuideModal } from './components/TutorialGuideModal';
import { DateRangeFilter } from './components/DateRangeFilter';
import { EmailMessage, EmailAttachment, MicrosoftAuthConfig } from './types';
import { getDemoOutlookEmails } from './utils/demoData';
import { generateMassDownloadZip, generateCsvReport, downloadBlob } from './utils/zipHandler';
import { MicrosoftGraphClient, extractAccountInfoFromToken } from './utils/graphClient';

export default function App() {
  const [emails, setEmails] = useState<EmailMessage[]>(() => getDemoOutlookEmails());
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Date range filters (format YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Scan depth configuration (default 350 to capture all invoices)
  const [scanLimit, setScanLimit] = useState<number>(350);

  // Modals
  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Quick inline token paste state
  const [inlineToken, setInlineToken] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [renewToken, setRenewToken] = useState('');

  // Microsoft Auth
  const [authConfig, setAuthConfig] = useState<MicrosoftAuthConfig>({
    clientId: '',
    accessToken: '',
    isConnected: false,
  });

  // Dynamic analysis of dates and years present in all scanned emails/invoices
  const dateAnalysis = useMemo(() => {
    let minDate: string | null = null;
    let maxDate: string | null = null;
    const yearSet = new Set<number>();

    emails.forEach((msg) => {
      const datesToCheck: string[] = [];
      if (msg.receivedDateTime) datesToCheck.push(msg.receivedDateTime);
      msg.attachments.forEach((att) => {
        if (att.parsedXmlData?.fecha) datesToCheck.push(att.parsedXmlData.fecha);
      });

      datesToCheck.forEach((str) => {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const yr = d.getFullYear();
          if (yr >= 2000 && yr <= 2030) {
            yearSet.add(yr);
            const iso = str.split('T')[0];
            if (!minDate || iso < minDate) minDate = iso;
            if (!maxDate || iso > maxDate) maxDate = iso;
          }
        }
      });
    });

    return {
      availableYears: Array.from(yearSet).sort((a, b) => b - a),
      dateRangeDetected: { min: minDate || undefined, max: maxDate || undefined },
    };
  }, [emails]);

  // Filter emails dynamically based on selected date range
  const filteredEmails = useMemo(() => {
    if (!startDate && !endDate) return emails;

    const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const endTimestamp = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;

    return emails.filter((email) => {
      // 1. Check email received timestamp
      const msgTime = new Date(email.receivedDateTime).getTime();
      const matchesEmailDate = !isNaN(msgTime) && msgTime >= startTimestamp && msgTime <= endTimestamp;

      // 2. Check XML invoice issue date if parsed
      const matchesXmlDate = email.attachments.some((att) => {
        if (att.parsedXmlData?.fecha) {
          const invTime = new Date(att.parsedXmlData.fecha).getTime();
          return !isNaN(invTime) && invTime >= startTimestamp && invTime <= endTimestamp;
        }
        return false;
      });

      return matchesEmailDate || matchesXmlDate;
    });
  }, [emails, startDate, endDate]);

  // Handle Mass Download of all XML files in a single ZIP (honoring current date filter)
  const handleMassDownloadZip = async () => {
    setIsProcessing(true);
    try {
      const allAttachments: EmailAttachment[] = [];
      filteredEmails.forEach((msg) => {
        msg.attachments.forEach((att) => {
          if (att.sourceType === 'xml') {
            allAttachments.push(att);
          }
        });
      });

      if (allAttachments.length === 0) {
        // Fallback: If filtered list is 0, offer all
        return handleMassDownloadAllZip();
      }

      const zipBlob = await generateMassDownloadZip(allAttachments, {
        folderStructure: 'by-issuer',
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const rangeSuffix = startDate && endDate ? `_${startDate}_a_${endDate}` : '';
      downloadBlob(zipBlob, `Facturas_XML_Outlook_${todayStr}${rangeSuffix}.zip`);
    } catch (err) {
      console.error('Error al generar la descarga masiva en ZIP:', err);
      alert('Ocurrió un error al empaquetar los archivos XML.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Mass Download of ALL extracted XMLs without any date restriction
  const handleMassDownloadAllZip = async () => {
    setIsProcessing(true);
    try {
      const allAttachments: EmailAttachment[] = [];
      emails.forEach((msg) => {
        msg.attachments.forEach((att) => {
          if (att.sourceType === 'xml') {
            allAttachments.push(att);
          }
        });
      });

      if (allAttachments.length === 0) {
        alert('No hay archivos XML disponibles para descargar.');
        return;
      }

      const zipBlob = await generateMassDownloadZip(allAttachments, {
        folderStructure: 'by-issuer',
      });

      const todayStr = new Date().toISOString().split('T')[0];
      downloadBlob(zipBlob, `Facturas_XML_Todas_${allAttachments.length}_${todayStr}.zip`);
    } catch (err) {
      console.error('Error al generar la descarga masiva de todas las facturas en ZIP:', err);
      alert('Ocurrió un error al empaquetar los archivos XML.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle CSV Export (honoring current date filter)
  const handleExportCsv = () => {
    const allAttachments: EmailAttachment[] = [];
    filteredEmails.forEach((msg) => {
      msg.attachments.forEach((att) => {
        if (att.sourceType === 'xml') {
          allAttachments.push(att);
        }
      });
    });

    if (allAttachments.length === 0) {
      alert('No hay archivos XML para generar el reporte en este período.');
      return;
    }

    const csvBlob = generateCsvReport(allAttachments);
    const todayStr = new Date().toISOString().split('T')[0];
    const rangeSuffix = startDate && endDate ? `_${startDate}_a_${endDate}` : '';
    downloadBlob(csvBlob, `Reporte_Facturas_Outlook_${todayStr}${rangeSuffix}.csv`);
  };

  // Handle single attachment download
  const handleDownloadSingleAttachment = (att: EmailAttachment) => {
    if (att.blob) {
      downloadBlob(att.blob, att.name);
    } else if (att.parsedXmlData?.rawXmlText) {
      const blob = new Blob([att.parsedXmlData.rawXmlText], { type: 'application/xml;charset=utf-8' });
      downloadBlob(blob, att.name);
    } else if (att.base64Data) {
      const byteCharacters = atob(att.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: att.contentType });
      downloadBlob(blob, att.name);
    }
  };

  // Handle incoming uploaded files (.eml, .zip, .xml)
  const handleFilesProcessed = (newMessages: EmailMessage[]) => {
    setEmails((prev) => [...newMessages, ...prev]);
    setIsDemoMode(false);
    setSyncError(null);
  };

  // Reload demo sample data
  const handleLoadDemoData = () => {
    setEmails(getDemoOutlookEmails());
    setIsDemoMode(true);
    setSyncError(null);
  };

  // Reset list
  const handleReset = () => {
    setEmails([]);
    setIsDemoMode(false);
    setSyncError(null);
  };

  // Handle deep scan of Microsoft Graph with optional date parameters
  const handleConnected = async (
    config: MicrosoftAuthConfig,
    customLimit?: number,
    customStart?: string,
    customEnd?: string
  ) => {
    const limitToUse = customLimit || scanLimit;
    const filterStart = customStart !== undefined ? customStart : startDate;
    const filterEnd = customEnd !== undefined ? customEnd : endDate;

    const previousEmails = emails;

    setIsDemoMode(false);
    setIsProcessing(true);
    setSyncError(null);
    setStatusMessage('Conectando con Microsoft Graph...');

    // Extract user info from token or profile
    const tokenInfo = extractAccountInfoFromToken(config.accessToken);
    let resolvedEmail = config.userEmail || tokenInfo.email;
    let resolvedName = config.userName || tokenInfo.name;

    const client = new MicrosoftGraphClient(config.accessToken);

    try {
      const profile = await client.getUserProfile();
      if (profile.mail || profile.userPrincipalName) {
        resolvedEmail = profile.mail || profile.userPrincipalName;
      }
      if (profile.displayName) {
        resolvedName = profile.displayName;
      }
    } catch (e) {
      console.warn('No se pudo obtener el perfil desde /me:', e);
    }

    setAuthConfig({
      ...config,
      userEmail: resolvedEmail,
      userName: resolvedName,
      isConnected: true,
    });

    try {
      const dateDesc = filterStart && filterEnd ? `entre ${filterStart} y ${filterEnd}` : 'en tu bandeja';
      setStatusMessage(`Buscando correos con facturas ${dateDesc}...`);

      const realMessages = await client.fetchMessagesWithAttachments({
        maxEmailsToScan: limitToUse,
        startDate: filterStart || undefined,
        endDate: filterEnd || undefined,
        onProgress: (p) => {
          setStatusMessage(p.statusText);
        },
      });

      if (realMessages.length === 0) {
        setStatusMessage(null);
        // Do not wipe previous emails if this was a restricted filter search
        setSyncError(
          `Conexión exitosa con ${resolvedEmail || 'tu cuenta'}, pero no se encontraron correos con archivos .XML o .ZIP ${dateDesc}. Puedes ampliar el rango de fechas o aumentar la cantidad de correos a escanear.`
        );
        return;
      }

      setStatusMessage(`Descargando y desempacando adjuntos de ${realMessages.length} correos con comprobantes...`);

      // For each message, fetch attachment contents and unpack ZIPs
      const populatedMessages: EmailMessage[] = [];

      for (let i = 0; i < realMessages.length; i++) {
        const msg = realMessages[i];
        if (i % 2 === 0) {
          setStatusMessage(`Procesando archivo ${i + 1} de ${realMessages.length}: "${msg.subject.slice(0, 30)}..."`);
        }

        const fullAttachments: EmailAttachment[] = [];
        for (const att of msg.attachments) {
          try {
            const loaded = await client.loadAttachmentContent(msg.id, att);
            fullAttachments.push(...loaded);
          } catch (e) {
            console.error(`No se pudo cargar adjunto ${att.name}:`, e);
            fullAttachments.push(att);
          }
        }
        populatedMessages.push({
          ...msg,
          attachments: fullAttachments,
        });
      }

      setEmails(populatedMessages);
      setStatusMessage(null);
    } catch (err: any) {
      console.error('Error al sincronizar correos con Microsoft Graph:', err);
      if (previousEmails.length > 0) {
        setEmails(previousEmails);
      }
      setSyncError(err.message || 'Error al conectar con Microsoft Graph.');
      setStatusMessage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle token renewal
  const handleRenewToken = async () => {
    if (!renewToken.trim()) return;
    const newToken = renewToken.trim();
    setRenewToken('');
    await handleConnected(
      {
        ...authConfig,
        accessToken: newToken,
        isConnected: true,
      },
      scanLimit,
      startDate,
      endDate
    );
  };

  // Handle inline token paste submission
  const handleInlineConnect = async () => {
    if (!inlineToken.trim()) {
      setInlineError('Por favor pega el token copiado desde Microsoft Graph Explorer.');
      return;
    }
    setInlineError(null);
    await handleConnected({
      clientId: '',
      accessToken: inlineToken.trim(),
      isConnected: true,
    });
  };

  // Handle disconnect
  const handleDisconnect = () => {
    setAuthConfig({
      clientId: '',
      accessToken: '',
      isConnected: false,
      userEmail: undefined,
      userName: undefined,
    });
    setInlineToken('');
    setSyncError(null);
    setStatusMessage(null);
  };

  // Count total XML files found in current filtered view
  const totalXmlFound = filteredEmails.reduce((acc, msg) => {
    return acc + msg.attachments.filter((a) => a.sourceType === 'xml').length;
  }, 0);

  const totalRawXmlFound = emails.reduce((acc, msg) => {
    return acc + msg.attachments.filter((a) => a.sourceType === 'xml').length;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <Header
        authConfig={authConfig}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onLoadDemoData={handleLoadDemoData}
        onOpenGuide={() => setIsGuideOpen(true)}
        isDemoMode={isDemoMode}
        onReset={handleReset}
        onDisconnect={handleDisconnect}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Connected account banner with Deep Scan controls */}
        {authConfig.isConnected && (
          <div className="bg-white border border-emerald-200 rounded-xl p-4 mb-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Cuenta:</span>
                  <span className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {authConfig.userEmail || 'Outlook'}
                  </span>
                  {authConfig.userName && <span className="text-slate-500 font-normal">({authConfig.userName})</span>}
                </p>
                <p className="text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    ✓ {totalRawXmlFound} facturas XML extraídas
                  </span>
                  <span>en {emails.length} correos escaneados.</span>
                </p>
              </div>
            </div>

            {/* Depth & Refresh Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 font-medium">Límite búsqueda:</span>
                <select
                  value={scanLimit}
                  onChange={(e) => setScanLimit(Number(e.target.value))}
                  disabled={isProcessing}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={100}>100 correos</option>
                  <option value={250}>250 correos</option>
                  <option value={500}>500 correos (Recomendado)</option>
                  <option value={1000}>1000 correos (Profundo)</option>
                </select>
              </div>

              <button
                onClick={() => handleConnected(authConfig, scanLimit)}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Vuelve a escanear tu bandeja con el límite configurado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Escanear más correos</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
              >
                Cambiar cuenta
              </button>
            </div>
          </div>
        )}

        {/* Date Range Filter Bar */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          isConnected={authConfig.isConnected}
          onScanOutlookRange={() => handleConnected(authConfig, scanLimit, startDate, endDate)}
          isProcessing={isProcessing}
          matchingCount={totalXmlFound}
          totalCount={totalRawXmlFound}
          availableYears={dateAnalysis.availableYears}
          dateRangeDetected={dateAnalysis.dateRangeDetected}
        />

        {/* Processing loader message */}
        {isProcessing && statusMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-xs text-blue-900 shadow-xs animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-sm">{statusMessage}</span>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Desempacando archivos ZIP y extrayendo XMLs de facturación electrónica...
              </p>
            </div>
          </div>
        )}

        {/* Sync Error Banner */}
        {syncError && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-6 shadow-xs text-xs text-amber-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-sm text-amber-900">
                  Aviso de sincronización con Outlook
                </h4>
                <p className="text-amber-800 leading-relaxed">
                  {syncError}
                </p>

                {/* If token expired, offer quick renewal right here */}
                {syncError.toLowerCase().includes('expirado') || syncError.toLowerCase().includes('token') ? (
                  <div className="mt-3 p-4 bg-white border border-amber-300 rounded-xl space-y-3">
                    <p className="font-bold text-slate-800 text-xs">
                      🔑 Renovar Token de Acceso (Expira cada 60 minutos por seguridad de Microsoft):
                    </p>
                    <ol className="list-decimal list-inside text-slate-600 space-y-1 text-[11px]">
                      <li>
                        Abre o recarga{' '}
                        <a
                          href="https://developer.microsoft.com/en-us/graph/graph-explorer"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-bold"
                        >
                          Microsoft Graph Explorer ↗
                        </a>
                      </li>
                      <li>
                        Ve a la pestaña <strong>«Access token»</strong> y haz clic en el botón de copiar.
                      </li>
                      <li>Pega el nuevo token en este campo y haz clic en <strong>«Actualizar Token y Reanudar»</strong>:</li>
                    </ol>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Pega aquí el nuevo Access Token (eyJ...)"
                        value={renewToken}
                        onChange={(e) => setRenewToken(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                      />
                      <button
                        onClick={handleRenewToken}
                        disabled={!renewToken.trim() || isProcessing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>Actualizar Token y Reanudar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleConnected(authConfig, 500)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-800 transition-colors cursor-pointer"
                    >
                      Escanear 500 correos sin filtro de fecha
                    </button>
                    <button
                      onClick={() => handleConnected(authConfig, 1000)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-white border border-amber-400 text-amber-900 rounded-lg font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Escanear 1000 correos
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prominent Quick Paste Box for Microsoft Graph Token (when not connected) */}
        {!authConfig.isConnected && (
          <div className="bg-white border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ¿Tienes tu Token de Microsoft Graph copiado? Pégalo aquí:
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pega el texto largo (comienza con <code>eyJ...</code>) para escanear tus correos de Outlook automáticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Pega aquí tu Access Token (eyJ...)"
                value={inlineToken}
                onChange={(e) => {
                  setInlineToken(e.target.value);
                  if (inlineError) setInlineError(null);
                }}
                className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={handleInlineConnect}
                disabled={isProcessing || !inlineToken.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Conectar y Extraer XMLs</span>
              </button>
            </div>

            {inlineError && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{inlineError}</span>
              </p>
            )}
          </div>
        )}

        {/* Metric statistics bar and mass download triggers (honors date filter) */}
        <StatsBar
          emails={filteredEmails}
          allEmails={emails}
          onMassDownloadZip={handleMassDownloadZip}
          onMassDownloadAllZip={handleMassDownloadAllZip}
          onExportCsv={handleExportCsv}
          onClearFilter={() => {
            setStartDate('');
            setEndDate('');
          }}
          hasActiveFilter={Boolean(startDate || endDate)}
          isProcessing={isProcessing}
        />

        {/* Drag and Drop Zone for .eml, .zip, .xml */}
        <FileUploadDropzone onFilesProcessed={handleFilesProcessed} />

        {/* Email & Attachment Inventory Table (honors date filter) */}
        <EmailListTable
          emails={filteredEmails}
          onPreviewXml={(att) => setPreviewAttachment(att)}
          onDownloadAttachment={handleDownloadSingleAttachment}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            Herramienta de extracción de archivos XML y paquetes ZIP para Outlook.com y Microsoft 365.
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Guía de uso
            </button>
            <span>•</span>
            <span>Descompresión local en navegador</span>
          </div>
        </div>
      </footer>

      {/* Preview Modal for XML & Invoices */}
      <XmlPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      {/* Microsoft Graph Connect Modal */}
      <OutlookConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={(cfg) => handleConnected(cfg)}
        initialConfig={authConfig}
      />

      {/* In-app Tutorial Guide */}
      <TutorialGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
