// components/3DModels/NodeManager.ts
// Manages nodes in 3D space with Cartesian uniqueness enforcement

import { 
  Node3D, 
  Project3DState, 
  Element3D,
  getPositionHash, 
  arePositionsEqual,
  generateNodeId,
  calculateSpanFromNodes
} from './types3D';

export class NodeManager {
  private nodes: Map<string, Node3D> = new Map();
  private nodesByPosition: Map<string, string> = new Map();

  constructor(initialNodes?: Node3D[]) {
    if (initialNodes) {
      initialNodes.forEach(node => this.addNode(node));
    }
  }

  /**
   * Add a node to the system
   * Ensures no two nodes occupy the same position (Cartesian uniqueness)
   */
  addNode(node: Node3D): Node3D {
    const positionHash = getPositionHash(node.position);
    
    // Check if a node already exists at this position
    const existingNodeId = this.nodesByPosition.get(positionHash);
    if (existingNodeId) {
      // Return existing node instead of creating duplicate
      return this.nodes.get(existingNodeId)!;
    }

    // Add new node
    this.nodes.set(node.id, node);
    this.nodesByPosition.set(positionHash, node.id);
    return node;
  }

  /**
   * Get or create a node at a specific position
   * Enforces Cartesian uniqueness - returns existing node if one exists at position
   */
  getOrCreateNodeAt(
    position: [number, number, number],
    name?: string
  ): Node3D {
    const positionHash = getPositionHash(position);
    const existingNodeId = this.nodesByPosition.get(positionHash);

    if (existingNodeId) {
      return this.nodes.get(existingNodeId)!;
    }

    // Create new node
    const newNode: Node3D = {
      id: generateNodeId(),
      position,
      name: name || this.generateNodeName(),
      connectedElementIds: [],
      isFixed: false
    };

    this.addNode(newNode);
    return newNode;
  }

  /**
   * Find node at position (within tolerance)
   */
  findNodeAt(
    position: [number, number, number],
    tolerance: number = 0.001
  ): Node3D | undefined {
    // First try exact position hash
    const positionHash = getPositionHash(position);
    const exactMatch = this.nodesByPosition.get(positionHash);
    if (exactMatch) {
      return this.nodes.get(exactMatch);
    }

    // Check all nodes within tolerance
    for (const node of this.nodes.values()) {
      if (arePositionsEqual(node.position, position, tolerance)) {
        return node;
      }
    }

    return undefined;
  }

  /**
   * Connect an element to two nodes
   */
  connectElement(elementId: string, startNodeId: string, endNodeId: string): void {
    const startNode = this.nodes.get(startNodeId);
    const endNode = this.nodes.get(endNodeId);

    if (!startNode || !endNode) {
      throw new Error('Cannot connect element: one or both nodes not found');
    }

    // Add element to node's connected elements
    if (!startNode.connectedElementIds.includes(elementId)) {
      startNode.connectedElementIds.push(elementId);
    }
    if (!endNode.connectedElementIds.includes(elementId)) {
      endNode.connectedElementIds.push(elementId);
    }
  }

  /**
   * Disconnect an element from its nodes
   */
  disconnectElement(elementId: string): void {
    for (const node of this.nodes.values()) {
      node.connectedElementIds = node.connectedElementIds.filter(
        id => id !== elementId
      );
    }
  }

  /**
   * Move a node to a new position
   * Enforces Cartesian uniqueness - fails if target position is occupied
   */
  moveNode(
    nodeId: string,
    newPosition: [number, number, number]
  ): { success: boolean; message: string; node?: Node3D } {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return { success: false, message: 'Node not found' };
    }

    // Check if node is fixed
    if (node.isFixed) {
      return { success: false, message: 'Node is locked and cannot be moved' };
    }

    // Check if new position is occupied
    const existingNode = this.findNodeAt(newPosition);
    if (existingNode && existingNode.id !== nodeId) {
      return { 
        success: false, 
        message: `Position already occupied by node ${existingNode.name || existingNode.id}` 
      };
    }

    // Remove old position hash
    const oldHash = getPositionHash(node.position);
    this.nodesByPosition.delete(oldHash);

    // Update position
    node.position = newPosition;

    // Add new position hash
    const newHash = getPositionHash(newPosition);
    this.nodesByPosition.set(newHash, nodeId);

    return { success: true, message: 'Node moved successfully', node };
  }

  /**
   * Delete a node (only if no elements are connected)
   */
  deleteNode(nodeId: string): { success: boolean; message: string } {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return { success: false, message: 'Node not found' };
    }

    if (node.connectedElementIds.length > 0) {
      return { 
        success: false, 
        message: `Cannot delete node: ${node.connectedElementIds.length} element(s) connected` 
      };
    }

    // Remove from maps
    const positionHash = getPositionHash(node.position);
    this.nodesByPosition.delete(positionHash);
    this.nodes.delete(nodeId);

    return { success: true, message: 'Node deleted successfully' };
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Node3D[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): Node3D | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get nodes connected to an element
   */
  getElementNodes(element: Element3D): { start?: Node3D; end?: Node3D } {
    return {
      start: element.startNodeId ? this.nodes.get(element.startNodeId) : undefined,
      end: element.endNodeId ? this.nodes.get(element.endNodeId) : undefined
    };
  }

  /**
   * Generate next node name (N1, N2, N3, etc.)
   */
  private generateNodeName(): string {
    const existingNumbers = Array.from(this.nodes.values())
      .map(n => n.name)
      .filter(name => name && name.match(/^N\d+$/))
      .map(name => parseInt(name!.substring(1)))
      .filter(num => !isNaN(num));

    const nextNumber = existingNumbers.length > 0 
      ? Math.max(...existingNumbers) + 1 
      : 1;

    return `N${nextNumber}`;
  }

  /**
   * Validate all nodes (check for duplicates)
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const positionsSeen = new Set<string>();

    for (const node of this.nodes.values()) {
      const hash = getPositionHash(node.position);
      if (positionsSeen.has(hash)) {
        errors.push(`Duplicate nodes at position ${node.position.join(', ')}`);
      }
      positionsSeen.add(hash);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.nodes.clear();
    this.nodesByPosition.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalNodes: number;
    connectedNodes: number;
    isolatedNodes: number;
  } {
    const totalNodes = this.nodes.size;
    const connectedNodes = Array.from(this.nodes.values())
      .filter(n => n.connectedElementIds.length > 0).length;

    return {
      totalNodes,
      connectedNodes,
      isolatedNodes: totalNodes - connectedNodes
    };
  }
}
