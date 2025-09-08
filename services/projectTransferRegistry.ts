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
    mapPosToTarget: (pos: number | string) => string
  ) {
    if (!sourceEl?.id || !targetEl?.id) throw new Error('Both source and target must be saved');
    if (!sourceEl.projectId || !targetEl.projectId) throw new Error('Both elements must belong to a project');
    if (sourceEl.projectId !== targetEl.projectId) throw new Error('Source and target must be in same project');

    const support = sourceEl.supports?.[supportIndex];
    if (!support) throw new Error('Support not found');

    const verticalN = (support.reaction?.Fx ?? 0);
    const groupId = uuidv4();
    const meta: TransferMeta = {
      transferGroupId: groupId,
      projectId: sourceEl.projectId,
      originElementId: sourceEl.id,
      createdAt: Date.now(),
      canonicalOwnerId: sourceEl.id,
    };

    const posOnTarget = mapPosToTarget(support.position ?? 0);

    // Build forces: include Dead with the transfer magnitude and Live with 0 so UI shows both cases
    const canonical: SyncedAppliedLoad = {
      id: `t-${groupId}`,
      type: (LoadType.PointLoad as any),
      position: [String(posOnTarget)],
      forces: [
        { magnitude: [verticalN || 0], loadCase: (LoadCaseType.Dead as any) },
        { magnitude: [0], loadCase: (LoadCaseType.Live as any) }
      ],
      transfer: meta
    };

    this.createOrInit(canonical);
    return canonical;
  }
}

export const projectTransferRegistry = new ProjectTransferRegistry();
