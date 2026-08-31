# 3D Structural Modeling System - Complete Documentation

## 📖 Table of Contents
1. [Overview](#overview)
2. [Quick Reference](#quick-reference)
3. [File Structure](#file-structure)
4. [Node-Based Architecture](#node-based-architecture)
5. [Interactive Features](#interactive-features)
6. [Coordinate Type System](#coordinate-type-system)
7. [Component Details](#component-details)
8. [Usage Guide](#usage-guide)
9. [Troubleshooting](#troubleshooting)

---

# Overview

A fully interactive 3D structural modeling system for visualizing, creating, editing, and managing structural elements in real-time 3D space using React Three Fiber with **node-based connectivity**.

## Key Features
- ✅ **Interactive 3D Visualization** - OrbitControls for intuitive navigation
- ✅ **Node-Based Architecture** - Elements locked to unique nodes in Cartesian space
- ✅ **Drawing Mode** - Click to create elements between nodes
- ✅ **Context Menus** - Right-click for edit/duplicate/delete
- ✅ **Real-Time Editing** - Edit properties in side panel
- ✅ **3D Coordinate System** - Type-safe X/Y/Z positioning
- ✅ **Smart Node Reuse** - Automatic node sharing at connection points
- ✅ **Cartesian Uniqueness** - No duplicate node positions (1mm tolerance)
- ✅ **Visual Feedback** - Color-coded elements and nodes
- ✅ **Professional Rendering** - PBR materials, shadows, environment maps

---

# Quick Reference

## 🎮 Controls

### Mouse Controls
| Action | Drawing Mode OFF | Drawing Mode ON |
|--------|-----------------|-----------------|
| **Left Click** | Rotate camera | Place node point |
| **Right Click** | Pan camera | (Not active) |
| **Right Click on Element** | Context menu | (Not active) |
| **Scroll Wheel** | Zoom in/out | Zoom in/out |
| **Hover over Element/Node** | Highlight + info | No effect |

### Toolbar Buttons
- **Draw Line** 📏 - Toggle drawing mode
- **Cancel** ❌ - Exit drawing mode
- **Deselect** ✖️ - Clear selection

## 🎨 Visual Indicators

### Element Colors
| Type | Color | State Variations |
|------|-------|------------------|
| **Beam** | Blue (#3b82f6) | Purple when selected |
| **Joist** | Green (#10b981) | White when hovered |
| **Column** | Red (#ef4444) | Glowing outline when selected |
| **Lintel** | Amber (#f59e0b) | Cursor changes to pointer |

### Node Colors
| State | Color | Scale | Additional |
|-------|-------|-------|------------|
| **Isolated** | Gray (#9E9E9E) | 1.0x | No connections |
| **Connected** | Orange (#FF9800) | 1.0x | Has elements |
| **Fixed/Support** | Red (#F44336) | 1.0x | Cone indicator |
| **Hovered** | Blue (#2196F3) | 1.3x | Label + count |
| **Selected** | Green (#4CAF50) | 1.5x | Label + count |

---

# File Structure

## Active Files

```
components/3DModels/
├── README.md                    # 📄 This documentation
│
├── ProjectModel.tsx             # 🎯 Main 3D viewer component
│   ├── Manages: Canvas, camera, controls
│   ├── Features: Drawing mode, selection, editing
│   └── Integrates: All sub-components
│
├── StructuralElement3D.tsx      # 🏗️ Individual element renderer
│   ├── Renders: Beam geometry with PBR materials
│   ├── Features: Selection, hover effects, context menu
│   └── Node-aware: Uses node positions for placement
│
├── Node3DComponent.tsx          # 🔵 Node visualization
│   ├── Renders: Sphere markers at connection points
│   ├── Features: Color-coded states, hover labels
│   └── Interactive: Click to select, shows connections
│
├── NodeManager.ts               # 🧠 Node management service
│   ├── Enforces: Cartesian uniqueness (no duplicates)
│   ├── Manages: Node creation, connection tracking
│   └── Validates: Position conflicts, deletion safety
│
├── types3D.ts                   # 📐 Type definitions
│   ├── Defines: Node3D, Element3D interfaces
│   ├── Utilities: Position hashing, calculations
│   └── Helpers: Span, midpoint, rotation functions
│
├── useDrawingMode.ts            # 🎨 Drawing state hook
│   ├── State: Drawing active, preview lines
│   └── Methods: Start, update, finish, cancel
│
├── DrawingPreview.tsx           # 👁️ Preview line renderer
│   └── Shows: Temporary line while drawing
│
├── ContextMenu3D.tsx            # 📋 Right-click menu
│   └── Options: Edit, Duplicate, Delete
│
└── ElementEditPanel.tsx         # ⚙️ Property editor
    └── Features: Inline element editing
```

## Component Dependencies

```
App.tsx
  └── ProjectModel.tsx (entry point)
      ├── StructuralElement3D.tsx
      │   ├── types3D.ts (Node3D, calculateMidpoint, etc.)
      │   └── Node3DComponent.tsx (embedded node markers)
      ├── Node3DComponent.tsx (standalone nodes)
      │   └── types3D.ts
      ├── NodeManager.ts
      │   └── types3D.ts
      ├── useDrawingMode.ts
      ├── DrawingPreview.tsx
      ├── ContextMenu3D.tsx
      └── ElementEditPanel.tsx
```

---

# Node-Based Architecture

## Concept

The system uses a **node-based architecture** where:
1. **Nodes** are unique points in 3D space ([x, y, z])
2. **Elements** connect two nodes (startNode → endNode)
3. **Cartesian uniqueness** prevents duplicate positions
4. **Automatic reuse** shares nodes between elements

This mimics real structural engineering and finite element analysis.

## Node3D Interface

```typescript
interface Node3D {
  id: string;                    // Unique ID: "node-1234567890-abc"
  position: [number, number, number]; // [x, y, z] in meters
  name?: string;                 // Display name: "N1", "N2", etc.
  connectedElementIds: string[]; // Elements connected to this node
  isFixed?: boolean;             // Locked for supports
}
```

## Element3D Interface

```typescript
interface Element3D extends Element {
  startNodeId?: string;  // References Node3D.id
  endNodeId?: string;    // References Node3D.id
}
```

## Position Uniqueness

### Hash Function
```typescript
getPositionHash([1.2345, 5.6789, 9.0123])
→ "1.235,5.679,9.012"  // Rounded to 3 decimal places (1mm precision)
```

### Tolerance Check
```typescript
arePositionsEqual([1.0, 2.0, 3.0], [1.0005, 2.0005, 3.0005], 0.001)
→ true  // Within 1mm tolerance
```

### Position Map
```typescript
Map<positionHash, nodeId>
// O(1) lookup for exact positions
// Prevents duplicate creation
```

## NodeManager API

### Core Methods

#### `getOrCreateNodeAt(position, name?): Node3D`
Get existing node or create new one.
```typescript
const node = nodeManager.getOrCreateNodeAt([5, 0, 10], "N1");
// Returns existing node if within 1mm tolerance
```

#### `connectElement(elementId, startNodeId, endNodeId): void`
Register element-node connections.
```typescript
nodeManager.connectElement("elem-123", "node-abc", "node-xyz");
// Adds element ID to both nodes' connectedElementIds
```

#### `disconnectElement(elementId): void`
Remove element from all nodes.
```typescript
nodeManager.disconnectElement("elem-123");
// Called when deleting elements
```

#### `moveNode(nodeId, newPosition): { success, message, node? }`
Move node with validation.
```typescript
const result = nodeManager.moveNode("node-abc", [10, 0, 5]);
if (!result.success) {
  console.error(result.message); // "Position occupied" or "Node is fixed"
}
```

#### `deleteNode(nodeId): { success, message }`
Delete node if no connections.
```typescript
const result = nodeManager.deleteNode("node-abc");
// Fails if node has connected elements
```

### Query Methods

```typescript
getAllNodes(): Node3D[]                    // Get all nodes
getNode(nodeId): Node3D | undefined        // Get by ID
findNodeAt(position, tolerance?): Node3D   // Find at position
getElementNodes(element): { start?, end? } // Get element's nodes
```

### Utility Methods

```typescript
validate(): { valid, errors[] }    // Check for duplicates
getStats(): { totalNodes, connectedNodes, isolatedNodes }
clear(): void                       // Remove all nodes
```

## Drawing Workflow

### Step 1: Start Drawing
```typescript
// User clicks "Draw Line" button
toggleDrawingMode();
→ OrbitControls disabled
→ Plane becomes clickable
```

### Step 2: Click Start Point
```typescript
// User clicks at [0, 0, 0]
handlePlaneClick([0, 0, 0]);
→ startNode = nodeManager.getOrCreateNodeAt([0, 0, 0]);
→ Preview line starts
```

### Step 3: Click End Point
```typescript
// User clicks at [5, 0, 0]
handlePlaneClick([5, 0, 0]);
→ endNode = nodeManager.getOrCreateNodeAt([5, 0, 0]);
→ span = calculateSpanFromNodes(startNode, endNode); // 5.0m
→ Create element with startNodeId and endNodeId
→ nodeManager.connectElement(element.id, startNode.id, endNode.id);
→ Exit drawing mode
```

### Node Reuse Example

```typescript
// First element
Click [0, 0, 0]  → Creates N1
Click [5, 0, 0]  → Creates N2
→ Element E1: N1 → N2

// Second element (shares N2)
Click [5, 0, 0]  → Reuses N2 (within tolerance)
Click [10, 0, 0] → Creates N3
→ Element E2: N2 → N3

// Result:
// N1(0,0,0) —— E1 —— N2(5,0,0) —— E2 —— N3(10,0,0)
```

---

# Interactive Features

## Drawing Mode

### Activation
```typescript
// Click "Draw Line" button in toolbar
toggleDrawingMode();
```

### Behavior
1. **First Click**: Place start node
   - Green sphere appears at click point
   - Preview line begins

2. **Mouse Move**: Update preview
   - Dashed line follows cursor
   - Shows span length

3. **Second Click**: Place end node
   - Create element between nodes
   - Connect element to nodes
   - Exit drawing mode

4. **Cancel**: ESC or "Cancel" button
   - Clear preview
   - Exit drawing mode

### Visual Feedback
- **Status Text**: "Click to place start point, then end point"
- **Preview Line**: Dashed green line
- **Cursor**: Changes to crosshair
- **OrbitControls**: Disabled during drawing

## Selection System

### Element Selection
```typescript
// Click element
handleElementSelect(element);
→ element.isSelected = true
→ Purple highlight + glow
→ Edit panel available
```

### Node Selection
```typescript
// Click node
handleNodeSelect(node);
→ node.isSelected = true
→ Green color + larger size
→ Shows label and connections
```

## Context Menu

### Trigger
- Right-click on element (not in drawing mode)

### Options
1. **Edit** - Open edit panel
2. **Duplicate** - Clone element (creates new nodes)
3. **Delete** - Remove element (disconnects from nodes)

### Implementation
```typescript
onContextMenu={(element, event) => {
  event.nativeEvent.preventDefault();
  setContextMenu({
    isOpen: true,
    position: { x: event.clientX, y: event.clientY },
    element
  });
}}
```

## Edit Panel

### Features
- **Slide-in panel** from right
- **Live preview** in 3D view
- **Save/Cancel** buttons
- **Delete** option

### Editable Properties
- Element name
- Type (Beam/Joist/Column/Lintel)
- Span (recalculates from nodes)
- Section properties
- Supports (with X/Y/Z coordinates)
- Applied loads

---

# Coordinate Type System

## Type Definition

```typescript
type Coordinate = {
  x: number;    // Required: horizontal position
  y?: number;   // Optional: vertical position
  z?: number;   // Optional: depth position
};
```

## Usage

### Supports with 3D Positions
```typescript
interface Support {
  position: number | Coordinate;  // Backward compatible
  fixity: SupportFixityType;
}

// Examples:
{ position: 0, fixity: 'Pinned' }           // 1D position (start of beam)
{ position: { x: 0 }, fixity: 'Pinned' }   // Same as above
{ position: { x: 5, y: 2, z: 10 }, fixity: 'Fixed' } // 3D position
```

### Helper Functions

#### isCoordinate
```typescript
function isCoordinate(pos: number | Coordinate): pos is Coordinate {
  return typeof pos === 'object' && pos !== null && 'x' in pos;
}
```

#### getCoordinateValues
```typescript
function getCoordinateValues(pos: number | Coordinate): [number, number, number] {
  if (isCoordinate(pos)) {
    return [pos.x, pos.y ?? 0, pos.z ?? 0];
  }
  return [pos, 0, 0];
}
```

## Form Integration

### StructuralElementForm.tsx
```typescript
// Support position inputs
<div className="flex gap-2">
  <div className="flex-1">
    <label>X (m)</label>
    <input
      type="number"
      value={xValue}
      onChange={(e) => handleSupportCoordinateChange(index, 'x', e.target.value)}
    />
  </div>
  <div className="flex-1">
    <label>Y (m)</label>
    <input
      type="number"
      value={yValue}
      onChange={(e) => handleSupportCoordinateChange(index, 'y', e.target.value)}
    />
  </div>
  <div className="flex-1">
    <label>Z (m)</label>
    <input
      type="number"
      value={zValue}
      onChange={(e) => handleSupportCoordinateChange(index, 'z', e.target.value)}
    />
  </div>
</div>
```

### Smart Conversion
```typescript
// If Y and Z are both 0, store as number for backward compatibility
if (y === 0 && z === 0) {
  support.position = x;
} else {
  support.position = { x, y, z };
}
```

---

# Component Details

## ProjectModel.tsx

Main 3D viewer component that orchestrates all features.

### State Management
```typescript
const [localProject, setLocalProject] = useState<Project>(project);
const [selectedElement, setSelectedElement] = useState<Element | null>(null);
const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);
const [nodes, setNodes] = useState<Node3D[]>([]);
const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

const nodeManagerRef = useRef<NodeManager>(new NodeManager());
```

### Key Features

#### Node Initialization
```typescript
React.useEffect(() => {
  const nodeManager = nodeManagerRef.current;
  nodeManager.clear();

  project.elements?.forEach((element) => {
    const element3D = element as Element3D;
    if (element3D.startNodeId && element3D.endNodeId) return;

    const position = calculatePosition(element);
    const span = element.span || 2;

    const startPos: [number, number, number] = [position[0] - span/2, 0, position[2]];
    const endPos: [number, number, number] = [position[0] + span/2, 0, position[2]];

    const startNode = nodeManager.getOrCreateNodeAt(startPos);
    const endNode = nodeManager.getOrCreateNodeAt(endPos);

    nodeManager.connectElement(element.id, startNode.id, endNode.id);
    element3D.startNodeId = startNode.id;
    element3D.endNodeId = endNode.id;
  });

  setNodes(nodeManager.getAllNodes());
}, [project]);
```

#### Element Creation
```typescript
const createElementFromLine = useCallback((start: Vector3, end: Vector3) => {
  const nodeManager = nodeManagerRef.current;

  const startNode = nodeManager.getOrCreateNodeAt([start.x, start.y, start.z]);
  const endNode = nodeManager.getOrCreateNodeAt([end.x, end.y, end.z]);

  const span = calculateSpanFromNodes(startNode, endNode);

  const newElement: Element3D = {
    // ... element properties
    span,
    startNodeId: startNode.id,
    endNodeId: endNode.id,
  };

  nodeManager.connectElement(newElement.id, startNode.id, endNode.id);
  setNodes(nodeManager.getAllNodes());
}, []);
```

#### Element Deletion
```typescript
const handleDeleteElement = (elementId) => {
  const nodeManager = nodeManagerRef.current;
  nodeManager.disconnectElement(elementId);

  setLocalProject({
    ...localProject,
    elements: localProject.elements.filter(el => el.id !== elementId)
  });

  setNodes(nodeManager.getAllNodes());
};
```

### Rendering Elements
```typescript
<Suspense fallback={null}>
  {localProject.elements?.map((element) => {
    const element3D = element as Element3D;
    const nodeManager = nodeManagerRef.current;

    const startNode = element3D.startNodeId
      ? nodeManager.getNode(element3D.startNodeId)
      : undefined;
    const endNode = element3D.endNodeId
      ? nodeManager.getNode(element3D.endNodeId)
      : undefined;

    return (
      <StructuralElement3D
        key={element.id}
        element={element}
        startNode={startNode}
        endNode={endNode}
        isSelected={selectedElement?.id === element.id}
        onSelect={handleElementSelect}
        onContextMenu={handleElementContextMenu}
      />
    );
  })}
</Suspense>
```

### Rendering Nodes
```typescript
<Suspense fallback={null}>
  {nodes.map((node) => (
    <Node3DComponent
      key={node.id}
      node={node}
      isSelected={selectedNode?.id === node.id}
      isHovered={hoveredNode?.id === node.id}
      onClick={(node) => setSelectedNode(node)}
      onHover={(node, hovered) => setHoveredNode(hovered ? node : null)}
      showLabel={true}
      size={0.06}
    />
  ))}
</Suspense>
```

## StructuralElement3D.tsx

Renders individual structural elements using node positions.

### Node-Aware Positioning
```typescript
const StructuralElement3D: React.FC<Props> = ({
  element,
  position = [0, 0, 0],
  startNode,
  endNode,
  // ...
}) => {
  // Calculate position from nodes if available
  const elementPosition = (startNode && endNode)
    ? calculateMidpoint(startNode, endNode)
    : position;

  const rotationAngle = (startNode && endNode)
    ? calculateRotationFromNodes(startNode, endNode)
    : 0;

  return (
    <group position={elementPosition} rotation={[0, rotationAngle, 0]}>
      <mesh>
        <boxGeometry args={[span, height, width]} />
        <meshStandardMaterial
          color={getElementColor()}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
};
```

### Material Properties
- **Metalness**: 0.3 (slightly reflective)
- **Roughness**: 0.6 (semi-matte finish)
- **Emissive**: Glows when selected
- **Shadows**: castShadow + receiveShadow

## Node3DComponent.tsx

Renders nodes as interactive spheres.

### Visual States
```typescript
const getNodeColor = (): string => {
  if (color) return color;                    // Custom override
  if (isSelected) return '#4CAF50';           // Green
  if (isHovered || localHovered) return '#2196F3'; // Blue
  if (node.isFixed) return '#F44336';         // Red (support)
  if (node.connectedElementIds.length > 0) return '#FF9800'; // Orange
  return '#9E9E9E';                           // Gray (isolated)
};

const getScale = (): number => {
  if (isSelected) return 1.5;
  if (isHovered || localHovered) return 1.3;
  return 1.0;
};
```

### Geometry
```typescript
<sphereGeometry args={[size, 16, 16]} />
// size = 0.06m (60mm diameter)
// 16 segments = smooth sphere
```

### Labels
```typescript
{showLabel && node.name && (isSelected || isHovered) && (
  <Text
    position={[0, size * 2.5, 0]}
    fontSize={0.08}
    color="#ffffff"
    anchorX="center"
    anchorY="middle"
    outlineWidth={0.005}
    outlineColor="#000000"
  >
    {node.name}
  </Text>
)}
```

### Support Indicator
```typescript
{node.isFixed && (
  <mesh position={[0, size * 1.5, 0]} rotation={[0, 0, 0]}>
    <coneGeometry args={[size * 0.8, size * 1.5, 4]} />
    <meshStandardMaterial color="#F44336" />
  </mesh>
)}
```

## types3D.ts

Type definitions and utility functions.

### Key Functions

#### calculateSpanFromNodes
```typescript
export function calculateSpanFromNodes(
  startNode: Node3D,
  endNode: Node3D
): number {
  const [x1, y1, z1] = startNode.position;
  const [x2, y2, z2] = endNode.position;
  return Math.sqrt(
    Math.pow(x2 - x1, 2) +
    Math.pow(y2 - y1, 2) +
    Math.pow(z2 - z1, 2)
  );
}
```

#### calculateMidpoint
```typescript
export function calculateMidpoint(
  startNode: Node3D,
  endNode: Node3D
): [number, number, number] {
  return [
    (startNode.position[0] + endNode.position[0]) / 2,
    (startNode.position[1] + endNode.position[1]) / 2,
    (startNode.position[2] + endNode.position[2]) / 2,
  ];
}
```

#### calculateRotationFromNodes
```typescript
export function calculateRotationFromNodes(
  startNode: Node3D,
  endNode: Node3D
): number {
  const [x1, y1, z1] = startNode.position;
  const [x2, y2, z2] = endNode.position;
  return Math.atan2(z2 - z1, x2 - x1); // Radians in XZ plane
}
```

---

# Usage Guide

## Basic Workflow

### 1. Open 3D Viewer
```typescript
// In your component
import ProjectModel from './components/3DModels/ProjectModel';

<ProjectModel
  isOpen={is3DViewOpen}
  project={currentProject}
  onClose={() => setIs3DViewOpen(false)}
  width={panelWidth}
  onMouseDownOnResizer={handleResize}
  onUpdateProject={handleProjectUpdate}
/>
```

### 2. Navigate in 3D
- **Rotate**: Left-click + drag
- **Pan**: Right-click + drag
- **Zoom**: Scroll wheel

### 3. Draw Elements
1. Click **"Draw Line"** button
2. Click start point on ground plane
3. Move mouse (preview line appears)
4. Click end point
5. Element created automatically

### 4. Edit Elements
1. Right-click element → **"Edit"**
2. Modify properties in side panel
3. Click **"Save"** or **"Cancel"**

### 5. Manage Nodes
- Nodes created automatically when drawing
- Hover over node to see connections
- Click to select node
- Nodes shared automatically at connection points

## Advanced Features

### Creating Connected Elements

```typescript
// Draw first beam
Click [0, 0, 0]  → Node N1
Click [5, 0, 0]  → Node N2
→ Beam B1 created

// Draw second beam (shares N2)
Click [5, 0, 0]  → Reuses N2 (within 1mm)
Click [5, 0, 5]  → Node N3
→ Beam B2 created, connected to B1 at N2
```

### 3D Support Positions

```typescript
// In StructuralElementForm
const support = {
  position: { x: 5, y: 2.5, z: 10 },  // 3D coordinates
  fixity: SupportFixityType.Fixed
};
```

### Querying Nodes

```typescript
const nodeManager = nodeManagerRef.current;

// Get node statistics
const stats = nodeManager.getStats();
console.log(`Total nodes: ${stats.totalNodes}`);
console.log(`Connected: ${stats.connectedNodes}`);
console.log(`Isolated: ${stats.isolatedNodes}`);

// Find node at position
const node = nodeManager.findNodeAt([5, 0, 10], 0.001);
if (node) {
  console.log(`Found node: ${node.name}`);
  console.log(`Connected elements: ${node.connectedElementIds.length}`);
}

// Validate uniqueness
const validation = nodeManager.validate();
if (!validation.valid) {
  console.error('Duplicate nodes found:', validation.errors);
}
```

---

# Troubleshooting

## Common Issues

### Issue: Elements rendering vertically instead of horizontally

**Cause**: Rotation logic inverted or node positions incorrect

**Solution**:
```typescript
// In StructuralElement3D.tsx
// Horizontal elements should have rotation [0, 0, 0]
rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}

// Ensure nodes are at correct Y=0 level
const startPos: [number, number, number] = [x, 0, z]; // Y = 0
```

### Issue: Nodes floating above elements

**Cause**: Nodes positioned at grid Y coordinate instead of element Y coordinate

**Solution**:
```typescript
// In ProjectModel node initialization
const startPos: [number, number, number] = [position[0] - span/2, 0, position[2]];
//                                                                 ^ Force Y=0
```

### Issue: Duplicate nodes appearing at same location

**Cause**: Tolerance too small or position hash collision

**Solution**:
```typescript
const TOLERANCE = 0.001; // Increase if needed
// Check validation
const validation = nodeManager.validate();
```

### Issue: Elements not connecting to nodes

**Cause**: NodeManager not initialized or nodes state not updated

**Solution**:
```typescript
// Ensure nodeManager is initialized
const nodeManagerRef = useRef<NodeManager>(new NodeManager());

// Update nodes state after operations
nodeManager.getOrCreateNodeAt(...);
setNodes(nodeManager.getAllNodes()); // Don't forget this!
```

### Issue: Context menu not appearing

**Cause**: Drawing mode active or event not stopping propagation

**Solution**:
```typescript
// Disable drawing mode first
if (isDrawingMode) {
  toggleDrawingMode();
}

// Ensure event handling
onContextMenu={(element, event) => {
  event.stopPropagation(); // Prevent bubbling
  event.nativeEvent.preventDefault(); // Prevent default menu
}}
```

### Issue: OrbitControls not working

**Cause**: Drawing mode is active

**Solution**:
```typescript
<OrbitControls
  makeDefault
  enabled={!isDrawingMode} // Disabled during drawing
  minPolarAngle={0}
  maxPolarAngle={Math.PI / 2}
/>
```

## Performance Tips

### 1. Use Suspense for Lazy Loading
```typescript
<Suspense fallback={null}>
  {elements.map(element => (
    <StructuralElement3D key={element.id} {...} />
  ))}
</Suspense>
```

### 2. Memoize Expensive Calculations
```typescript
const elementPositions = useMemo(
  () => calculateElementLayout(elements),
  [elements]
);
```

### 3. Limit Node Rendering
```typescript
// Only show nodes when needed
const shouldShowNodes = isDrawingMode || selectedElement || hoveredElement;
```

### 4. Use Lower-Poly Geometry for Many Elements
```typescript
// For 100+ elements
<sphereGeometry args={[size, 8, 8]} /> // Instead of 16, 16
```

---

## Benefits Summary

### ✅ Node-Based System
1. **Elements locked to nodes** - Proper structural connectivity
2. **Cartesian uniqueness** - No duplicate positions (1mm tolerance)
3. **Automatic reuse** - Nodes shared at connection points
4. **Visual feedback** - Color-coded by state with labels
5. **Future-ready** - Foundation for FEM analysis

### ✅ Interactive Features
1. **Drawing mode** - Click to create elements
2. **Context menus** - Right-click for actions
3. **Real-time editing** - Live property updates
4. **Selection system** - Visual highlighting
5. **Navigation** - OrbitControls for easy viewing

### ✅ Professional Quality
1. **PBR materials** - Realistic rendering
2. **Shadows** - Depth perception
3. **Environment maps** - Reflections
4. **Smooth animations** - 60 FPS
5. **Responsive** - Scales to window size

---

## Next Steps

### Phase 1: Enhanced Editing ✅ COMPLETE
- [x] Node visualization
- [x] Node creation/deletion
- [x] Position uniqueness
- [x] Element-node connections
- [x] Horizontal orientation fix

### Phase 2: Interactive Manipulation (In Progress)
- [ ] Drag nodes in 3D space
- [ ] Node snapping (to grid, other nodes)
- [ ] Node merging (combine close nodes)
- [ ] Multi-select elements
- [ ] Copy/paste elements

### Phase 3: Advanced Features
- [ ] Node-based supports (mark nodes as fixed)
- [ ] Node-based loads (apply forces at nodes)
- [ ] Node numbering/renaming
- [ ] Node groups/sets
- [ ] Export node coordinates

### Phase 4: Analysis Integration
- [ ] FEM mesh from nodes
- [ ] Stiffness matrix assembly
- [ ] Result visualization at nodes
- [ ] Node displacement plots
- [ ] React forces at support nodes

---

## Contact & Support

For questions or issues with the 3D modeling system:
1. Check this documentation first
2. Review code comments in source files
3. Check TypeScript compilation errors
4. Use browser DevTools console for runtime errors

---

**Last Updated**: October 8, 2025
**Version**: 2.0.0 (Node-Based Architecture)
**Status**: ✅ Production Ready
