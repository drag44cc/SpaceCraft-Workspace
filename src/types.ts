/**
 * SpaceCraft Workspace
 * TypeScript Types for Workspaces, Documents, and Infinite Canvas
 */

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface DocumentBlock {
  id: string;
  type: 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'checklist' | 'quote' | 'callout';
  text: string;
  checked?: boolean; // For checklist blocks
}

export interface Document {
  id: string;
  workspace_id: string;
  title: string;
  content: string; // Stringified array of DocumentBlock
  updated_at: string;
}

export type CanvasElementType = 'sticky' | 'card' | 'circle' | 'arrow';

export interface CanvasElement {
  id: string;
  workspace_id: string;
  type: CanvasElementType;
  position_x: number;
  position_y: number;
  text_content: string; // Used for actual text, or stringified connection object for arrows
  color?: 'yellow' | 'pink' | 'blue' | 'green' | 'lavender';
  updated_at: string;
}

export interface ConnectionArrow {
  fromId: string;
  toId: string;
  label?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  createdAt: string;
}

export interface GASConfig {
  scriptUrl: string;
  isLive: boolean;
}
