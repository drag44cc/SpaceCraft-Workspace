import React, { useState, useEffect, useRef } from 'react';
import { CanvasElement, CanvasElementType, ConnectionArrow } from '../types';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  MousePointer, 
  Hand, 
  ArrowRight, 
  StickyNote, 
  Circle, 
  Square,
  HelpCircle,
  Trash2,
  RefreshCw,
  Palette
} from 'lucide-react';

interface InfiniteCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onSaveElement: (element: CanvasElement) => void;
  onDeleteElement: (id: string) => void;
  isSyncing: boolean;
}

export default function InfiniteCanvas({
  elements,
  onElementsChange,
  onSaveElement,
  onDeleteElement,
  isSyncing
}: InfiniteCanvasProps) {
  // Canvas configuration and view status
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Connection dragging state
  const [activeConnectionStartId, setActiveConnectionStartId] = useState<string | null>(null);
  const [mouseCurrentPos, setMouseCurrentPos] = useState({ x: 0, y: 0 });

  // Panning & dragging internal refs
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Internal states
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const debounceTimersRef = useRef<Record<string, number>>({});

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(t => clearTimeout(t as any));
    };
  }, []);

  // Map Screen Coordinates to Canvas Space
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom
    };
  };

  // Add standard nodes
  const handleAddNewNode = (type: 'sticky' | 'circle' | 'card', x?: number, y?: number) => {
    // Spawn near the center if coords aren't provided
    let spawnX = 250;
    let spawnY = 200;

    if (x === undefined || y === undefined) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        spawnX = (-panOffset.x + rect.width / 2) / zoom - 70;
        spawnY = (-panOffset.y + rect.height / 2) / zoom - 50;
      }
    } else {
      spawnX = x;
      spawnY = y;
    }

    const newElement: CanvasElement = {
      id: `elem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      workspace_id: elements[0]?.workspace_id || 'default-ws',
      type,
      position_x: Math.round(spawnX),
      position_y: Math.round(spawnY),
      text_content: type === 'sticky' ? 'Double click to edit sticky' : 'Double click to edit',
      color: type === 'circle' ? 'blue' : 'yellow',
      updated_at: new Date().toISOString()
    };

    onElementsChange([...elements, newElement]);
    onSaveElement(newElement);
    setSelectedElementId(newElement.id);
  };

  // Double click canvas background to spawn sticky note quickly
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'grid-backplane') {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      handleAddNewNode('sticky', coords.x - 70, coords.y - 70);
    }
  };

  // Drag-Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan' || e.button === 1 || e.button === 2) {
      // Middle or Right Mouse click pans automatically
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    // Active connection preview drawing coords
    if (activeConnectionStartId) {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setMouseCurrentPos(coords);
    }

    // Drag-move elements
    if (isDraggingNode && draggedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const cursorCoords = getCanvasCoordinates(e.clientX, e.clientY);
      const targetElement = elements.find(el => el.id === draggedNodeId);
      if (!targetElement) return;

      const updatedX = Math.round(cursorCoords.x - dragStartOffset.x);
      const updatedY = Math.round(cursorCoords.y - dragStartOffset.y);

      // Mutate local state immediately for visual responsiveness
      onElementsChange(elements.map(el => {
        if (el.id === draggedNodeId) {
          return { ...el, position_x: updatedX, position_y: updatedY };
        }
        return el;
      }));

      // Debounce saving coordinates to Google Sheets (1.2s delay to prevent spamming APis!)
      if (debounceTimersRef.current[draggedNodeId]) {
        clearTimeout(debounceTimersRef.current[draggedNodeId]);
      }

      debounceTimersRef.current[draggedNodeId] = window.setTimeout(() => {
        onSaveElement({
          ...targetElement,
          position_x: updatedX,
          position_y: updatedY,
          updated_at: new Date().toISOString()
        });
        delete debounceTimersRef.current[draggedNodeId];
      }, 1200);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingNode(false);
    setDraggedNodeId(null);

    // Cancel dynamic connection preview if released in void
    setActiveConnectionStartId(null);
  };

  // Node Dragging Initialize
  const handleNodeDragStart = (e: React.MouseEvent, id: string) => {
    if (tool === 'pan') return;
    e.stopPropagation();
    setSelectedElementId(id);

    const target = elements.find(el => el.id === id);
    if (!target) return;

    const clickedCoords = getCanvasCoordinates(e.clientX, e.clientY);
    setDragStartOffset({
      x: clickedCoords.x - target.position_x,
      y: clickedCoords.y - target.position_y
    });
    setDraggedNodeId(id);
    setIsDraggingNode(true);
  };

  // Arrow Connection creation methods
  const handleConnectorMouseDown = (e: React.MouseEvent, fromId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveConnectionStartId(fromId);
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    setMouseCurrentPos(coords);
  };

  const handleConnectorMouseUpOnTarget = (e: React.MouseEvent, toId: string) => {
    e.stopPropagation();
    if (activeConnectionStartId && activeConnectionStartId !== toId) {
      // Check if connection already exists to avoid dupes
      const exists = elements.some(el => {
        if (el.type === 'arrow') {
          try {
            const arr = JSON.parse(el.text_content);
            return arr.fromId === activeConnectionStartId && arr.toId === toId;
          } catch {
            return false;
          }
        }
        return false;
      });

      if (!exists) {
        const connectionObj: ConnectionArrow = {
          fromId: activeConnectionStartId,
          toId: toId
        };

        const newArrow: CanvasElement = {
          id: `elem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          workspace_id: elements[0]?.workspace_id || 'default-ws',
          type: 'arrow',
          position_x: 0,
          position_y: 0,
          text_content: JSON.stringify(connectionObj),
          updated_at: new Date().toISOString()
        };

        onElementsChange([...elements, newArrow]);
        onSaveElement(newArrow);
      }
    }
    setActiveConnectionStartId(null);
  };

  // Element Actions (Text write & color updates)
  const handleElementTextChange = (id: string, text: string) => {
    onElementsChange(elements.map(el => el.id === id ? { ...el, text_content: text } : el));

    // Debounce saving text revisions as well
    if (debounceTimersRef.current[id]) {
      clearTimeout(debounceTimersRef.current[id]);
    }

    debounceTimersRef.current[id] = window.setTimeout(() => {
      const targetElement = elements.find(el => el.id === id);
      if (targetElement) {
        onSaveElement({
          ...targetElement,
          text_content: text,
          updated_at: new Date().toISOString()
        });
      }
      delete debounceTimersRef.current[id];
    }, 1500);
  };

  const handleElementColorChange = (id: string, color: CanvasElement['color']) => {
    const updated = elements.map(el => el.id === id ? { ...el, color } : el);
    onElementsChange(updated);
    
    const target = updated.find(el => el.id === id);
    if (target) {
      onSaveElement(target);
    }
  };

  const handleElementDelete = (id: string) => {
    // Delete target element plus all connecting arrows referencing this element
    onDeleteElement(id);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  // Zoom Operations
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(prev * factor, 0.3), 1.8));
  };

  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Helper values for connection curve renderer
  const getNodeCenter = (id: string) => {
    const node = elements.find(el => el.id === id);
    if (!node) return { x: 0, y: 0 };

    let width = 160;
    let height = 120;

    if (node.type === 'circle') {
      width = 110;
      height = 110;
    }

    return {
      x: node.position_x + width / 2,
      y: node.position_y + height / 2
    };
  };

  return (
    <div id="whiteboard-canvas-card" className="flex-grow flex flex-col glass bg-slate-950/20 rounded-2xl h-full overflow-hidden shadow-lg relative">
      
      {/* Dynamic Ribbon Control Toolbar */}
      <div className="absolute top-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-xl rounded-xl flex items-center p-1.5 space-x-1">
        
        {/* Pointer Tools */}
        <button
          id="select-tool-btn"
          onClick={() => setTool('select')}
          className={`p-2 rounded-lg transition ${
            tool === 'select' 
              ? 'bg-white/10 text-white font-semibold' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Pointer tool"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          id="pan-tool-btn"
          onClick={() => setTool('pan')}
          className={`p-2 rounded-lg transition ${
            tool === 'pan' 
              ? 'bg-white/10 text-white font-semibold' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Pan board"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1"></div>

        {/* Action triggers */}
        <button
          id="add-sticky-btn"
          onClick={() => handleAddNewNode('sticky')}
          className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-lg transition flex items-center space-x-1"
          title="Add Sticky Note"
        >
          <StickyNote className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase">Sticky</span>
        </button>

        <button
          id="add-circle-btn"
          onClick={() => handleAddNewNode('circle')}
          className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition flex items-center space-x-1"
          title="Add Circle Node"
        >
          <Circle className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase">Circle</span>
        </button>

        <button
          id="add-card-btn"
          onClick={() => handleAddNewNode('card')}
          className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition flex items-center space-x-1"
          title="Add Rounded Card"
        >
          <Square className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase">Card</span>
        </button>
      </div>

      {/* Zoom and Navigation controls bottom left */}
      <div className="absolute bottom-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md border border-white/10 p-1.5 rounded-xl flex items-center space-x-1 shadow-lg">
        <button
          id="zoom-in-btn"
          onClick={() => handleZoom(1.15)}
          className="p-1.5 hover:bg-white/10 text-slate-300 rounded-lg transition"
          title="Zoom In"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-mono font-medium text-slate-400 px-1">
          {Math.round(zoom * 100)}%
        </span>
        <button
          id="zoom-out-btn"
          onClick={() => handleZoom(0.85)}
          className="p-1.5 hover:bg-white/10 text-slate-300 rounded-lg transition"
          title="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          id="reset-zoom-view-btn"
          onClick={handleResetView}
          className="p-1.5 hover:bg-white/10 text-slate-400 rounded-lg transition"
          title="Center View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Syncing coordinates status */}
      <div className="absolute top-4 right-4 z-40 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-full text-[10px] font-mono shadow-lg">
        {isSyncing ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
            <span className="text-blue-200">Syncing to Sheets...</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse"></span>
            <span className="text-emerald-300">Whiteboard Saved</span>
          </>
        )}
      </div>

      {/* Infinite Canvas Backdrop */}
      <div
        id="infinite-canvas-surface"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        className={`w-full h-full flex-grow relative overflow-hidden select-none ${
          tool === 'pan' || isPanning ? 'cursor-grabbing' : 'cursor-default'
        }`}
        style={{
          backgroundColor: '#020617',
          backgroundImage: 'radial-gradient(#334155 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
        }}
      >
        {/* Render Grid Backplane to allow clicks */}
        <div id="grid-backplane" className="absolute inset-0 pointer-events-none" />

        {/* View Scaling Container */}
        <div
          id="canvas-zoomer-container"
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Arrow Connectors Overlay */}
          <svg className="absolute overflow-visible top-0 left-0 pointer-events-auto z-10 w-1 h-1">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="6"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Existing dynamic connectors */}
            {elements
              .filter(el => el.type === 'arrow')
              .map(arrow => {
                try {
                  const conn: ConnectionArrow = JSON.parse(arrow.text_content);
                  const start = getNodeCenter(conn.fromId);
                  const end = getNodeCenter(conn.toId);

                  if (start.x === 0 || end.x === 0) return null;

                  // Render elegant helper curve path
                  const dx = end.x - start.x;
                  const dy = end.y - start.y;

                  // Compute control points for a smooth visual curve path
                  const cx1 = start.x + dx * 0.4;
                  const cy1 = start.y + dy * 0.1;
                  const cx2 = start.x + dx * 0.6;
                  const cy2 = start.y + dy * 0.9;

                  return (
                    <g key={arrow.id} className="group/arrow">
                      {/* Interactive wider hover line indicator */}
                      <path
                        d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="15"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(arrow.id);
                        }}
                      />
                      {/* Visual rendering path line */}
                      <path
                        d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`}
                        fill="none"
                        stroke={selectedElementId === arrow.id ? '#3b82f6' : '#475569'}
                        strokeWidth={selectedElementId === arrow.id ? '3.5' : '2.2'}
                        markerEnd="url(#arrowhead)"
                        strokeDasharray={selectedElementId === arrow.id ? '2,2' : undefined}
                      />
                    </g>
                  );
                } catch {
                  return null;
                }
              })}

            {/* Real-time Connection drawing cursor line preview */}
            {activeConnectionStartId && (
              (() => {
                const start = getNodeCenter(activeConnectionStartId);
                const dx = mouseCurrentPos.x - start.x;
                const dy = mouseCurrentPos.y - start.y;
                const cx1 = start.x + dx * 0.4;
                const cy1 = start.y + dy * 0.1;
                const cx2 = start.x + dx * 0.6;
                const cy2 = start.y + dy * 0.9;

                return (
                  <path
                    d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${mouseCurrentPos.x} ${mouseCurrentPos.y}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })()
            )}
          </svg>

          {/* Render draggable notes and layout shapes */}
          {elements
            .filter(el => el.type !== 'arrow')
            .map(el => {
              const isSelected = selectedElementId === el.id;
              
              // Map Color classes to beautiful translucent glowing glass stickies
              let bgClass = 'bg-amber-500/12 hover:bg-amber-500/18 border-amber-500/25 text-amber-100';
              if (el.color === 'pink') bgClass = 'bg-pink-500/12 hover:bg-pink-500/18 border-pink-500/25 text-pink-100';
              if (el.color === 'blue') bgClass = 'bg-blue-500/12 hover:bg-blue-500/18 border-blue-500/25 text-blue-100';
              if (el.color === 'green') bgClass = 'bg-emerald-500/12 hover:bg-emerald-500/18 border-emerald-500/25 text-emerald-100';
              if (el.color === 'lavender') bgClass = 'bg-purple-500/12 hover:bg-purple-500/18 border-purple-500/25 text-purple-100';

              return (
                <div
                  id={`canvas-node-${el.id}`}
                  key={el.id}
                  onMouseDown={(e) => handleNodeDragStart(e, el.id)}
                  className={`absolute pointer-events-auto p-3.5 border flex flex-col group transition backdrop-blur-md ${bgClass} ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950 shadow-2xl scale-102 z-20' : 'shadow-xl'
                  } ${
                    el.type === 'circle' 
                      ? 'rounded-full w-[110px] h-[110px] items-center justify-center text-center' 
                      : el.type === 'card'
                        ? 'rounded-2xl w-[170px] min-h-[90px]'
                        : 'rounded-lg w-[160px] min-h-[120px] rotate-[-1deg] hover:rotate-0'
                  }`}
                  style={{
                    left: `${el.position_x}px`,
                    top: `${el.position_y}px`,
                  }}
                >
                  {/* Inline Textarea to edit text contents directly */}
                  {el.type === 'circle' ? (
                    <textarea
                      id={`canvas-node-text-${el.id}`}
                      value={el.text_content}
                      onChange={(e) => handleElementTextChange(el.id, e.target.value)}
                      onMouseDown={(evt) => evt.stopPropagation()}
                      className="bg-transparent border-0 resize-none font-bold text-center text-xs w-[85%] h-[85%] p-0 focus:ring-0 focus:outline-none placeholder-slate-500 text-white overflow-hidden select-text"
                      placeholder="Goal..."
                    />
                  ) : (
                    <textarea
                      id={`canvas-node-text-${el.id}`}
                      value={el.text_content}
                      onChange={(e) => handleElementTextChange(el.id, e.target.value)}
                      onMouseDown={(evt) => evt.stopPropagation()}
                      className="bg-transparent border-0 resize-none text-xs w-full flex-grow p-0 focus:ring-0 focus:outline-none placeholder-slate-500 text-white select-text font-medium leading-relaxed"
                      placeholder="Add note details..."
                    />
                  )}

                  {/* Little Connection Point display on right of stickies */}
                  {tool === 'select' && (
                    <div
                      id={`connector-dot-${el.id}`}
                      onMouseDown={(e) => handleConnectorMouseDown(e, el.id)}
                      onMouseUp={(e) => handleConnectorMouseUpOnTarget(e, el.id)}
                      className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 hover:scale-125 rounded-full border border-white cursor-crosshair opacity-0 group-hover:opacity-100 transition z-30 flex items-center justify-center text-white text-[8px] font-bold shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      title="Drag to connect"
                    >
                      ●
                    </div>
                  )}

                  {/* Floating Action HUD on selection hover */}
                  {isSelected && (
                    <div className="absolute top-[-44px] left-1/2 transform -translate-x-1/2 bg-slate-950 border border-white/10 text-white rounded-xl shadow-2xl px-2.5 py-1.5 flex items-center space-x-1.5 z-40 animate-fadeIn pointer-events-auto">
                      
                      {/* Color Palette togglers */}
                      <button 
                        id={`palette-yellow-${el.id}`}
                        onClick={() => handleElementColorChange(el.id, 'yellow')}
                        className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-white/20 hover:scale-110 transition cursor-pointer" 
                        title="Yellow"
                      />
                      <button 
                        id={`palette-pink-${el.id}`}
                        onClick={() => handleElementColorChange(el.id, 'pink')}
                        className="w-3.5 h-3.5 rounded-full bg-pink-400 border border-white/20 hover:scale-110 transition cursor-pointer" 
                        title="Pink"
                      />
                      <button 
                        id={`palette-blue-${el.id}`}
                        onClick={() => handleElementColorChange(el.id, 'blue')}
                        className="w-3.5 h-3.5 rounded-full bg-blue-400 border border-white/20 hover:scale-110 transition cursor-pointer" 
                        title="Blue"
                      />
                      <button 
                        id={`palette-green-${el.id}`}
                        onClick={() => handleElementColorChange(el.id, 'green')}
                        className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-white/20 hover:scale-110 transition cursor-pointer" 
                        title="Green"
                      />
                      <button 
                        id={`palette-lavender-${el.id}`}
                        onClick={() => handleElementColorChange(el.id, 'lavender')}
                        className="w-3.5 h-3.5 rounded-full bg-purple-400 border border-white/20 hover:scale-110 transition cursor-pointer" 
                        title="Lavender"
                      />

                      <div className="w-px h-3.5 bg-white/10"></div>

                      <button
                        id={`delete-node-btn-${el.id}`}
                        onClick={() => handleElementDelete(el.id)}
                        className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                        title="Delete Element"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Background helpful tip */}
      {elements.length <= 1 && (
        <div className="absolute bottom-16 right-4 max-w-[200px] p-3 glass bg-slate-950/80 backdrop-blur border border-white/10 rounded-xl text-[10px] text-slate-400 pointer-events-none z-20 shadow-lg">
          💡 Double-click the background to spawn Sticky Notes. Connect notes by dragging from the little blue dots!
        </div>
      )}
    </div>
  );
}
