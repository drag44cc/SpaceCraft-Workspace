import React, { useState, useEffect, useRef } from 'react';
import { Document, DocumentBlock } from '../types';
import { 
  Heading1, 
  Heading2, 
  AlignLeft, 
  List, 
  CheckSquare, 
  Quote, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Check, 
  FileText,
  Clock,
  Menu,
  Sparkles
} from 'lucide-react';

interface DocumentEditorProps {
  document: Document | null;
  onSave: (doc: Document) => Promise<boolean>;
  isSyncing: boolean;
}

export default function DocumentEditor({ document, onSave, isSyncing }: DocumentEditorProps) {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showInserterForIdx, setShowInserterForIdx] = useState<number | null>(null);
  const [editedSinceSave, setEditedSinceSave] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load document contents on mount/update
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      try {
        const parsed = JSON.parse(document.content) as DocumentBlock[];
        setBlocks(Array.isArray(parsed) ? parsed : []);
      } catch {
        // Fallback for raw text
        setBlocks([
          { id: 'b-init', type: 'paragraph', text: document.content || 'Start taking notes here...' }
        ]);
      }
      setEditedSinceSave(false);
    } else {
      setTitle('');
      setBlocks([]);
    }
  }, [document]);

  // Handle title input
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setEditedSinceSave(true);
  };

  // Handle block content values
  const handleBlockTextChange = (blockId: string, text: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, text } : b));
    setEditedSinceSave(true);
  };

  const handleCheckboxToggle = (blockId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b));
    setEditedSinceSave(true);
  };

  // Block creation helpers
  const createNewBlock = (type: DocumentBlock['type'], text: string = ''): DocumentBlock => {
    return {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      text,
      checked: type === 'checklist' ? false : undefined
    };
  };

  // Add block at specified index
  const addBlockAt = (type: DocumentBlock['type'], idx: number) => {
    const newBlock = createNewBlock(type);
    setBlocks(prev => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, newBlock);
      return copy;
    });
    setActiveBlockId(newBlock.id);
    setShowInserterForIdx(null);
    setEditedSinceSave(true);
  };

  const deleteBlock = (blockId: string) => {
    // Prevent deleting the sole remaining block
    if (blocks.length <= 1) {
      setBlocks([createNewBlock('paragraph')]);
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    setEditedSinceSave(true);
  };

  const moveBlock = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === blocks.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    setBlocks(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setEditedSinceSave(true);
  };

  // Keyboard handlers (Enter creates a new paragraph block below, Backspace deletes empty block)
  const handleBlockKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number, block: DocumentBlock) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlockAt('paragraph', idx);
    } else if (e.key === 'Backspace' && block.text === '' && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
      // Focus previous block if available
      const prevIdx = idx > 0 ? idx - 1 : 0;
      if (blocks[prevIdx]) {
        setActiveBlockId(blocks[prevIdx].id);
      }
    }
  };

  // Save changes explicitly
  const handleSaveDocument = async () => {
    if (!document) return;
    
    setStatusMessage('Saving to Sheets...');
    const updatedDoc: Document = {
      ...document,
      title: title || 'Untitled Document',
      content: JSON.stringify(blocks),
      updated_at: new Date().toISOString()
    };

    const success = await onSave(updatedDoc);
    if (success) {
      setEditedSinceSave(false);
      setStatusMessage('All changes saved! ✨');
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage('Save failed. Offline fallback active.');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleKeyDownTitle = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus first block
      if (blocks.length > 0) {
        setActiveBlockId(blocks[0].id);
      }
    }
  };

  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center glass bg-slate-950/25 rounded-2xl min-h-[400px]">
        <div className="p-4 bg-white/5 text-slate-400 rounded-full mb-3 border border-white/5">
          <FileText className="w-8 h-8" />
        </div>
        <h4 className="font-semibold text-white text-sm">No Document Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Select or activate a workspace above to edit structured briefs.</p>
      </div>
    );
  }

  return (
    <div id="document-editor-container" className="flex-1 flex flex-col glass bg-slate-950/25 rounded-2xl h-full overflow-hidden shadow-lg">
      
      {/* Save Action Options */}
      <div className="px-5 py-3.5 bg-white/3 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Notion Document Workspace</span>
          </span>
          {editedSinceSave && (
            <span className="bg-amber-500/10 text-amber-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {statusMessage && (
            <span className="text-xs text-slate-300 font-medium animate-fadeIn">
              {statusMessage}
            </span>
          )}
          
          <button
            id="save-document-btn"
            onClick={handleSaveDocument}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition ${
              editedSinceSave 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40' 
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Sheet</span>
          </button>
        </div>
      </div>

      {/* Editor Main Portal */}
      <div className="p-6 overflow-y-auto flex-1 space-y-4 max-h-[calc(100vh-250px)]">
        
        {/* Title Input */}
        <input
          id="document-title-input"
          type="text"
          placeholder="Give your brief a title..."
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={handleKeyDownTitle}
          className="w-full text-2xl font-bold text-white placeholder-slate-600 bg-transparent focus:outline-none focus:ring-0 mb-4 border-l-4 border-blue-500/50 pl-3.5"
        />

        {/* Dynamic Blocks Wrapper */}
        <div className="space-y-3">
          {blocks.map((block, idx) => {
            const isEditing = activeBlockId === block.id;

            return (
              <div 
                id={`document-block-${block.id}`}
                key={block.id} 
                className="group relative flex items-start space-x-2.5 p-1 hover:bg-white/3 rounded-lg transition-colors duration-150"
                onMouseEnter={() => setShowInserterForIdx(idx)}
                onMouseLeave={() => setShowInserterForIdx(null)}
              >
                {/* Block Controls Column */}
                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition absolute -left-12 top-1.5 z-20 bg-slate-900/90 backdrop-blur px-1.5 py-0.5 rounded-md border border-white/10 shadow-xl">
                  <button
                    id={`move-block-up-${block.id}`}
                    type="button"
                    onClick={() => moveBlock(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 disabled:opacity-20"
                    title="Move up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    id={`move-block-down-${block.id}`}
                    type="button"
                    onClick={() => moveBlock(idx, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 disabled:opacity-20"
                    title="Move down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    id={`delete-block-btn-${block.id}`}
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="p-1 hover:bg-rose-950 hover:text-rose-400 rounded text-slate-500"
                    title="Delete block"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Block Symbol Layout */}
                <div className="w-5 mt-2 flex-shrink-0 flex items-center justify-center text-slate-500">
                  {block.type === 'heading1' && <Heading1 className="w-3.5 h-3.5 text-blue-400" />}
                  {block.type === 'heading2' && <Heading2 className="w-3.5 h-3.5 text-blue-400" />}
                  {block.type === 'paragraph' && <AlignLeft className="w-3.5 h-3.5 text-slate-500" />}
                  {block.type === 'bullet' && <List className="w-3.5 h-3.5 text-blue-400" />}
                  {block.type === 'checklist' && (
                    <input
                      id={`checklist-input-${block.id}`}
                      type="checkbox"
                      checked={block.checked || false}
                      onChange={() => handleCheckboxToggle(block.id)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                  {block.type === 'quote' && <Quote className="w-3.5 h-3.5 text-slate-500 fill-slate-500" />}
                  {block.type === 'callout' && <AlertCircle className="w-3.5 h-3.5 text-blue-400" />}
                </div>

                {/* Text Block Inputs */}
                <div className="flex-1">
                  {block.type === 'paragraph' && (
                    <textarea
                      id={`textarea-block-${block.id}`}
                      placeholder="Type a paragraph of brief or copy here..."
                      value={block.text}
                      onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onKeyDown={(e) => handleBlockKeyDown(e, idx, block)}
                      rows={1}
                      className="w-full resize-none border-0 p-0 text-sm text-slate-200 placeholder-slate-600 bg-transparent focus:ring-0 focus:outline-none leading-relaxed py-1"
                      style={{ height: 'auto', minHeight: '1.5em' }}
                    />
                  )}

                  {block.type === 'heading1' && (
                    <textarea
                      id={`textarea-block-${block.id}`}
                      placeholder="Heading 1"
                      value={block.text}
                      onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onKeyDown={(e) => handleBlockKeyDown(e, idx, block)}
                      rows={1}
                      className="w-full resize-none border-0 p-0 text-lg font-bold text-white placeholder-slate-600 bg-transparent focus:ring-0 focus:outline-none py-1"
                    />
                  )}

                  {block.type === 'heading2' && (
                    <textarea
                      id={`textarea-block-${block.id}`}
                      placeholder="Heading 2"
                      value={block.text}
                      onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onKeyDown={(e) => handleBlockKeyDown(e, idx, block)}
                      rows={1}
                      className="w-full resize-none border-0 p-0 text-base font-semibold text-white placeholder-slate-600 bg-transparent focus:ring-0 focus:outline-none py-1"
                    />
                  )}

                  {(block.type === 'bullet' || block.type === 'checklist') && (
                    <textarea
                      id={`textarea-block-${block.id}`}
                      placeholder={block.type === 'bullet' ? 'List item...' : 'Task checklist item...'}
                      value={block.text}
                      onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onKeyDown={(e) => handleBlockKeyDown(e, idx, block)}
                      rows={1}
                      className={`w-full resize-none border-0 p-0 text-sm text-slate-200 placeholder-slate-600 bg-transparent focus:ring-0 focus:outline-none py-1 ${
                        block.checked ? 'line-through text-slate-500' : ''
                      }`}
                    />
                  )}

                  {block.type === 'quote' && (
                    <textarea
                      id={`textarea-block-${block.id}`}
                      placeholder="Write a notable quote or copy hook..."
                      value={block.text}
                      onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onKeyDown={(e) => handleBlockKeyDown(e, idx, block)}
                      rows={1}
                      className="w-full resize-none border-l-2 border-blue-500/50 pl-3 py-1.5 bg-white/3 text-sm italic text-slate-300 placeholder-slate-600 focus:ring-0 focus:outline-none"
                    />
                  )}

                  {block.type === 'callout' && (
                    <textarea
                      id={`textarea-block-${block.id}`}
                      placeholder="Enter a strategic callout or prompt guide..."
                      value={block.text}
                      onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onKeyDown={(e) => handleBlockKeyDown(e, idx, block)}
                      rows={1}
                      className="w-full resize-none border-0 bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-0 focus:outline-none"
                    />
                  )}
                </div>

                {/* Inserter Popup Hub inline hover */}
                {showInserterForIdx === idx && (
                  <div className="absolute left-1/2 bottom-[-16px] transform -translate-x-1/2 flex items-center bg-slate-900 shadow-2xl border border-white/10 rounded-full px-2 py-1 space-x-1.5 z-30 transition scale-95 hover:scale-100">
                    <button
                      id={`add-block-paragraph-btn-${block.id}`}
                      onClick={() => addBlockAt('paragraph', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Paragraph Block"
                    >
                      <AlignLeft className="w-3 h-3 text-slate-400" />
                      <span className="scale-90 text-[10px]">T</span>
                    </button>
                    <button
                      id={`add-block-h1-btn-${block.id}`}
                      onClick={() => addBlockAt('heading1', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Heading 1"
                    >
                      <Heading1 className="w-3 h-3 text-blue-400" />
                    </button>
                    <button
                      id={`add-block-h2-btn-${block.id}`}
                      onClick={() => addBlockAt('heading2', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Heading 2"
                    >
                      <Heading2 className="w-3 h-3 text-blue-400" />
                    </button>
                    <button
                      id={`add-block-bullet-btn-${block.id}`}
                      onClick={() => addBlockAt('bullet', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Bullet List"
                    >
                      <List className="w-3 h-3 text-blue-400" />
                    </button>
                    <button
                      id={`add-block-checklist-btn-${block.id}`}
                      onClick={() => addBlockAt('checklist', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Checklist Item"
                    >
                      <CheckSquare className="w-3 h-3 text-blue-400" />
                    </button>
                    <button
                      id={`add-block-quote-btn-${block.id}`}
                      onClick={() => addBlockAt('quote', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Quote Block"
                    >
                      <Quote className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      id={`add-block-callout-btn-${block.id}`}
                      onClick={() => addBlockAt('callout', idx)}
                      className="p-1 hover:bg-white/10 rounded-full text-xs text-slate-300 flex items-center space-x-0.5 px-1.5 transition"
                      title="Callout Highlight"
                    >
                      <AlertCircle className="w-3 h-3 text-blue-400" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tip on typing instructions */}
        <div className="pt-8 border-t border-white/5 text-[11px] text-slate-500 flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Press Enter at the end of a block to add a paragraph. Use controls on hover to delete and rearrange.</span>
        </div>
      </div>
    </div>
  );
}
