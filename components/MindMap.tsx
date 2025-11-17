

import React from 'react';
import { MindMapNodeData, NodePosition } from '../types';

// Node box dimensions and spacing used during layout
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const HORIZONTAL_SPACING = 60;
const VERTICAL_SPACING = 60;

/**
 * Render a single node as an HTML foreignObject inside the SVG, so we can
 * use Tailwind classes for styling while maintaining SVG positioning.
 * `isHighlighted` adds a ring, `isSearchMatch` tweaks hover border color.
 */
const MindMapNode: React.FC<{ node: NodePosition; isHighlighted: boolean; isSearchMatch: boolean; }> = ({ node, isHighlighted, isSearchMatch }) => {
  const highlightClass = isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-brand-surface' : '';
  const hoverClass = isSearchMatch ? 'hover:border-yellow-400' : 'hover:border-brand-secondary';

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT}>
        <div className={`w-full h-full p-2 flex flex-col justify-center items-center bg-brand-primary border border-brand-accent rounded-lg shadow-lg text-center overflow-hidden transition-all duration-200 hover:scale-105 ${hoverClass} ${highlightClass}`}>
          <h3 className="font-bold text-sm text-brand-text truncate">{node.topic}</h3>
          <p className="text-xs text-brand-text/80 mt-1 line-clamp-2">{node.content}</p>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Smooth curved connector between a parent and a child node.
 */
const Connector: React.FC<{ from: { x: number, y: number }, to: { x: number, y: number } }> = ({ from, to }) => {
  const startX = from.x + NODE_WIDTH / 2;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x + NODE_WIDTH / 2;
  const endY = to.y;

  const path = `M ${startX},${startY} C ${startX},${(startY + endY) / 2} ${endX},${(startY + endY) / 2} ${endX},${endY}`;

  return <path d={path} fill="none" className="stroke-brand-accent" strokeWidth="2" />;
};

// Turn a positioned tree into a flat list for rendering edges and nodes
const flattenNodes = (node: NodePosition): NodePosition[] => {
  return [node, ...node.children.flatMap(flattenNodes)];
};

/**
 * Top-level mind map SVG with automatic tree layout and pan/zoom.
 */
const MindMap: React.FC<{ data: MindMapNodeData; searchQuery: string; hoveredNodeId: string | null; }> = ({ data, searchQuery, hoveredNodeId }) => {
  const [viewBox, setViewBox] = React.useState({ x: 0, y: 0, width: 1000, height: 800 });
  const svgRef = React.useRef<SVGSVGElement>(null);
  const isPanning = React.useRef(false);
  const startPoint = React.useRef({ x: 0, y: 0 });
  const activePointers = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchState = React.useRef<null | { distance: number; centerSvg: { x: number; y: number }; viewBox: { x: number; y: number; width: number; height: number } }>(null);

  /**
   * Recursive layout: centers parent over the span of its children.
   */
  const layoutTree = (node: MindMapNodeData, x = 0, y = 0): NodePosition => {
    const positionedNode: NodePosition = { ...node, x, y, children: [] };
    const childrenWidth = node.children.reduce((acc, child) => acc + calculateTreeWidth(child), 0);
    const totalWidth = Math.max(NODE_WIDTH, childrenWidth);

    let currentX = x - (totalWidth / 2) + (NODE_WIDTH / 2);

    for (const child of node.children) {
      const childWidth = calculateTreeWidth(child);
      const childX = currentX + childWidth / 2 - NODE_WIDTH / 2;
      const childY = y + NODE_HEIGHT + VERTICAL_SPACING;
      positionedNode.children.push(layoutTree(child, childX, childY));
      currentX += childWidth;
    }
    return positionedNode;
  };

  /**
   * Returns total horizontal footprint of a subtree.
   */
  const calculateTreeWidth = (node: MindMapNodeData): number => {
    if (node.children.length === 0) {
      return NODE_WIDTH + HORIZONTAL_SPACING;
    }
    return node.children.reduce((acc, child) => acc + calculateTreeWidth(child), 0);
  };
  
  const positionedData = React.useMemo(() => layoutTree(data), [data]);
  const allNodes = React.useMemo(() => flattenNodes(positionedData), [positionedData]);
  const lowerCaseQuery = searchQuery.trim().toLowerCase();
  
  // Auto-fit viewBox to include all nodes (with padding)
  React.useEffect(() => {
    if (allNodes.length > 0) {
      const xs = allNodes.map(n => n.x);
      const ys = allNodes.map(n => n.y);
      const minX = Math.min(...xs) - HORIZONTAL_SPACING;
      const minY = Math.min(...ys) - VERTICAL_SPACING;
      const maxX = Math.max(...xs) + NODE_WIDTH + HORIZONTAL_SPACING;
      const maxY = Math.max(...ys) + NODE_HEIGHT + VERTICAL_SPACING;
      const width = maxX - minX;
      const height = maxY - minY;
      setViewBox({ x: minX, y: minY, width, height });
    }
  }, [allNodes]);


  // Mouse drag panning handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isPanning.current = true;
    startPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current || !svgRef.current) return;
    const { width, height } = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.width / width;
    const scaleY = viewBox.height / height;
    
    const dx = (e.clientX - startPoint.current.x) * scaleX;
    const dy = (e.clientY - startPoint.current.y) * scaleY;
    
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    startPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };
  
  // Wheel zoom centered on the mouse cursor
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const { width, height, left, top } = svgRef.current.getBoundingClientRect();

    const scaleFactor = 1.1;
    const mouseX = e.clientX - left;
    const mouseY = e.clientY - top;
    
    const newWidth = e.deltaY > 0 ? viewBox.width * scaleFactor : viewBox.width / scaleFactor;
    const newHeight = e.deltaY > 0 ? viewBox.height * scaleFactor : viewBox.height / scaleFactor;
    
    const dx = (mouseX / width) * (viewBox.width - newWidth);
    const dy = (mouseY / height) * (viewBox.height - newHeight);

    setViewBox(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
        width: newWidth,
        height: newHeight
    }));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const rect = svgRef.current.getBoundingClientRect();
      const centerSvg = {
        x: viewBox.x + ((cx - rect.left) / rect.width) * viewBox.width,
        y: viewBox.y + ((cy - rect.top) / rect.height) * viewBox.height,
      };
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      pinchState.current = { distance: dist, centerSvg, viewBox: { ...viewBox } };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (activePointers.current.size === 2 && pinchState.current) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const newDist = Math.hypot(dx, dy);
      if (newDist <= 0) return;
      const scale = pinchState.current.distance / newDist;
      const newWidth = pinchState.current.viewBox.width * scale;
      const newHeight = pinchState.current.viewBox.height * scale;
      const cx = pinchState.current.centerSvg.x;
      const cy = pinchState.current.centerSvg.y;
      const newX = cx - (cx - pinchState.current.viewBox.x) * scale;
      const newY = cy - (cy - pinchState.current.viewBox.y) * scale;
      setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }
  };

  return (
    <div
      className="w-full h-full bg-brand-surface/50 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none overscroll-contain"
      onWheelCapture={(e) => {
        // On many trackpads, pinch-zoom is surfaced as ctrl+wheel; prevent default to stop page zoom
        if (e.ctrlKey) {
          e.preventDefault();
        }
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {allNodes.map(node => (
          node.children.map(child => (
            <Connector key={`${node.id}-${child.id}`} from={{x: node.x, y: node.y}} to={{x: child.x, y: child.y}} />
          ))
        ))}
        {allNodes.map(node => {
          // Highlight when search matches or when hovered from the autocomplete list
          const isSearchMatch = lowerCaseQuery ? 
              node.topic.toLowerCase().includes(lowerCaseQuery) || 
              node.content.toLowerCase().includes(lowerCaseQuery) : 
              false;
          const isHoverHighlighted = node.id === hoveredNodeId;
          const isHighlighted = isSearchMatch || isHoverHighlighted;
          return <MindMapNode key={node.id} node={node} isHighlighted={isHighlighted} isSearchMatch={isSearchMatch} />;
        })}
      </svg>
    </div>
  );
};

export default MindMap;