import React, { useState } from 'react';
import { Workspace } from '../types';
import { 
  Folder, 
  Plus, 
  Trash2, 
  Layers, 
  FolderOpen,
  X,
  Check
} from 'lucide-react';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

export default function WorkspaceSelector({
  workspaces,
  selectedWorkspaceId,
  onSelect,
  onCreate,
  onDelete
}: WorkspaceSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewWorkspaceName('');
    setIsAdding(false);
  };

  const handleDeleteRequest = (id: string) => {
    // Under guidelines: Always prompt with explicit user confirmation dialog on destructive action
    const workspace = workspaces.find(w => w.id === id);
    if (!workspace) return;
    
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col space-y-3 font-sans">
      {/* Workspace Headline Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Workspaces</span>
        </span>
        
        {!isAdding && (
          <button
            id="add-workspace-toggle-btn"
            onClick={() => setIsAdding(true)}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Create New Workspace"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Adding Form inline */}
      {isAdding && (
        <form onSubmit={handleCreateSubmit} className="flex space-x-1.5 animate-fadeIn">
          <input
            id="new-workspace-input"
            autoFocus
            type="text"
            placeholder="Client/Project Name..."
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
          <button
            id="confirm-add-workspace-btn"
            type="submit"
            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition shadow-md shadow-blue-900/40"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            id="cancel-add-workspace-btn"
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewWorkspaceName('');
            }}
            className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Grid List of Available Workspaces */}
      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
        {workspaces.map((ws) => {
          const isSelected = ws.id === selectedWorkspaceId;
          return (
            <div 
              id={`workspace-item-${ws.id}`}
              key={ws.id} 
              className={`group flex items-center justify-between px-3 py-2 rounded-xl transition text-xs font-medium cursor-pointer border ${
                isSelected 
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/35 shadow-md shadow-blue-950/20' 
                  : 'bg-white/4 hover:bg-white/8 border-white/5 text-slate-300'
              }`}
            >
              <div 
                className="flex-1 flex items-center space-x-2 mr-2 overflow-hidden"
                onClick={() => onSelect(ws.id)}
              >
                {isSelected ? (
                  <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="truncate">{ws.name}</span>
              </div>

              {/* Action Operations */}
              {confirmDeleteId === ws.id ? (
                <div className="flex items-center space-x-1.5 z-10 animate-pulse">
                  <button
                    id="confirm-delete-action-btn"
                    onClick={handleConfirmDelete}
                    className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded hover:bg-rose-500 transition"
                    title="Confirm Delete"
                  >
                    Confirm
                  </button>
                  <button
                    id="cancel-delete-action-btn"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-1.5 py-0.5 bg-white/10 text-slate-300 text-[10px] rounded hover:bg-white/20 transition"
                    title="Cancel Delete"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  id={`delete-workspace-btn-${ws.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRequest(ws.id);
                  }}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-950/50 hover:text-rose-400 transition ${
                    isSelected ? 'text-blue-300/40 group-hover:text-blue-300' : 'text-slate-500'
                  }`}
                  title="Delete Workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {workspaces.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">No workspaces. Click "+" to create one.</p>
        )}
      </div>

      {/* Simple explanation if deleting workspaces */}
      {confirmDeleteId && (
        <div className="p-2 bg-rose-950/30 border border-rose-500/20 rounded-lg text-[10px] text-rose-300 leading-normal animate-fadeIn">
          ⚠️ Deleting a workspace deletes the document and all coordinates in that client project! Confirm with the active item button.
        </div>
      )}
    </div>
  );
}
