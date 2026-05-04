import { EngineStatus, EngineLog } from "./search-web-types.js";

export class EngineStatusTracker {
    private statusMap: Map<string, EngineStatus> = new Map();
    private logs: EngineLog[] = [];
    private maxLogs: number = 1000;

    constructor() {}

    /**
     * Initialize engine status
     */
    initEngine(name: string, categories: string[] = []): void {
        if (!this.statusMap.has(name)) {
            this.statusMap.set(name, {
                name,
                status: 'active',
                lastCheck: new Date(),
                lastSuccess: null,
                lastFailure: null,
                failureCount: 0,
                successCount: 0,
                totalRequests: 0,
                averageResponseTime: 0,
                categories,
            });
        }
    }

    /**
     * Record a successful engine execution
     */
    recordSuccess(engineName: string, responseTime: number, query?: string): void {
        const status = this.statusMap.get(engineName);
        if (!status) {
            this.initEngine(engineName);
            return this.recordSuccess(engineName, responseTime, query);
        }

        const now = new Date();
        status.lastCheck = now;
        status.lastSuccess = now;
        status.successCount++;
        status.totalRequests++;

        // Update average response time
        const totalTime = status.averageResponseTime * (status.successCount - 1) + responseTime;
        status.averageResponseTime = totalTime / status.successCount;

        // Reset to active if it was failed
        if (status.failureCount > 0 && status.successCount > status.failureCount * 2) {
            status.status = 'active';
        }

        // Add log entry
        this.addLog({
            timestamp: now,
            engineName,
            status: 'success',
            responseTime,
            query,
        });
    }

    /**
     * Record a failed engine execution
     */
    recordFailure(engineName: string, error: string, responseTime: number = 0, query?: string): void {
        const status = this.statusMap.get(engineName);
        if (!status) {
            this.initEngine(engineName);
            return this.recordFailure(engineName, error, responseTime, query);
        }

        const now = new Date();
        status.lastCheck = now;
        status.lastFailure = now;
        status.failureCount++;
        status.totalRequests++;
        status.lastError = error;

        // Mark as failed if failure rate is > 70%
        if (status.totalRequests >= 5) {
            const failureRate = status.failureCount / status.totalRequests;
            if (failureRate > 0.7) {
                status.status = 'failed';
            }
        }

        // Add log entry
        this.addLog({
            timestamp: now,
            engineName,
            status: 'failure',
            responseTime,
            error,
            query,
        });
    }

    /**
     * Get status for a specific engine
     */
    getStatus(engineName: string): EngineStatus | undefined {
        return this.statusMap.get(engineName);
    }

    /**
     * Get all engine statuses
     */
    getAllStatuses(): EngineStatus[] {
        return Array.from(this.statusMap.values());
    }

    /**
     * Get statuses by category
     */
    getStatusesByCategory(category: string): EngineStatus[] {
        return Array.from(this.statusMap.values()).filter(status =>
            status.categories.includes(category)
        );
    }

    /**
     * Get recent logs
     */
    getRecentLogs(limit: number = 100): EngineLog[] {
        return this.logs.slice(-limit);
    }

    /**
     * Get logs for a specific engine
     */
    getEngineLogs(engineName: string, limit: number = 50): EngineLog[] {
        return this.logs
            .filter(log => log.engineName === engineName)
            .slice(-limit);
    }

    /**
     * Get failure rate for an engine
     */
    getFailureRate(engineName: string): number {
        const status = this.statusMap.get(engineName);
        if (!status || status.totalRequests === 0) return 0;
        return status.failureCount / status.totalRequests;
    }

    /**
     * Check if engine should be used (not failed or disabled)
     */
    isEngineHealthy(engineName: string): boolean {
        const status = this.statusMap.get(engineName);
        if (!status) return true; // Unknown engines are assumed healthy
        return status.status === 'active';
    }

    /**
     * Disable an engine manually
     */
    disableEngine(engineName: string): void {
        const status = this.statusMap.get(engineName);
        if (status) {
            status.status = 'disabled';
        }
    }

    /**
     * Enable an engine manually
     */
    enableEngine(engineName: string): void {
        const status = this.statusMap.get(engineName);
        if (status) {
            status.status = 'active';
            // Reset failure count
            status.failureCount = 0;
        }
    }

    /**
     * Add a log entry
     */
    private addLog(log: EngineLog): void {
        this.logs.push(log);

        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    /**
     * Get statistics summary
     */
    getStatsSummary(): {
        total: number;
        active: number;
        failed: number;
        disabled: number;
        averageFailureRate: number;
    } {
        const statuses = this.getAllStatuses();
        const total = statuses.length;
        const active = statuses.filter(s => s.status === 'active').length;
        const failed = statuses.filter(s => s.status === 'failed').length;
        const disabled = statuses.filter(s => s.status === 'disabled').length;

        const failureRates = statuses
            .filter(s => s.totalRequests > 0)
            .map(s => s.failureCount / s.totalRequests);

        const averageFailureRate = failureRates.length > 0
            ? failureRates.reduce((a, b) => a + b, 0) / failureRates.length
            : 0;

        return {
            total,
            active,
            failed,
            disabled,
            averageFailureRate,
        };
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        this.logs = [];
    }

    /**
     * Reset statistics for an engine
     */
    resetEngine(engineName: string): void {
        const status = this.statusMap.get(engineName);
        if (status) {
            status.failureCount = 0;
            status.successCount = 0;
            status.totalRequests = 0;
            status.averageResponseTime = 0;
            status.status = 'active';
            status.lastError = undefined;
        }
    }
}

// Global instance
export const engineStatusTracker = new EngineStatusTracker();
