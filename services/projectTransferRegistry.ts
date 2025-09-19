import { v4 as uuidv4 } from 'uuid';
import { LoadType, LoadCaseType } from '../customTypes/structuralElement';

export type TransferMeta = {
  transferGroupId: string;
  projectId: string;
  originElementId: string;
  createdAt: number;
  canonicalOwnerId?: string;
  notes?: string;
};

export type SyncedForce = {
  magnitude: number[]; // stored in N
  loadCase: any;
};

export type SyncedAppliedLoad = {
  id: string;
  type: any;
  position: string[];
  forces: SyncedForce[];
  transfer?: TransferMeta;
  /** Optional description carried over from DB or UI */
  description?: string;
};

class ProjectTransferRegistry {
  private groups = new Map<string, SyncedAppliedLoad>();
  private subs = new Map<string, Set<(load: SyncedAppliedLoad) => void>>();

  private key(projectId: string, groupId: string) {
    return `${projectId}:${groupId}`;
  }

  createOrInit(canonical: SyncedAppliedLoad) {
    const meta = canonical.transfer!;
    if (!meta?.projectId || !meta?.transferGroupId) throw new Error('Missing transfer metadata');
    const k = this.key(meta.projectId, meta.transferGroupId);
    if (!this.groups.has(k)) {
      this.groups.set(k, canonical);
      this.subs.set(k, new Set());
    }
  }

  subscribe(projectId: string, groupId: string, cb: (load: SyncedAppliedLoad) => void) {
    const k = this.key(projectId, groupId);
    if (!this.subs.has(k)) this.subs.set(k, new Set());
    this.subs.get(k)!.add(cb);
    const cur = this.groups.get(k);
    if (cur) cb(cur);
    return () => this.subs.get(k)!.delete(cb);
  }

  update(projectId: string, groupId: string, partial: Partial<SyncedAppliedLoad>) {
    const k = this.key(projectId, groupId);
    const existing = this.groups.get(k);
    if (!existing) return;
    const updated: SyncedAppliedLoad = { ...existing, ...partial, transfer: existing.transfer } as SyncedAppliedLoad;
    this.groups.set(k, updated);
    (this.subs.get(k) || new Set()).forEach(cb => cb(updated));
  }

  get(projectId: string, groupId: string) {
    return this.groups.get(this.key(projectId, groupId));
  }

  // Convenience: create a point load from a source element reaction and register it.
  createPointLoadFromReaction(
    sourceEl: any,
    supportIndex: number,
    targetEl: any,
    mapPosToTarget: (pos: number | string) => number
  ) {
    if (!sourceEl?.id || !targetEl?.id) throw new Error('Both source and target must be saved');
    if (!sourceEl.projectId || !targetEl.projectId) throw new Error('Both elements must belong to a project');
    if (sourceEl.projectId !== targetEl.projectId) throw new Error('Source and target must be in same project');

    const support = sourceEl.supports?.[supportIndex];
    if (!support) throw new Error('Support not found');

    //const verticalN = (support.reaction?.Fy?.forces[0]?.magnitude[0] ?? 0);
    const groupId = uuidv4();
    const meta: TransferMeta = {
      transferGroupId: groupId,
      projectId: sourceEl.projectId,
      originElementId: sourceEl.id,
      createdAt: Date.now(),
      canonicalOwnerId: sourceEl.id,
    };

    const posOnTarget = mapPosToTarget(sourceEl.span  ?? 0);

    // Grab all Fy reaction forces. Future implement Fx and Mz
    const reactionForces = support.reaction?.Fy?.forces || [];

    // Build dynamic forces array from reaction forces
    const canonicalForces: SyncedForce[] = [];
    reactionForces.forEach(f => {
      canonicalForces.push({
        magnitude: f.magnitude,
        loadCase: f.loadCase
      });
    });

    const canonical: SyncedAppliedLoad = {
      id: `t-${groupId}`,
      type: LoadType.PointLoad,
      position: [String(posOnTarget/2)],
      forces: canonicalForces,
      description: `${sourceEl.name || 'Element'} (Fy) - support ${supportIndex + 1}  @ ${posOnTarget.toFixed(0)}mm`,
      transfer: meta
    };

    // Do not auto-register here; registry call deferred until save
    // this.createOrInit(canonical);
    return canonical;
  }

  /**
   * Register or update a transfer load in the registry.
   * Should be called once when the transferee element is saved.
   */
  commitTransferLoad(canonical: SyncedAppliedLoad) {
    const { projectId, transferGroupId } = canonical.transfer!;
    const existing = this.get(projectId, transferGroupId);
    if (existing) {
      // Preserve any existing description
      if (existing.description && !canonical.description) {
        canonical.description = existing.description;
      }
      this.update(projectId, transferGroupId, canonical);
    } else {
      this.createOrInit(canonical);
    }
  }
}

export const projectTransferRegistry = new ProjectTransferRegistry();
