/**
 * Standalone offline queue — usable outside React.
 *
 * Wraps the IndexedDB queue from offline-db.ts so that non-React modules
 * (like realClient.ts) can enqueue mutations without needing OfflineContext.
 */

import {
  enqueue,
  syncQueue,
  syncUploads,
  getQueueCount,
  clearExpiredCache,
  clearQueue,
  type QueuedAction,
} from '@/lib/offline-db'

export type { QueuedAction }

export const offlineQueue = {
  enqueue,

  async sync() {
    return syncQueue()
  },

  async syncAll() {
    const queueResult = await syncQueue()
    const uploadResult = await syncUploads()
    await clearExpiredCache()
    return {
      synced: queueResult.synced + uploadResult.synced,
      failed: queueResult.failed + uploadResult.failed,
    }
  },

  getQueueCount,
  clearQueue,
}
