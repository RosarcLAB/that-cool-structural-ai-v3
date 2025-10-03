# Node-Based 3D System Documentation

## Overview

The 3D modeling system now uses a **node-based architecture** where structural elements connect to unique nodes in Cartesian space. This ensures proper structural connectivity and prevents position duplicates.

---

## Key Concepts

### 1. **Nodes (Node3D)**
Nodes are unique connection points in 3D space where structural elements begin and end.

**Properties:**
- `id`: Unique identifier (e.g., "node-1234567890-abc123")
- `position`: [x, y, z] coordinates in meters
- `name`: Optional label (e.g., "N1", "N2", "N3")
- `connectedElementIds`: Array of element IDs connected to this node
- `isFixed`: Boolean indicating if node position is locked (support)

**Characteristics:**
- **Cartesian Uniqueness**: No two nodes can exist at the same position (within 1mm tolerance)
- **Automatic Reuse**: Drawing at an existing node position reuses that node
- **Connection Tracking**: Nodes track all connected elements
- **Deletion Protection**: Nodes with connected elements cannot be deleted

### 2. **Element Connections (Element3D)**
Elements now extend the base `Element` interface with node references:

```typescript
interface Element3D extends Element {
  startNodeId?: string;  // ID of start node
  endNodeId?: string;    // ID of end node
}
```

**Benefits:**
- Elements are "locked in" to their nodes
- Span is calculated automatically from node positions
- Moving a node updates all connected elements
- Proper structural connectivity is enforced

### 3. **Position Hashing**
Position uniqueness is enforced using a hash map:

```typescript
// Position [1.234, 5.678, 9.012] → Hash "1.234,5.678,9.012"
getPositionHash([x, y, z]) → "x,y,z"
```

**Precision:** Rounded to 3 decimal places (millimeter precision)

---

## Architecture

### File Structure

```
components/3DModels/
├── types3D.ts              # Type definitions and utilities
├── NodeManager.ts          # Node management service
├── Node3DComponent.tsx     # Visual node representation
├── ProjectModel.tsx        # Main 3D viewer (updated)
└── StructuralElement3D.tsx # Element rendering (unchanged)
```

### Component Hierarchy

```
ProjectModel
├── NodeManager (singleton via useRef)
├── Node3DComponent[] (visual nodes)
└── StructuralElement3D[] (elements between nodes)
```

---

## NodeManager API

The `NodeManager` class handles all node operations:

### Core Methods

#### `getOrCreateNodeAt(position, name?): Node3D`
Get existing node at position or create new one.

```typescript
const node = nodeManager.getOrCreateNodeAt([5, 0, 10], "N1");
// Returns existing node if one exists within 1mm tolerance
```

#### `connectElement(elementId, startNodeId, endNodeId): void`
Connect an element to two nodes.

```typescript
nodeManager.connectElement("elem-123", "node-abc", "node-xyz");
// Adds element ID to both nodes' connectedElementIds arrays
```

#### `disconnectElement(elementId): void`
Disconnect element from all nodes.

```typescript
nodeManager.disconnectElement("elem-123");
// Removes element ID from all nodes
```

#### `moveNode(nodeId, newPosition): { success, message, node? }`
Move a node to a new position.

```typescript
const result = nodeManager.moveNode("node-abc", [10, 0, 5]);
if (!result.success) {
  console.error(result.message); // Position occupied or node is fixed
}
```

#### `deleteNode(nodeId): { success, message }`
Delete a node (only if no elements connected).

```typescript
const result = nodeManager.deleteNode("node-abc");
// Fails if node has connected elements
```

### Query Methods

- `getAllNodes(): Node3D[]` - Get all nodes
- `getNode(nodeId): Node3D | undefined` - Get node by ID
- `findNodeAt(position, tolerance?): Node3D | undefined` - Find node at position
- `getElementNodes(element): { start?, end? }` - Get nodes for element

### Utility Methods

- `validate(): { valid, errors[] }` - Check for duplicate positions
- `getStats(): { totalNodes, connectedNodes, isolatedNodes }` - Get statistics
- `clear(): void` - Remove all nodes

---

## Drawing Workflow

### Creating Elements

When drawing a line in 3D space:

1. **Click Start Point**
   ```typescript
   handlePlaneClick(startPoint) {
     startDrawing(startPoint);
   }
   ```

2. **Click End Point**
   ```typescript
   handlePlaneClick(endPoint) {
     const line = finishDrawing(endPoint);
     createElementFromLine(line.start, line.end);
   }
   ```

3. **Create Element with Nodes**
   ```typescript
   createElementFromLine(start, end) {
     // Get or create nodes at positions
     const startNode = nodeManager.getOrCreateNodeAt([start.x, start.y, start.z]);
     const endNode = nodeManager.getOrCreateNodeAt([end.x, end.y, end.z]);
     
     // Calculate span from nodes
     const span = calculateSpanFromNodes(startNode, endNode);
     
     // Create element with node connections
     const newElement = {
       ...elementProperties,
       startNodeId: startNode.id,
       endNodeId: endNode.id,
       span
     };
     
     // Register connection
     nodeManager.connectElement(newElement.id, startNode.id, endNode.id);
   }
   ```

### Node Reuse Example

```typescript
// Drawing first element
Click at [0, 0, 0]    → Creates Node N1 at [0, 0, 0]
Click at [5, 0, 0]    → Creates Node N2 at [5, 0, 0]
→ Element E1 connects N1 to N2

// Drawing second element (sharing N2)
Click at [5, 0, 0]    → Reuses existing Node N2
Click at [10, 0, 0]   → Creates Node N3 at [10, 0, 0]
→ Element E2 connects N2 to N3

// Result: Three nodes, two elements
// N1(0,0,0) —— E1 —— N2(5,0,0) —— E2 —— N3(10,0,0)
```

---

## Node Visualization

### Visual States

Nodes are rendered as colored spheres with different appearances based on state:

| State | Color | Scale | Indicator |
|-------|-------|-------|-----------|
| Isolated | Gray (#9E9E9E) | 1.0x | None |
| Connected | Orange (#FF9800) | 1.0x | None |
| Fixed/Support | Red (#F44336) | 1.0x | Red cone above |
| Hovered | Blue (#2196F3) | 1.3x | Label + count |
| Selected | Green (#4CAF50) | 1.5x | Label + count |

### Interactive Features

- **Hover**: Shows node name and connection count
- **Click**: Selects node (future: enable editing)
- **Support Indicator**: Small cone above fixed nodes

### Node Labels

Labels appear on hover/selection:
- **Top**: Node name (e.g., "N1")
- **Bottom**: Connection count (e.g., "2 elements")

---

## Cartesian Uniqueness

### Enforcement

Position uniqueness is enforced at multiple levels:

1. **Hash Map**: `Map<positionHash, nodeId>`
   - O(1) lookup for exact positions
   - Prevents duplicate creation

2. **Tolerance Check**: Within 1mm tolerance
   ```typescript
   arePositionsEqual(pos1, pos2, 0.001)
   // Returns true if all axes within 1mm
   ```

3. **Move Validation**: Checks target position before moving
   ```typescript
   moveNode(nodeId, newPosition) {
     if (existingNodeAtPosition) {
       return { success: false, message: "Position occupied" };
     }
     // Proceed with move
   }
   ```

### Edge Cases

**Case 1: Drawing on existing node**
```typescript
Click at [5.0001, 0, 0]  // Within 1mm of existing node at [5, 0, 0]
→ Reuses existing node (no new node created)
```

**Case 2: Moving node to occupied position**
```typescript
moveNode("node-1", [5, 0, 0])  // Position already occupied
→ Returns { success: false, message: "Position already occupied by node N2" }
```

**Case 3: Deleting node with connections**
```typescript
deleteNode("node-1")  // Has 2 connected elements
→ Returns { success: false, message: "Cannot delete: 2 element(s) connected" }
```

---

## Helper Functions

### Position Utilities

```typescript
// Create position hash
getPositionHash([1.234, 5.678, 9.012])
→ "1.234,5.678,9.012"

// Check position equality (1mm tolerance)
arePositionsEqual([1.0, 2.0, 3.0], [1.0005, 2.0005, 3.0005])
→ true

// Generate unique node ID
generateNodeId()
→ "node-1703123456789-abc123"
```

### Calculation Utilities

```typescript
// Calculate span between nodes
calculateSpanFromNodes(startNode, endNode)
→ 7.071 // meters (distance in 3D space)

// Calculate midpoint
calculateMidpoint(startNode, endNode)
→ [5.0, 2.5, 7.5] // [x, y, z]

// Calculate rotation angle
calculateRotationFromNodes(startNode, endNode)
→ 1.047 // radians (angle in XZ plane)
```

---

## Integration with Existing System

### Backward Compatibility

Elements without node connections still work:
- Use grid-based positioning
- Nodes created automatically on project load
- Existing `position` fields in supports remain valid

### Migration Strategy

1. **Load Project**: Existing elements positioned via grid
2. **Generate Nodes**: Nodes created at element endpoints
3. **Connect Elements**: Elements linked to generated nodes
4. **Future Saves**: Elements saved with node connections

### Support Nodes

Supports can reference nodes:
```typescript
interface Support {
  position: number | Coordinate | { nodeId: string }; // Future: node-based supports
  fixity: SupportFixityType;
}
```

**Future Enhancement**: Supports reference nodes directly, marking them as `isFixed: true`

---

## Usage Examples

### Example 1: Drawing Connected Elements

```typescript
// Draw first beam
Click [0, 0, 0]  → Creates N1
Click [5, 0, 0]  → Creates N2
→ Beam B1 [N1 → N2]

// Draw second beam (sharing N2)
Click [5, 0, 0]  → Reuses N2 (within tolerance)
Click [5, 0, 5]  → Creates N3
→ Beam B2 [N2 → N3]

// Result: 3 nodes, 2 beams
// N2 has 2 connected elements
```

### Example 2: Deleting Element

```typescript
deleteElement("beam-B1") {
  nodeManager.disconnectElement("beam-B1");
  // N1 and N2 no longer track B1
  
  // N1 now has 0 connections (isolated)
  // N2 still has 1 connection (B2)
}
```

### Example 3: Node Statistics

```typescript
nodeManager.getStats()
→ {
    totalNodes: 5,
    connectedNodes: 4,  // Nodes with elements
    isolatedNodes: 1    // Orphaned nodes
  }
```

---

## Benefits

### 1. **Proper Structural Connectivity**
- Elements are locked to nodes
- True structural model (like FEM)
- Supports structural analysis

### 2. **Cartesian Uniqueness**
- No duplicate positions
- Clean geometry
- Prevents modeling errors

### 3. **Efficient Reuse**
- Nodes shared between elements
- Reduced memory usage
- Faster rendering

### 4. **Future Features**
- Node-based editing (move node, update all elements)
- Mesh generation from nodes
- Structural analysis integration
- Load application at nodes
- Boundary conditions at nodes

---

## Future Enhancements

### Phase 1: Node Editing ✅ (Current)
- [x] Node visualization
- [x] Node creation/deletion
- [x] Position uniqueness
- [x] Element-node connections

### Phase 2: Interactive Editing (Next)
- [ ] Move nodes (drag in 3D)
- [ ] Node snapping (to grid, other nodes)
- [ ] Node merging (combine close nodes)
- [ ] Node properties panel

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

---

## Troubleshooting

### Issue: Duplicate nodes appearing

**Cause**: Tolerance too small or position hash collision

**Solution**: Increase tolerance or check hash function
```typescript
const TOLERANCE = 0.001; // 1mm - increase if needed
```

### Issue: Elements not connecting to nodes

**Cause**: NodeManager not properly initialized

**Solution**: Check useRef initialization
```typescript
const nodeManagerRef = useRef<NodeManager>(new NodeManager());
```

### Issue: Nodes not rendering

**Cause**: Nodes state not updated after creation

**Solution**: Call setNodes after node operations
```typescript
nodeManager.getOrCreateNodeAt(...);
setNodes(nodeManager.getAllNodes()); // Update React state
```

---

## Summary

The node-based system provides:

1. ✅ **Elements locked to nodes** - Elements connect two nodes
2. ✅ **Cartesian uniqueness** - No duplicate positions (within 1mm)
3. ✅ **Automatic reuse** - Drawing at existing node reuses it
4. ✅ **Visual feedback** - Nodes colored by state, with labels
5. ✅ **Clean architecture** - Separation of concerns (NodeManager, Node3DComponent)
6. ✅ **Backward compatible** - Existing elements still work
7. ✅ **Future-ready** - Foundation for advanced features

This system transforms the 3D viewer into a proper structural modeling tool with node-based connectivity and spatial constraints.
