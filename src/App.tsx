import { useState, useEffect } from 'react';
import { Workspace, Document, CanvasElement, GASConfig, User } from './types';
import { WorkspaceAPIService } from './lib/api';
import WorkspaceSelector from './components/WorkspaceSelector';
import SetupWizard from './components/SetupWizard';
import DocumentEditor from './components/DocumentEditor';
import InfiniteCanvas from './components/InfiniteCanvas';
import LoginScreen from './components/LoginScreen';
import UserProfileModal from './components/UserProfileModal';

import { 
  Rocket, 
  Settings, 
  Database, 
  Sparkles, 
  Layers, 
  Cpu, 
  Columns, 
  FileText, 
  Move,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ExternalLink,
  User as UserIcon
} from 'lucide-react';

export default function App() {
  // State elements
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  
  // App views
  const [layoutMode, setLayoutMode] = useState<'split' | 'document' | 'canvas'>('split');
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [gasConfig, setGasConfig] = useState<GASConfig>({ scriptUrl: '', isLive: false });
  
  // Loading & syncing statuses
  const [loading, setLoading] = useState(true);
  const [syncingDocs, setSyncingDocs] = useState(false);
  const [syncingCanvas, setSyncingCanvas] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  // User Authentication States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const active = localStorage.getItem('spacecraft_active_user');
    if (active) {
      try {
        return JSON.parse(active);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Initial load
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      // Read current GAS configuration
      const config = WorkspaceAPIService.getGASConfig();
      setGasConfig(config);

      try {
        const fetchedWorkspaces = await WorkspaceAPIService.getWorkspaces();
        setWorkspaces(fetchedWorkspaces);
        
        if (fetchedWorkspaces.length > 0) {
          setSelectedWorkspaceId(fetchedWorkspaces[0].id);
        }
      } catch (err) {
        console.error('Failed to init workspaces', err);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // Fetch documents and whiteboard assets whenever workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const loadWorkspaceContent = async () => {
      setLoading(true);
      try {
        // 1. Fetch related documents
        const docs = await WorkspaceAPIService.getDocuments(selectedWorkspaceId);
        if (docs.length > 0) {
          setCurrentDocument(docs[0]);
        } else {
          // Initialize a clean default brief document for this new workspace
          const defaultDoc: Document = {
            id: `doc-${Date.now()}`,
            workspace_id: selectedWorkspaceId,
            title: '✍️ Project Content Strategy',
            content: JSON.stringify([
              { id: 'b1', type: 'heading1', text: 'Overview & Distribution Strategy' },
              { id: 'b2', type: 'paragraph', text: 'Welcome to your new Workspace planner. Use this block editor to detail copy, assets checklist, and content briefs.' },
              { id: 'b3', type: 'callout', text: '💡 Best Practice: Arrange planning cards in the whiteboard canvas on the side to layout team milestones.' }
            ]),
            updated_at: new Date().toISOString()
          };
          await WorkspaceAPIService.saveDocument(defaultDoc);
          setCurrentDocument(defaultDoc);
        }

        // 2. Fetch related whiteboard canvas coordinates
        const canvasItems = await WorkspaceAPIService.getCanvasElements(selectedWorkspaceId);
        setCanvasElements(canvasItems);

      } catch (err) {
        console.error('Error fetching workspace content:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceContent();
  }, [selectedWorkspaceId]);

  // Action: Create workspace
  const handleCreateWorkspace = async (name: string) => {
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      created_at: new Date().toISOString()
    };
    
    setLoading(true);
    try {
      const success = await WorkspaceAPIService.saveWorkspace(newWs);
      if (success) {
        setWorkspaces(prev => [...prev, newWs]);
        setSelectedWorkspaceId(newWs.id);
        triggerAlert('success', `Created workspace "${name}" successfully!`);
      }
    } catch (err) {
      triggerAlert('warning', 'Save failed. Operating in Offline mode.');
    } finally {
      setLoading(false);
    }
  };

  // Action: Delete workspace under confirmation guidelines
  const handleDeleteWorkspace = async (id: string) => {
    setLoading(true);
    try {
      const activeDelete = workspaces.find(w => w.id === id);
      const success = await WorkspaceAPIService.deleteWorkspace(id);
      if (success) {
        const remaining = workspaces.filter(w => w.id !== id);
        setWorkspaces(remaining);
        triggerAlert('info', `Removed workspace "${activeDelete?.name || 'Client'}"`);
        
        if (remaining.length > 0) {
          setSelectedWorkspaceId(remaining[0].id);
        } else {
          setSelectedWorkspaceId('');
          setCurrentDocument(null);
          setCanvasElements([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Action: Save documents
  const handleSaveDocument = async (updatedDoc: Document): Promise<boolean> => {
    setSyncingDocs(true);
    try {
      const success = await WorkspaceAPIService.saveDocument(updatedDoc);
      if (success) {
        setCurrentDocument(updatedDoc);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    } finally {
      setSyncingDocs(false);
    }
  };

  // Action: Whiteboard element movement coordinates save
  const handleSaveCanvasElement = async (elem: CanvasElement) => {
    // Optimistic state updates is handled within InfiniteCanvas. Just trigger GAS sync on the background quietly.
    setSyncingCanvas(true);
    try {
      await WorkspaceAPIService.saveCanvasElement(elem);
    } catch (err) {
      console.error('Failed syncing node position:', err);
    } finally {
      setSyncingCanvas(false);
    }
  };

  const handleElementsChange = (updatedElements: CanvasElement[]) => {
    setCanvasElements(updatedElements);
  };

  const handleDeleteCanvasElement = async (id: string) => {
    setSyncingCanvas(true);
    try {
      await WorkspaceAPIService.deleteCanvasElement(id, selectedWorkspaceId);
      // Sync local state
      setCanvasElements(prev => prev.filter(c => c.id !== id && (c.type !== 'arrow' || !c.text_content.includes(id))));
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingCanvas(false);
    }
  };

  // Setup wizard callback
  const handleConfigChanged = (updatedConfig: GASConfig) => {
    setGasConfig(updatedConfig);
    // Refresh workspaces with custom sync links
    const reload = async () => {
      setLoading(true);
      try {
        const f = await WorkspaceAPIService.getWorkspaces();
        setWorkspaces(f);
        if (f.length > 0) {
          setSelectedWorkspaceId(f[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reload();

    triggerAlert('success', updatedConfig.isLive ? 'Live Spreadsheet Sync Active! 💫' : 'Offline Sandbox Enabled.');
  };

  // Local alert helper
  const triggerAlert = (type: 'success' | 'warning' | 'info', message: string) => {
    setSystemAlert({ type, message });
    setTimeout(() => setSystemAlert(null), 3000);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('spacecraft_active_user', JSON.stringify(updatedUser));
    
    // Also update in accounts list so edits persist
    const accountsData = localStorage.getItem('spacecraft_accounts');
    if (accountsData) {
      try {
        const accounts = JSON.parse(accountsData);
        const idx = accounts.findIndex((acc: any) => acc.email.toLowerCase() === updatedUser.email.toLowerCase());
        if (idx !== -1) {
          accounts[idx] = {
            ...accounts[idx],
            name: updatedUser.name,
            role: updatedUser.role,
            color: updatedUser.avatarColor
          };
          localStorage.setItem('spacecraft_accounts', JSON.stringify(accounts));
        }
      } catch (err) {
        console.error(err);
      }
    }
    triggerAlert('success', 'Profile updated successfully!');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('spacecraft_active_user');
    triggerAlert('info', 'Logged out of terminal session.');
  };

  if (!currentUser) {
    return <LoginScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200 antialiased overflow-hidden relative">
      
      {/* Ambient background blur circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/8 blur-[120px] pointer-events-none" />

      {/* Top Professional Dashboard Header */}
      <header className="glass bg-slate-950/45 border-b border-white/10 text-white px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-3.5 md:space-y-0 shadow-2xl shrink-0 z-10">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/15 border border-blue-500/20 rounded-xl flex items-center justify-center shadow-md shadow-blue-900/40">
            <Rocket className="w-5 h-5 text-blue-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white leading-none">SpaceCraft Workspace</h1>
              <span className="bg-blue-500/15 text-blue-300 font-mono text-[10px] uppercase font-semibold border border-blue-400/20 px-1.5 py-0.5 rounded">v1.2</span>
            </div>
            <p className="text-[11px] text-slate-400/90 mt-1">Notion notes + Miro flowchart board on lightweight Google Sheets</p>
          </div>
        </div>

        {/* Layout Focus Toggles */}
        <div className="flex items-center bg-white/5 border border-white/5 p-1 rounded-full self-start md:self-auto shadow-inner">
          <button
            id="layout-toggle-split-btn"
            onClick={() => setLayoutMode('split')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              layoutMode === 'split' 
                ? 'bg-white text-slate-950 shadow-md scale-100' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split Workspace</span>
          </button>
          
          <button
            id="layout-toggle-doc-btn"
            onClick={() => setLayoutMode('document')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              layoutMode === 'document' 
                ? 'bg-white text-slate-950 shadow-md scale-100' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Planner Doc</span>
          </button>

          <button
            id="layout-toggle-canvas-btn"
            onClick={() => setLayoutMode('canvas')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              layoutMode === 'canvas' 
                ? 'bg-white text-slate-950 shadow-md scale-100' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Whiteboard Map</span>
          </button>
        </div>

        {/* Database Sync Operations & Config Button */}
        <div className="flex items-center space-x-3.5">
          <div className="flex flex-col items-end hidden sm:flex">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${gasConfig.isLive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'}`}></span>
              <span className="text-xs font-semibold text-slate-200">
                {gasConfig.isLive ? 'Live Sheets Database' : 'Sandbox Storage'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">
              {gasConfig.isLive ? 'Synced automatically' : 'Local device cache'}
            </span>
          </div>

          <button
            id="db-settings-toggle-btn"
            onClick={() => setIsSetupOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border ${
              gasConfig.isLive 
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white shadow-sm'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Database Setup</span>
          </button>

          {/* Holographic User Profile Trigger Button */}
          <button
            id="profile-trigger-btn"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center space-x-2 pl-2.5 pr-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition cursor-pointer"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white ${
              currentUser.avatarColor === 'indigo' ? 'bg-indigo-500' :
              currentUser.avatarColor === 'emerald' ? 'bg-emerald-500' :
              currentUser.avatarColor === 'rose' ? 'bg-rose-500' :
              currentUser.avatarColor === 'amber' ? 'bg-amber-500' :
              currentUser.avatarColor === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'
            }`}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start leading-none text-left">
              <span className="text-xs font-bold text-white max-w-[100px] truncate">{currentUser.name}</span>
              <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[100px]">{currentUser.role}</span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Framework Grid Panel */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Sidebar on left */}
        <aside className="w-full md:w-[260px] glass bg-slate-950/20 border-b md:border-b-0 md:border-r border-white/5 px-5 py-6 shrink-0 flex flex-col space-y-6 overflow-y-auto z-10">
          
          {/* Workspace Switcher */}
          <WorkspaceSelector
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            onSelect={setSelectedWorkspaceId}
            onCreate={handleCreateWorkspace}
            onDelete={handleDeleteWorkspace}
          />

          {/* Quick Informational Stats */}
          <div className="p-4 bg-white/3 border border-white/5 rounded-2xl flex flex-col space-y-3.5 text-xs shadow-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-blue-450" />
              <span>Workspace Info</span>
            </span>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-mono font-medium text-slate-200">
                  {gasConfig.isLive ? 'Sheets + GAS' : 'LocalStorage'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Canvas items:</span>
                <span className="font-mono font-medium text-slate-200">
                  {canvasElements.length} rows
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Document blocks:</span>
                <span className="font-mono font-medium text-slate-200">
                  {currentDocument ? JSON.parse(currentDocument.content).length : 0} items
                </span>
              </div>
            </div>
            {/* Live status progress bar */}
            <div className="mt-1 pt-2 border-t border-white/5">
              <div className="flex items-center space-x-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${gasConfig.isLive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'}`}></span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold font-sans">Live Status</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className={`h-full ${gasConfig.isLive ? 'bg-blue-505 w-full bg-blue-500' : 'bg-amber-500 w-1/4 animate-pulse'}`} />
              </div>
            </div>
          </div>

          {/* Setup tutorial instructions promo card */}
          <div className="bg-white/2 p-4 rounded-2xl border border-white/8 flex flex-col space-y-2 text-xs shadow-sm shadow-black/10">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <strong className="font-bold text-slate-100">Did you know?</strong>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              You can connect multiple devices to the same Google Sheet and watch elements synchronize coordinate changes in real-time.
            </p>
          </div>

          {/* Elegant Date Indicator */}
          <div className="mt-auto pt-4 border-t border-white/5 hidden md:block text-[10px] text-slate-500 font-mono space-y-1">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-600" />
              <span>Operator Session Time</span>
            </div>
            <div>2026-05-28 05:11:00</div>
          </div>
        </aside>

        {/* Content plane */}
        <section className="flex-1 p-6 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Active alert bubbles */}
          {systemAlert && (
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl border animate-fadeIn flex items-center space-x-2 ${
              systemAlert.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-300 backdrop-blur'
                : systemAlert.type === 'warning'
                  ? 'bg-amber-950/80 border-amber-500/20 text-amber-300 backdrop-blur'
                  : 'bg-blue-950/80 border-blue-500/20 text-blue-300 backdrop-blur'
            }`}>
              <span>{systemAlert.message}</span>
            </div>
          )}

          {/* Loading Plane Block */}
          {loading ? (
            <div className="flex-1 glass bg-slate-950/20 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
              <span className="text-xs text-slate-400 font-medium font-mono">Loading Workspace rows...</span>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex-1 glass bg-slate-950/25 rounded-2xl flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto shadow-2xl">
              <div className="p-4 bg-white/5 text-blue-400 rounded-full mb-4 border border-white/5">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-white font-bold text-base">Begin SpaceCraft Journey</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-[325px] leading-relaxed">
                Create your first campaign project client workspace in the left panel list. Setup Google Sheets when you are ready to persist live data!
              </p>
            </div>
          ) : (
            /* Flexible Layout Grid panels */
            <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
              
              {/* Left Column: Notion-style planner document editor */}
              {(layoutMode === 'split' || layoutMode === 'document') && (
                <div className={`flex flex-col h-full ${
                  layoutMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
                }`}>
                  <DocumentEditor
                    document={currentDocument}
                    onSave={handleSaveDocument}
                    isSyncing={syncingDocs}
                  />
                </div>
              )}

              {/* Right Column: Miro-style visual infinite canvas */}
              {(layoutMode === 'split' || layoutMode === 'canvas') && (
                <div className={`flex flex-col h-full ${
                  layoutMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
                }`}>
                  <InfiniteCanvas
                    elements={canvasElements}
                    onElementsChange={handleElementsChange}
                    onSaveElement={handleSaveCanvasElement}
                    onDeleteElement={handleDeleteCanvasElement}
                    isSyncing={syncingCanvas}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Setup wizard configuration screen */}
      <SetupWizard
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigChanged={handleConfigChanged}
      />

      {/* User profile details modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
      />
    </div>
  );
}
