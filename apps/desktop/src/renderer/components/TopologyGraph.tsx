import React, { useState, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { GeneCategory } from '../types'

interface TopologyNode {
  id: string
  label: string
  category: GeneCategory
  x: number
  y: number
}

interface TopologyEdge {
  from: string
  to: string
}

interface TopologyGraphProps {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  onNodeClick?: (id: string) => void
  className?: string
}

// Gene category colors for nodes
const CATEGORY_COLORS: Record<GeneCategory, { fill: string; stroke: string }> = {
  dev: { fill: 'hsl(160 84% 39% / 0.2)', stroke: 'hsl(160 84% 39%)' },
  data: { fill: 'hsl(221 83% 53% / 0.2)', stroke: 'hsl(221 83% 53%)' },
  ops: { fill: 'hsl(32 95% 44% / 0.2)', stroke: 'hsl(32 95% 44%)' },
  network: { fill: 'hsl(263 70% 50% / 0.2)', stroke: 'hsl(263 70% 50%)' },
  creative: { fill: 'hsl(330 81% 60% / 0.2)', stroke: 'hsl(330 81% 60%)' },
  comm: { fill: 'hsl(189 94% 43% / 0.2)', stroke: 'hsl(189 94% 43%)' },
  security: { fill: 'hsl(0 84% 50% / 0.2)', stroke: 'hsl(0 84% 50%)' },
  efficiency: { fill: 'hsl(84 81% 44% / 0.2)', stroke: 'hsl(84 81% 44%)' },
}

const HEX_SIZE = 40

// Axial to world coordinate conversion for hex grid
function axialToWorld(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2 * q)
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r)
  return { x, y }
}

// Generate hexagon points for a given center and size
function getHexPoints(centerX: number, centerY: number, size: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6 // Start at top
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

export function TopologyGraph({
  nodes,
  edges,
  onNodeClick,
  className,
}: TopologyGraphProps) {
  // View state
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // Calculate node positions using axial coordinates
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>()

    nodes.forEach((node, index) => {
      // Use provided x,y as axial coordinates (q, r)
      const world = axialToWorld(node.x, node.y)
      // Center in viewBox
      positions.set(node.id, {
        x: world.x + 400,
        y: world.y + 300,
      })
    })

    return positions
  }, [nodes])

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.5, Math.min(3, prev * delta)))
  }, [])

  // Handle mouse down for pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'g') {
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX - translateX, y: e.clientY - translateY }
    }
  }, [translateX, translateY])

  // Handle mouse move for pan
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      setTranslateX(e.clientX - dragStartRef.current.x)
      setTranslateY(e.clientY - dragStartRef.current.y)
    }
  }, [isDragging])

  // Handle mouse up for pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    if (!isDragging && onNodeClick) {
      onNodeClick(nodeId)
    }
  }, [isDragging, onNodeClick])

  // Reset view
  const resetView = useCallback(() => {
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
  }, [])

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-background", className)}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setScale(prev => Math.min(3, prev * 1.2))}
          className="w-8 h-8 rounded-md bg-card border border-border hover:bg-muted transition-colors flex items-center justify-center text-sm font-medium"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setScale(prev => Math.max(0.5, prev * 0.8))}
          className="w-8 h-8 rounded-md bg-card border border-border hover:bg-muted transition-colors flex items-center justify-center text-sm font-medium"
          title="Zoom out"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="w-8 h-8 rounded-md bg-card border border-border hover:bg-muted transition-colors flex items-center justify-center text-xs"
          title="Reset view"
        >
          ⌂
        </button>
      </div>

      {/* Info */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground">
        <p>Nodes: {nodes.length} | Edges: {edges.length}</p>
        <p>Scroll to zoom • Drag to pan</p>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        className={cn(
          "w-full h-full cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        viewBox="0 0 800 600"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Glow filter for hover effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Transform group for zoom/pan */}
        <g
          transform={`translate(${translateX}, ${translateY}) scale(${scale})`}
          style={{ transformOrigin: 'center center' }}
        >
          {/* Edges */}
          {edges.map((edge, index) => {
            const fromPos = nodePositions.get(edge.from)
            const toPos = nodePositions.get(edge.to)
            if (!fromPos || !toPos) return null

            return (
              <line
                key={`edge-${index}`}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={1}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null

            const colors = CATEGORY_COLORS[node.category]
            const isHovered = hoveredNode === node.id

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.id)}
              >
                {/* Hexagon */}
                <polygon
                  points={getHexPoints(0, 0, HEX_SIZE - 4)}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isHovered ? 3 : 2}
                  filter={isHovered ? 'url(#glow)' : undefined}
                  className="transition-all duration-200"
                />

                {/* Label */}
                <text
                  y={HEX_SIZE + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-current"
                  style={{ fontSize: '10px', pointerEvents: 'none' }}
                >
                  {node.label}
                </text>

                {/* Category indicator */}
                <circle
                  cx={HEX_SIZE - 10}
                  cy={-HEX_SIZE + 10}
                  r={4}
                  fill={colors.stroke}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// Export helper to create mock topology for testing
export function createMockTopology(workspaceId: string): {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
} {
  return {
    nodes: [
      { id: workspaceId, label: 'Workspace', category: 'ops', x: 0, y: 0 },
      { id: 'agent-1', label: 'Agent', category: 'dev', x: 2, y: 0 },
      { id: 'gene-1', label: 'Code', category: 'dev', x: 2, y: -1 },
      { id: 'gene-2', label: 'Debug', category: 'dev', x: 3, y: 0 },
      { id: 'tool-1', label: 'Files', category: 'data', x: -1, y: 1 },
      { id: 'tool-2', label: 'Browser', category: 'network', x: -1, y: -1 },
    ],
    edges: [
      { from: workspaceId, to: 'agent-1' },
      { from: 'agent-1', to: 'gene-1' },
      { from: 'agent-1', to: 'gene-2' },
      { from: workspaceId, to: 'tool-1' },
      { from: workspaceId, to: 'tool-2' },
    ],
  }
}
