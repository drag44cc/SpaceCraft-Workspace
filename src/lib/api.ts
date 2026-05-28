import { Workspace, Document, CanvasElement, GASConfig } from '../types';

// Storage Keys
const GAS_CONFIG_KEY = 'spacecraft_gas_config';
const LOCAL_WORKSPACES_KEY = 'spacecraft_local_workspaces';
const LOCAL_DOCS_KEY = 'spacecraft_local_docs';
const LOCAL_CANVAS_KEY = 'spacecraft_local_canvas';

// Default seed values for immediate play
const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'default-ws', name: 'Social Media Launch', created_at: new Date().toISOString() }
];

const DEFAULT_DOCS: Document[] = [
  {
    id: 'default-doc',
    workspace_id: 'default-ws',
    title: '🚀 Q3 Launch Creative Brief',
    content: JSON.stringify([
      { id: 'b1', type: 'heading1', text: 'Brand Theme: Cosmic Retro-Future' },
      { id: 'b2', type: 'paragraph', text: 'This workspace integrates your Notion-style text planner with a visual Miro-style whiteboard. All changes are tracked in Google Sheets when live synced, or stored in safe LocalStorage.' },
      { id: 'b3', type: 'heading2', text: '🎯 Pre-Launch Checklist' },
      { id: 'b4', type: 'checklist', text: 'Finalize brand guideline graphics (See Purple Circle on Canvas)', checked: true },
      { id: 'b5', type: 'checklist', text: 'Setup scheduling calendar for Instagram & Threads', checked: false },
      { id: 'b6', type: 'checklist', text: 'Draft standard post copy blocks in Sheets', checked: false },
      { id: 'b7', type: 'quote', text: '"Good social design is not what you see, but what you remember." - Art Director' },
      { id: 'b8', type: 'callout', text: '💡 Tip: Double-click anywhere on the Infinite Canvas of the right plane to add Sticky Notes. Drag from one node dot to another to connect them visually with self-healing lines!' }
    ]),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_CANVAS: CanvasElement[] = [
  {
    id: 'elem-1',
    workspace_id: 'default-ws',
    type: 'sticky',
    position_x: 120,
    position_y: 100,
    text_content: '📝 Copy briefs: Keep it short, Punchy!',
    color: 'yellow',
    updated_at: new Date().toISOString()
  },
  {
    id: 'elem-2',
    workspace_id: 'default-ws',
    type: 'sticky',
    position_x: 420,
    position_y: 100,
    text_content: '🎨 Color Scheme: Coral, Cosmic Grape & Gold',
    color: 'pink',
    updated_at: new Date().toISOString()
  },
  {
    id: 'elem-3',
    workspace_id: 'default-ws',
    type: 'circle',
    position_x: 280,
    position_y: 300,
    text_content: '✨ Main Editorial Theme',
    color: 'lavender',
    updated_at: new Date().toISOString()
  },
  {
    id: 'elem-4',
    workspace_id: 'default-ws',
    type: 'arrow',
    position_x: 0,
    position_y: 0,
    text_content: JSON.stringify({ fromId: 'elem-1', toId: 'elem-3' }),
    updated_at: new Date().toISOString()
  },
  {
    id: 'elem-5',
    workspace_id: 'default-ws',
    type: 'arrow',
    position_x: 0,
    position_y: 0,
    text_content: JSON.stringify({ fromId: 'elem-2', toId: 'elem-3' }),
    updated_at: new Date().toISOString()
  }
];

// Local Helpers
function getLocal<T>(key: string, defaultVal: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultVal;
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

// Global API Service
export const WorkspaceAPIService = {
  // Config Management
  getGASConfig(): GASConfig {
    return getLocal<GASConfig>(GAS_CONFIG_KEY, { scriptUrl: '', isLive: false });
  },

  setGASConfig(config: GASConfig): void {
    setLocal<GASConfig>(GAS_CONFIG_KEY, config);
  },

  // Remote fetch wrapper that detects GAS redirects & handles CORS issues beautifully using text/plain (avoids CORS Preflight failures!)
  async fetchGAS(params: Record<string, string>, postData?: object): Promise<{ success: boolean; data?: any; error?: string }> {
    const config = this.getGASConfig();
    if (!config.scriptUrl) {
      return { success: false, error: 'No Google Apps Script Web App URL is configured.' };
    }

    try {
      // Build URL with query params
      const urlObj = new URL(config.scriptUrl);
      Object.entries(params).forEach(([k, v]) => {
        urlObj.searchParams.set(k, v);
      });

      const options: RequestInit = {
        method: postData ? 'POST' : 'GET',
        // Redirect: 'follow' is standard in browsers to follow GAS 302 redirects
        redirect: 'follow',
      };

      if (postData) {
        // Critical: Using text/plain avoids browser preflight OPTIONS checks which can fail in GAS web app CORS headers sometimes.
        options.headers = {
          'Content-Type': 'text/plain;charset=utf-8'
        };
        options.body = JSON.stringify(postData);
      }

      const response = await fetch(urlObj.toString(), options);
      if (!response.ok) {
        throw new Error(`HTTP status error: ${response.status}`);
      }

      const json = await response.json();
      return json;
    } catch (err: any) {
      console.error('GAS Connection error:', err);
      return { success: false, error: err.message || err.toString() };
    }
  },

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({ action: 'getWorkspaces' });
      if (res.success && res.data) {
        // Sync local cache
        setLocal(LOCAL_WORKSPACES_KEY, res.data);
        return res.data as Workspace[];
      }
      console.warn('GAS workspace fetch failed, using local cache:', res.error);
    }
    return getLocal<Workspace[]>(LOCAL_WORKSPACES_KEY, DEFAULT_WORKSPACES);
  },

  async saveWorkspace(workspace: Workspace): Promise<boolean> {
    // 1. Save locally
    const current = getLocal<Workspace[]>(LOCAL_WORKSPACES_KEY, DEFAULT_WORKSPACES);
    const existingIdx = current.findIndex(w => w.id === workspace.id);
    if (existingIdx !== -1) {
      current[existingIdx] = workspace;
    } else {
      current.push(workspace);
    }
    setLocal(LOCAL_WORKSPACES_KEY, current);

    // 2. Sync to GAS
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({}, {
        action: 'saveWorkspace',
        data: workspace
      });
      return res.success;
    }
    return true;
  },

  async deleteWorkspace(id: string): Promise<boolean> {
    // 1. Delete locally
    const current = getLocal<Workspace[]>(LOCAL_WORKSPACES_KEY, DEFAULT_WORKSPACES);
    setLocal(LOCAL_WORKSPACES_KEY, current.filter(w => w.id !== id));

    // Cascade delete docs and canvas locally
    const docs = getLocal<Document[]>(LOCAL_DOCS_KEY, DEFAULT_DOCS);
    setLocal(LOCAL_DOCS_KEY, docs.filter(d => d.workspace_id !== id));

    const canvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
    setLocal(LOCAL_CANVAS_KEY, canvas.filter(c => c.workspace_id !== id));

    // 2. Sync to GAS
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({}, {
        action: 'deleteWorkspace',
        id: id
      });
      return res.success;
    }
    return true;
  },

  // Documents
  async getDocuments(workspaceId: string): Promise<Document[]> {
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({ action: 'getDocs', workspace_id: workspaceId });
      if (res.success && res.data) {
        // Update local docs
        const allDocs = getLocal<Document[]>(LOCAL_DOCS_KEY, DEFAULT_DOCS);
        const filtered = allDocs.filter(d => d.workspace_id !== workspaceId);
        const updated = [...filtered, ...res.data];
        setLocal(LOCAL_DOCS_KEY, updated);
        return res.data as Document[];
      }
      console.warn('GAS documents fetch failed, using local cache:', res.error);
    }

    const allDocs = getLocal<Document[]>(LOCAL_DOCS_KEY, DEFAULT_DOCS);
    return allDocs.filter(d => d.workspace_id === workspaceId);
  },

  async saveDocument(doc: Document): Promise<boolean> {
    // 1. Save locally
    const allDocs = getLocal<Document[]>(LOCAL_DOCS_KEY, DEFAULT_DOCS);
    const existingIdx = allDocs.findIndex(d => d.id === doc.id);
    if (existingIdx !== -1) {
      allDocs[existingIdx] = doc;
    } else {
      allDocs.push(doc);
    }
    setLocal(LOCAL_DOCS_KEY, allDocs);

    // 2. Sync to GAS
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({}, {
        action: 'saveDoc',
        data: doc
      });
      return res.success;
    }
    return true;
  },

  // Canvas Elements
  async getCanvasElements(workspaceId: string): Promise<CanvasElement[]> {
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({ action: 'getCanvas', workspace_id: workspaceId });
      if (res.success && res.data) {
        // Update local canvas cache
        const allCanvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
        const filtered = allCanvas.filter(c => c.workspace_id !== workspaceId);
        const updated = [...filtered, ...res.data];
        setLocal(LOCAL_CANVAS_KEY, updated);
        return res.data as CanvasElement[];
      }
      console.warn('GAS canvas elements fetch failed, using local cache:', res.error);
    }

    const allCanvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
    return allCanvas.filter(c => c.workspace_id === workspaceId);
  },

  async saveCanvasElement(element: CanvasElement): Promise<boolean> {
    // 1. Save locally
    const allCanvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
    const existingIdx = allCanvas.findIndex(c => c.id === element.id);
    if (existingIdx !== -1) {
      allCanvas[existingIdx] = element;
    } else {
      allCanvas.push(element);
    }
    setLocal(LOCAL_CANVAS_KEY, allCanvas);

    // 2. Sync to GAS
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({}, {
        action: 'saveCanvasElement',
        data: element
      });
      return res.success;
    }
    return true;
  },

  async saveCanvasBatch(workspaceId: string, elements: CanvasElement[]): Promise<boolean> {
    // 1. Save locally
    const allCanvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
    const filtered = allCanvas.filter(c => c.workspace_id !== workspaceId);
    const updated = [...filtered, ...elements];
    setLocal(LOCAL_CANVAS_KEY, updated);

    // 2. Sync to GAS
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({}, {
        action: 'saveCanvasBatch',
        workspace_id: workspaceId,
        elements: elements
      });
      return res.success;
    }
    return true;
  },

  async deleteCanvasElement(id: string, workspaceId: string): Promise<boolean> {
    // 1. Delete locally
    const allCanvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
    setLocal(LOCAL_CANVAS_KEY, allCanvas.filter(c => c.id !== id));

    // Also cascaded delete arrows pointing to or from this node if type is deleted
    const updatedCanvas = getLocal<CanvasElement[]>(LOCAL_CANVAS_KEY, DEFAULT_CANVAS);
    const cleanCanvasState = updatedCanvas.filter(c => {
      if (c.type === 'arrow') {
        try {
          const arrowObj = JSON.parse(c.text_content);
          if (arrowObj.fromId === id || arrowObj.toId === id) {
            return false;
          }
        } catch {
          return true;
        }
      }
      return true;
    });
    setLocal(LOCAL_CANVAS_KEY, cleanCanvasState);

    // 2. Sync to GAS
    const config = this.getGASConfig();
    if (config.isLive && config.scriptUrl) {
      const res = await this.fetchGAS({}, {
        action: 'deleteCanvasElement',
        id: id
      });
      return res.success;
    }
    return true;
  },

  // Connection validation run tests
  async testGASConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const options: RequestInit = {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'test' })
      };
      
      const res = await fetch(url, options);
      if (!res.ok) {
        return { success: false, message: `HTTP status error: ${res.status}` };
      }
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message || 'Write Connection success!' };
      } else {
        return { success: false, message: data.error || 'Server rejected with error.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || err.toString() };
    }
  }
};
