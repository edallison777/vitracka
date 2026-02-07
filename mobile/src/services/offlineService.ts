import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface OfflineAction {
    id: string;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    endpoint: string;
    data?: any;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
}

interface CachedData {
    data: any;
    timestamp: number;
    expiresAt: number;
}

interface SyncConflict {
    localData: any;
    serverData: any;
    field: string;
    timestamp: number;
}

type ConflictResolutionStrategy = 'server-wins' | 'client-wins' | 'merge' | 'manual';

class OfflineService {
    private readonly OFFLINE_ACTIONS_KEY = 'offline_actions';
    private readonly CACHED_DATA_KEY = 'cached_data';
    private readonly SYNC_STATUS_KEY = 'sync_status';
    private isOnline = true;
    private syncInProgress = false;
    private conflictResolutionStrategy: ConflictResolutionStrategy = 'server-wins';

    constructor() {
        this.initializeNetworkListener();
    }

    private initializeNetworkListener(): void {
        NetInfo.addEventListener((state: NetInfoState) => {
            const wasOffline = !this.isOnline;
            this.isOnline = state.isConnected ?? false;

            if (wasOffline && this.isOnline) {
                // Just came back online, sync pending actions
                this.syncOfflineActions();
            }
        });
    }

    async isNetworkAvailable(): Promise<boolean> {
        const state = await NetInfo.fetch();
        return state.isConnected ?? false;
    }

    // Cache management
    async cacheData(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
        const cachedData: CachedData = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
        };

        const allCachedData = await this.getAllCachedData();
        allCachedData[key] = cachedData;

        await AsyncStorage.setItem(this.CACHED_DATA_KEY, JSON.stringify(allCachedData));
    }

    async getCachedData(key: string): Promise<any | null> {
        const allCachedData = await this.getAllCachedData();
        const cachedData = allCachedData[key];

        if (!cachedData) {
            return null;
        }

        if (Date.now() > cachedData.expiresAt) {
            // Data expired, remove it
            delete allCachedData[key];
            await AsyncStorage.setItem(this.CACHED_DATA_KEY, JSON.stringify(allCachedData));
            return null;
        }

        return cachedData.data;
    }

    private async getAllCachedData(): Promise<Record<string, CachedData>> {
        try {
            const cached = await AsyncStorage.getItem(this.CACHED_DATA_KEY);
            return cached ? JSON.parse(cached) : {};
        } catch (error) {
            console.error('Error getting cached data:', error);
            return {};
        }
    }

    async clearExpiredCache(): Promise<void> {
        const allCachedData = await this.getAllCachedData();
        const now = Date.now();
        let hasExpired = false;

        Object.keys(allCachedData).forEach(key => {
            if (now > allCachedData[key].expiresAt) {
                delete allCachedData[key];
                hasExpired = true;
            }
        });

        if (hasExpired) {
            await AsyncStorage.setItem(this.CACHED_DATA_KEY, JSON.stringify(allCachedData));
        }
    }

    // Offline actions queue
    async queueOfflineAction(
        type: OfflineAction['type'],
        endpoint: string,
        data?: any,
        maxRetries: number = 3
    ): Promise<string> {
        const action: OfflineAction = {
            id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type,
            endpoint,
            data,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries
        };

        const actions = await this.getOfflineActions();
        actions.push(action);
        await AsyncStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(actions));

        return action.id;
    }

    private async getOfflineActions(): Promise<OfflineAction[]> {
        try {
            const actions = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
            return actions ? JSON.parse(actions) : [];
        } catch (error) {
            console.error('Error getting offline actions:', error);
            return [];
        }
    }

    async syncOfflineActions(): Promise<void> {
        if (this.syncInProgress || !this.isOnline) {
            return;
        }

        this.syncInProgress = true;
        const actions = await this.getOfflineActions();

        if (actions.length === 0) {
            this.syncInProgress = false;
            return;
        }

        console.log(`Syncing ${actions.length} offline actions`);
        const remainingActions: OfflineAction[] = [];

        for (const action of actions) {
            try {
                await this.executeOfflineAction(action);
                console.log(`Successfully synced action ${action.id}`);
            } catch (error) {
                console.error(`Failed to sync action ${action.id}:`, error);

                action.retryCount++;
                if (action.retryCount < action.maxRetries) {
                    remainingActions.push(action);
                } else {
                    console.error(`Action ${action.id} exceeded max retries, discarding`);
                }
            }
        }

        await AsyncStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(remainingActions));
        this.syncInProgress = false;

        // Update sync status
        await this.updateSyncStatus({
            lastSyncAttempt: Date.now(),
            pendingActions: remainingActions.length,
            lastSuccessfulSync: remainingActions.length === 0 ? Date.now() : undefined
        });
    }

    private async executeOfflineAction(action: OfflineAction): Promise<void> {
        // Import apiClient directly instead of using dynamic import
        const { apiClient } = require('./apiClient');

        switch (action.type) {
            case 'CREATE':
                await apiClient.post(action.endpoint, action.data);
                break;
            case 'UPDATE':
                await apiClient.put(action.endpoint, action.data);
                break;
            case 'DELETE':
                await apiClient.delete(action.endpoint);
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    // Data synchronization and conflict resolution
    async syncData<T>(
        key: string,
        localData: T,
        fetchServerData: () => Promise<T>,
        updateServerData: (data: T) => Promise<T>
    ): Promise<T> {
        if (!this.isOnline) {
            // Return cached data if offline
            const cached = await this.getCachedData(key);
            return cached || localData;
        }

        try {
            const serverData = await fetchServerData();
            const conflicts = this.detectConflicts(localData, serverData);

            if (conflicts.length === 0) {
                // No conflicts, cache and return server data
                await this.cacheData(key, serverData);
                return serverData;
            }

            // Handle conflicts based on strategy
            const resolvedData = await this.resolveConflicts(localData, serverData, conflicts);

            // Update server with resolved data if needed
            if (this.conflictResolutionStrategy !== 'server-wins') {
                const updatedData = await updateServerData(resolvedData);
                await this.cacheData(key, updatedData);
                return updatedData;
            }

            await this.cacheData(key, resolvedData);
            return resolvedData;

        } catch (error) {
            console.error('Error syncing data:', error);
            // Return local data if sync fails
            return localData;
        }
    }

    private detectConflicts<T>(localData: T, serverData: T): SyncConflict[] {
        const conflicts: SyncConflict[] = [];

        if (!localData || !serverData) {
            return conflicts;
        }

        // Simple field-by-field comparison
        // In a real implementation, you'd want more sophisticated conflict detection
        Object.keys(localData as any).forEach(field => {
            const localValue = (localData as any)[field];
            const serverValue = (serverData as any)[field];

            if (localValue !== serverValue && field !== 'updatedAt' && field !== 'timestamp') {
                conflicts.push({
                    localData: localValue,
                    serverData: serverValue,
                    field,
                    timestamp: Date.now()
                });
            }
        });

        return conflicts;
    }

    private async resolveConflicts<T>(
        localData: T,
        serverData: T,
        conflicts: SyncConflict[]
    ): Promise<T> {
        switch (this.conflictResolutionStrategy) {
            case 'server-wins':
                return serverData;

            case 'client-wins':
                return localData;

            case 'merge':
                // Simple merge strategy - prefer newer timestamps
                const merged = { ...serverData };
                conflicts.forEach(conflict => {
                    const localTimestamp = (localData as any).updatedAt || 0;
                    const serverTimestamp = (serverData as any).updatedAt || 0;

                    if (localTimestamp > serverTimestamp) {
                        (merged as any)[conflict.field] = conflict.localData;
                    }
                });
                return merged;

            case 'manual':
                // In a real app, you'd present conflicts to the user
                console.warn('Manual conflict resolution not implemented, using server data');
                return serverData;

            default:
                return serverData;
        }
    }

    // Sync status management
    private async updateSyncStatus(status: Partial<{
        lastSyncAttempt: number;
        lastSuccessfulSync: number;
        pendingActions: number;
        errors: string[];
    }>): Promise<void> {
        const currentStatus = await this.getSyncStatus();
        const updatedStatus = { ...currentStatus, ...status };
        await AsyncStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(updatedStatus));
    }

    async getSyncStatus(): Promise<{
        lastSyncAttempt?: number;
        lastSuccessfulSync?: number;
        pendingActions: number;
        errors: string[];
    }> {
        try {
            const status = await AsyncStorage.getItem(this.SYNC_STATUS_KEY);
            return status ? JSON.parse(status) : { pendingActions: 0, errors: [] };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return { pendingActions: 0, errors: [] };
        }
    }

    // Configuration
    setConflictResolutionStrategy(strategy: ConflictResolutionStrategy): void {
        this.conflictResolutionStrategy = strategy;
    }

    // Utility methods
    async clearOfflineData(): Promise<void> {
        await AsyncStorage.multiRemove([
            this.OFFLINE_ACTIONS_KEY,
            this.CACHED_DATA_KEY,
            this.SYNC_STATUS_KEY
        ]);
    }

    async getPendingActionsCount(): Promise<number> {
        const actions = await this.getOfflineActions();
        return actions.length;
    }
}

export const offlineService = new OfflineService();
export { OfflineService };