import { useState, useEffect } from 'react';
import { WorkspaceAPIService } from '../lib/api';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../lib/gasTemplate';
import { GASConfig } from '../types';
import { 
  Database, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ClipboardCheck, 
  Settings2, 
  Wifi, 
  WifiOff, 
  Loader2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface SetupWizardProps {
  onConfigChanged: (config: GASConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SetupWizard({ onConfigChanged, isOpen, onClose }: SetupWizardProps) {
  const [config, setConfig] = useState<GASConfig>({ scriptUrl: '', isLive: false });
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    setConfig(WorkspaceAPIService.getGASConfig());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = (updated: GASConfig) => {
    setConfig(updated);
    WorkspaceAPIService.setGASConfig(updated);
    onConfigChanged(updated);
  };

  const handleTestConnection = async () => {
    if (!config.scriptUrl) {
      setTestResult({ success: false, message: 'Please enter a Google Apps Script URL first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await WorkspaceAPIService.testGASConnection(config.scriptUrl);
      setTestResult(res);
      if (res.success) {
        // Automatically make live if tested successful
        handleSaveConfig({ ...config, isLive: true });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network request failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div id="setup-wizard-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div 
        id="setup-wizard-modal" 
        className="glass bg-slate-900/60 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/8"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white/3 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/15 text-blue-400 rounded-lg border border-blue-500/10">
              <Settings2 className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Google Sheets database sync</h3>
              <p className="text-xs text-slate-400">Connect your custom spreadsheets using Google Apps Script</p>
            </div>
          </div>
          <button 
            id="close-wizard-btn"
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Indicator Bar */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
            config.isLive 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          }`}>
            <div className="flex items-center space-x-3">
              <span className={`flex h-2.5 w-2.5 rounded-full relative ${
                config.isLive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              }`}>
                {config.isLive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
              </span>
              <div>
                <span className="text-sm font-semibold text-white/95">
                  Current Sync Status: {config.isLive ? 'Live Spreadsheet Database Connected' : 'Local Sandbox Mode'}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {config.isLive 
                    ? 'All workspaces, document notes, and whiteboard components sync automatically to Google Sheets.'
                    : 'Changes are saved inside your device\'s LocalStorage browser cache. Zero setup required.'}
                </p>
              </div>
            </div>
            <button
              id="toggle-live-sync-btn"
              onClick={() => {
                if (!config.scriptUrl && !config.isLive) {
                  setTestResult({ success: false, message: 'Add a valid Apps Script URL before turning on Live Sync.' });
                  return;
                }
                handleSaveConfig({ ...config, isLive: !config.isLive });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition border ${
                config.isLive 
                  ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                  : 'bg-amber-600 border-transparent text-white hover:bg-amber-500'
              }`}
            >
              {config.isLive ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Go Sandbox</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Go Live</span>
                </>
              )}
            </button>
          </div>

          {/* Setup Instructions Accordion */}
          <div className="border border-white/5 rounded-xl overflow-hidden">
            <button
              id="toggle-instructions-btn"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/3 text-slate-200 font-medium text-sm hover:bg-white/8 transition"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>3-Step Quick Setup Guide (Google Sheets API Engine)</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition transform ${showInstructions ? 'rotate-90' : ''}`} />
            </button>
            
            {showInstructions && (
              <div className="p-4 bg-white/1 border-t border-white/5 space-y-4 text-sm text-slate-300 leading-relaxed">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-500/20 text-blue-300 rounded-full font-bold text-xs">1</span>
                    <span className="font-semibold text-white">Create a New Google Sheet</span>
                  </div>
                  <p className="pl-7 text-xs text-slate-400">
                    Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center">Google Sheets <ExternalLink className="w-3 h-3 ml-0.5" /></a> and create a fresh spreadsheet. You can name it anything (e.g., "SpaceCraft Workspace Db").
                  </p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-500/20 text-blue-300 rounded-full font-bold text-xs">2</span>
                    <span className="font-semibold text-white">Add & Paste Backend Scripts</span>
                  </div>
                  <p className="pl-7 text-xs text-slate-400 mb-2">
                    In your spreadsheet, click <strong className="text-slate-200">Extensions &gt; Apps Script</strong>. Replace the empty editor code with our specialized backend integration engine.
                  </p>
                  <div className="pl-7 flex space-x-2">
                    <button
                      id="copy-gas-code-btn"
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-blue-500/30"
                    >
                      {copied ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Copied Code!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Google Apps Script Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-500/20 text-blue-300 rounded-full font-bold text-xs">3</span>
                    <span className="font-semibold text-white">Deploy as Web App</span>
                  </div>
                  <p className="pl-7 text-xs text-slate-400">
                    Click top-right <strong className="text-slate-200">Deploy &gt; New Deployment</strong>. Choose type <strong className="text-slate-200">Web App</strong>. Set "Execute as" to <strong className="text-blue-400 font-semibold">Me (your-email)</strong>, and "Who has access" to <strong className="text-blue-400 font-semibold">Anyone</strong>. Click Deploy, authorize Google permissions, and copy the product URL.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form & URL Test Interface */}
          <div className="space-y-3 bg-white/3 p-5 rounded-xl border border-white/5">
            <label className="block text-sm font-semibold text-slate-300">
              Paste Apps Script Web App URL
            </label>
            <div className="flex space-x-2">
              <input
                id="script-url-input"
                type="text"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={config.scriptUrl}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  handleSaveConfig({ ...config, scriptUrl: val });
                  setTestResult(null); // Clear previous tests
                }}
                className="flex-1 px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
              />
              <button
                id="test-connection-btn"
                disabled={testing || !config.scriptUrl}
                onClick={handleTestConnection}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test API Link</span>
                )}
              </button>
            </div>
            
            {/* Live Test Response Banners */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start space-x-2 ${
                testResult.success 
                  ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300' 
                  : 'bg-rose-950/30 border-rose-500/20 text-rose-300'
              }`}>
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 shadow-[0_0_6px_rgba(52,211,153,0.5)] bg-slate-900 rounded-full" />
                    <div>
                      <strong className="font-semibold">Success! Connection Confirmed:</strong>
                      <p className="mt-0.5">Your Apps Script web app responded seamlessly and generated/verified sheet structures. Automated Sheets integration has been enabled!</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5 shadow-[0_0_6px_rgba(239,68,68,0.5)] bg-slate-900 rounded-full" />
                    <div>
                      <strong className="font-semibold">Connection Failed:</strong>
                      <p className="mt-0.5">{testResult.message}</p>
                      <p className="mt-1 text-slate-400 leading-normal">
                        Ensure you deployed as type "Web App", with access granted to "Anyone", and authorized Google access. Double check that the copied script url is correct.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/2 border-t border-white/8 flex justify-end space-x-2">
          <button
            id="wizard-done-button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-md cursor-pointer"
          >
            Finish Setup
          </button>
        </div>
      </div>
    </div>
  );
}
