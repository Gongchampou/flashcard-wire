/**
 * Core data shape for a node in the mind map.
 * Each node has a unique `id`, a short `topic`,
 * a brief `content` summary, and zero or more `children`.
 */
export interface MindMapNodeData {
  id: string;
  topic: string;
  content: string;
  children: MindMapNodeData[];
}

/**
 * Render-time extension of `MindMapNodeData` that includes
 * absolute coordinates used by the SVG layout engine.
 */
export interface NodePosition extends MindMapNodeData {
  x: number;
  y: number;
  children: NodePosition[];
}
