// components/3DModels/types3D.ts
// Type definitions for 3D modeling system

import { Element } from '../../customTypes/structuralElement';

/**
 * Represents a node (connection point) in 3D space
 * Nodes are unique points where elements connect
 */
export interface Node3D {
  id: string; // Unique identifier
  position: [number, number, number]; // [x, y, z] in meters
  name?: string; // Optional label (e.g., "N1", "N2")
  connectedElementIds: string[]; // IDs of elements connected to this node
  isFixed?: boolean; // Whether node position is locked
}

/**
 * Connection information for an element
 * Each element has two nodes: start and end
 */
export interface ElementConnection {
  elementId: string;
  startNodeId: string;
  endNodeId: string;
}

/**
 * Extended Element interface with node connections
 */
export interface Element3D extends Element {
  startNodeId?: string; // ID of start node
  endNodeId?: string; // ID of end node
}

/**
 * Project state for 3D modeling
 */
export interface Project3DState {
  nodes: Map<string, Node3D>; // All nodes in the project
  nodesByPosition: Map<string, string>; // Position hash -> Node ID (for uniqueness)
  elements: Element3D[]; // Elements with node connections
}

/**
 * Helper to create position hash for uniqueness checking
 * Rounds to 3 decimal places (mm precision)
 */
export function getPositionHash(position: [number, number, number]): string {
  const [x, y, z] = position.map(v => Math.round(v * 1000) / 1000);
  return `${x},${y},${z}`;
}

/**
 * Helper to check if two positions are the same (within tolerance)
 */
export function arePositionsEqual(
  pos1: [number, number, number],
  pos2: [number, number, number],
  tolerance: number = 0.001 // 1mm tolerance
): boolean {
  return (
    Math.abs(pos1[0] - pos2[0]) < tolerance &&
    Math.abs(pos1[1] - pos2[1]) < tolerance &&
    Math.abs(pos1[2] - pos2[2]) < tolerance
  );
}

/**
 * Generate unique node ID
 */
export function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate element span from node positions
 */
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

/**
 * Calculate midpoint between two nodes
 */
export function calculateMidpoint(
  startNode: Node3D,
  endNode: Node3D
): [number, number, number] {
  return [
    (startNode.position[0] + endNode.position[0]) / 2,
    (startNode.position[1] + endNode.position[1]) / 2,
    (startNode.position[2] + endNode.position[2]) / 2
  ];
}

/**
 * Calculate rotation angle from node positions (around Y-axis)
 */
export function calculateRotationFromNodes(
  startNode: Node3D,
  endNode: Node3D
): number {
  const dx = endNode.position[0] - startNode.position[0];
  const dz = endNode.position[2] - startNode.position[2];
  return Math.atan2(dz, dx) * (180 / Math.PI);
}
