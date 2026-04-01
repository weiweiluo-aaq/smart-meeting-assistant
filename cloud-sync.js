/**
 * 云端同步模块
 * 负责会议历史和待办事项与Cloudflare KV的双向同步
 */

class CloudSync {
    constructor() {
        this.apiBase = 'https://guojiyuanlihui.dpdns.org/api';
        this.syncInProgress = false;
    }

    // 获取会议历史（从云端）
    async fetchMeetingsHistory() {
        try {
            const response = await fetch(`${this.apiBase}?syncType=meetingsHistory`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store'
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('获取云端会议历史失败:', error);
            return [];
        }
    }

    // 保存会议历史（到云端）
    async saveMeetingsHistory(meetings) {
        try {
            const response = await fetch(`${this.apiBase}?syncType=meetingsHistory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meetings)
            });
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('保存会议历史到云端失败:', error);
            return false;
        }
    }

    // 获取待办事项（从云端）
    async fetchMeetingTodos() {
        try {
            const response = await fetch(`${this.apiBase}?syncType=meetingTodos`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store'
            });
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('获取云端待办事项失败:', error);
            return [];
        }
    }

    // 保存待办事项（到云端）
    async saveMeetingTodos(todos) {
        try {
            const response = await fetch(`${this.apiBase}?syncType=meetingTodos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(todos)
            });
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('保存待办事项到云端失败:', error);
            return false;
        }
    }

    // 合并本地和云端数据（会议历史）
    async syncMeetingsHistory() {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            const localData = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
            const cloudData = await this.fetchMeetingsHistory();

            // 合并数据：云端优先，时间戳更新者优先
            const merged = this.mergeData(localData, cloudData);

            // 保存合并结果到本地和云端
            localStorage.setItem('meetingsHistory', JSON.stringify(merged));
            await this.saveMeetingsHistory(merged);

            console.log(`会议历史同步完成: 本地${localData.length}条, 云端${cloudData.length}条, 合并后${merged.length}条`);
            return merged;
        } catch (error) {
            console.error('同步会议历史失败:', error);
            return JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
        } finally {
            this.syncInProgress = false;
        }
    }

    // 合并本地和云端数据（待办事项）
    async syncMeetingTodos() {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            const localData = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
            const cloudData = await this.fetchMeetingTodos();

            // 合并数据：基于ID去重，保留最新的
            const merged = this.mergeData(localData, cloudData, 'id');

            // 保存合并结果到本地和云端
            localStorage.setItem('meetingTodos', JSON.stringify(merged));
            await this.saveMeetingTodos(merged);

            console.log(`待办事项同步完成: 本地${localData.length}条, 云端${cloudData.length}条, 合并后${merged.length}条`);
            return merged;
        } catch (error) {
            console.error('同步待办事项失败:', error);
            return JSON.parse(localStorage.getItem('meetingTodos') || '[]');
        } finally {
            this.syncInProgress = false;
        }
    }

    // 合并两个数据数组
    mergeData(local, cloud, idField = 'id') {
        const map = new Map();

        // 先添加云端数据
        cloud.forEach(item => {
            if (item[idField]) {
                map.set(item[idField], item);
            }
        });

        // 再添加本地数据（如果本地更新，则覆盖云端）
        local.forEach(item => {
            if (item[idField]) {
                const existing = map.get(item[idField]);
                if (!existing || new Date(item.date || item.updatedAt) > new Date(existing.date || existing.updatedAt)) {
                    map.set(item[idField], item);
                }
            }
        });

        // 转换为数组，按日期倒序排列
        return Array.from(map.values()).sort((a, b) => {
            const dateA = new Date(a.date || a.updatedAt || 0);
            const dateB = new Date(b.date || b.updatedAt || 0);
            return dateB - dateA;
        });
    }

    // 同步到云端（单向：本地 -> 云端）
    async pushToCloud() {
        try {
            // 保存会议历史
            const meetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
            await this.saveMeetingsHistory(meetings);

            // 保存待办事项
            const todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
            await this.saveMeetingTodos(todos);

            console.log('数据已推送到云端');
            return true;
        } catch (error) {
            console.error('推送数据到云端失败:', error);
            return false;
        }
    }

    // 从云端拉取（单向：云端 -> 本地）
    async pullFromCloud() {
        try {
            const meetings = await this.syncMeetingsHistory();
            const todos = await this.syncMeetingTodos();

            console.log('数据已从云端拉取');
            return { meetings, todos };
        } catch (error) {
            console.error('从云端拉取数据失败:', error);
            return null;
        }
    }
}

// 创建全局实例
const cloudSync = new CloudSync();

// 暴露到全局
window.cloudSync = cloudSync;
window.CloudSync = CloudSync;
