// 会议数据管理工具

class MeetingDataManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupExportImportFeatures();
    }

    // 设置导出导入功能
    setupExportImportFeatures() {
        // 添加数据管理按钮到主页面
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            this.addDataManagementUI();
        }
    }

    // 添加数据管理UI
    addDataManagementUI() {
        setTimeout(() => {
            const container = document.querySelector('.container');
            if (!container) return;

            // 创建数据管理区域
            const dataManagementHTML = `
                <section id="data-management-section" class="mt-8 bg-white rounded-2xl shadow-xl p-8">
                    <div class="text-center mb-6">
                        <h2 class="text-2xl font-semibold text-gray-800 mb-2">数据管理中心</h2>
                        <p class="text-gray-600">导出、导入和管理您的会议数据</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- 导出所有数据 -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="text-center mb-3">
                                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <i class="fas fa-download text-blue-600 text-xl"></i>
                                </div>
                                <h3 class="font-semibold text-gray-800 mt-2">导出所有数据</h3>
                            </div>
                            <p class="text-sm text-gray-600 text-center mb-3">导出所有会议记录和待办事项</p>
                            <button onclick="meetingDataManager.exportAllData()" 
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                                立即导出
                            </button>
                        </div>
                        
                        <!-- 导入数据 -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="text-center mb-3">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <i class="fas fa-upload text-green-600 text-xl"></i>
                                </div>
                                <h3 class="font-semibold text-gray-800 mt-2">导入数据</h3>
                            </div>
                            <p class="text-sm text-gray-600 text-center mb-3">从备份文件导入会议数据</p>
                            <label class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors flex items-center justify-center">
                                <i class="fas fa-file-import mr-2"></i>选择文件
                                <input type="file" id="import-file" accept=".json" class="hidden" 
                                    onchange="meetingDataManager.importData(event)">
                            </label>
                        </div>
                        
                        <!-- 数据清理 -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="text-center mb-3">
                                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                    <i class="fas fa-trash-alt text-red-600 text-xl"></i>
                                </div>
                                <h3 class="font-semibold text-gray-800 mt-2">数据清理</h3>
                            </div>
                            <p class="text-sm text-gray-600 text-center mb-3">清理所有会议数据（不可恢复）</p>
                            <button onclick="meetingDataManager.clearAllData()" 
                                class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                                清理数据
                            </button>
                        </div>
                    </div>
                    
                    <!-- 数据统计 -->
                    <div class="mt-6 bg-gray-50 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-gray-800 mb-3">数据统计</h3>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">总会议数</p>
                                <p id="total-meetings" class="text-xl font-bold text-blue-600">0</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600 mb-1">总内容数</p>
                                <p id="total-contents" class="text-xl font-bold text-green-600">0</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600 mb-1">待办事项</p>
                                <p id="total-todos" class="text-xl font-bold text-yellow-600">0</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600 mb-1">总参与人数</p>
                                <p id="total-participants" class="text-xl font-bold text-purple-600">0</p>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            
            container.insertAdjacentHTML('beforeend', dataManagementHTML);
            
            // 更新数据统计
            this.updateDataStats();
        }, 1000);
    }

    // 更新数据统计
    updateDataStats() {
        const meetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
        const todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
        
        // 计算总内容数和参与人数
        let totalContents = 0;
        let allParticipants = new Set();
        
        meetings.forEach(meeting => {
            totalContents += meeting.contents ? meeting.contents.length : 0;
            if (meeting.participants) {
                meeting.participants.forEach(participant => allParticipants.add(participant));
            }
        });
        
        // 计算所有会议中的参与人数
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('meeting_') && key.endsWith('_participants')) {
                const participants = JSON.parse(localStorage.getItem(key) || '[]');
                participants.forEach(participant => allParticipants.add(participant));
            }
        });
        
        document.getElementById('total-meetings').textContent = meetings.length;
        document.getElementById('total-contents').textContent = totalContents;
        document.getElementById('total-todos').textContent = todos.length;
        document.getElementById('total-participants').textContent = allParticipants.size;
    }

    // 导出所有数据
    exportAllData() {
        const exportData = {
            exportDate: new Date().toISOString(),
            meetingsHistory: JSON.parse(localStorage.getItem('meetingsHistory') || '[]'),
            meetingTodos: JSON.parse(localStorage.getItem('meetingTodos') || '[]'),
            currentMeetings: this.getCurrentMeetingData()
        };

        // 创建下载链接
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // 显示成功通知
        this.showNotification('数据导出成功！', 'success');
    }

    // 获取当前会议数据
    getCurrentMeetingData() {
        const currentMeetings = {};
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('meeting_') && !key.includes('History') && !key.includes('Todos')) {
                try {
                    currentMeetings[key] = JSON.parse(localStorage.getItem(key) || '[]');
                } catch (e) {
                    console.error(`Error parsing ${key}:`, e);
                }
            }
        });
        
        return currentMeetings;
    }

    // 导入数据
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // 确认导入
                if (confirm(`确认导入以下数据？\n- 历史会议: ${importedData.meetingsHistory ? importedData.meetingsHistory.length : 0} 条\n- 待办事项: ${importedData.meetingTodos ? importedData.meetingTodos.length : 0} 条`)) {
                    this.mergeImportedData(importedData);
                    this.showNotification('数据导入成功！', 'success');
                    
                    // 重置文件输入
                    event.target.value = '';
                    
                    // 更新数据统计
                    this.updateDataStats();
                    
                    // 如果是主页面，刷新数据
                    if (window.assistant) {
                        window.assistant.updateStats();
                    }
                }
            } catch (error) {
                console.error('导入失败:', error);
                this.showNotification('导入失败，文件格式不正确', 'error');
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }

    // 合并导入的数据
    mergeImportedData(importedData) {
        // 合并历史会议
        if (importedData.meetingsHistory) {
            const existingMeetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
            const mergedMeetings = [...existingMeetings, ...importedData.meetingsHistory];
            localStorage.setItem('meetingsHistory', JSON.stringify(mergedMeetings));
        }
        
        // 合并待办事项
        if (importedData.meetingTodos) {
            const existingTodos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
            const mergedTodos = [...existingTodos, ...importedData.meetingTodos];
            localStorage.setItem('meetingTodos', JSON.stringify(mergedTodos));
        }
        
        // 导入当前会议数据
        if (importedData.currentMeetings) {
            Object.keys(importedData.currentMeetings).forEach(key => {
                localStorage.setItem(key, JSON.stringify(importedData.currentMeetings[key]));
            });
        }
    }

    // 清理所有数据
    clearAllData() {
        if (confirm('⚠️ 警告：此操作将删除所有会议数据，包括历史会议、待办事项和当前会议内容。此操作不可恢复，确定要继续吗？')) {
            // 清除所有相关数据
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('meeting_') || key === 'meetingsHistory' || key === 'meetingTodos') {
                    localStorage.removeItem(key);
                }
            });
            
            this.showNotification('所有数据已清理！', 'success');
            
            // 更新UI
            this.updateDataStats();
            
            // 如果是主页面，刷新数据
            if (window.assistant) {
                window.assistant.updateStats();
            }
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 如果主页面有通知功能，使用主页面的
        if (window.assistant && window.assistant.showNotification) {
            window.assistant.showNotification(message, type);
            return;
        }
        
        // 否则创建自己的通知
        const notification = document.createElement('div');
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const colorMap = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        notification.className = `${colorMap[type]} text-white px-4 py-3 rounded-lg shadow-lg fixed top-4 right-4 z-50 transform transition-all duration-300 translate-x-full`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="${iconMap[type]} mr-3"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // 数据备份提醒
    setupBackupReminder() {
        const lastBackup = localStorage.getItem('lastBackupReminder');
        const now = new Date().getTime();
        
        // 每周提醒一次备份
        if (!lastBackup || now - parseInt(lastBackup) > 7 * 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                if (confirm('您已经有一段时间没有备份数据了，现在要进行备份吗？')) {
                    this.exportAllData();
                }
                localStorage.setItem('lastBackupReminder', now.toString());
            }, 5000);
        }
    }

    // 数据完整性检查
    checkDataIntegrity() {
        const issues = [];
        
        // 检查历史会议数据
        const meetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
        meetings.forEach((meeting, index) => {
            if (!meeting.id) {
                issues.push(`历史会议 #${index}: 缺少会议ID`);
            }
            if (!meeting.date) {
                issues.push(`历史会议 #${index}: 缺少会议日期`);
            }
        });
        
        // 检查待办事项数据
        const todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
        todos.forEach((todo, index) => {
            if (!todo.id) {
                issues.push(`待办事项 #${index}: 缺少ID`);
            }
            if (!todo.description) {
                issues.push(`待办事项 #${index}: 缺少描述`);
            }
        });
        
        // 检查当前会议数据
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('meeting_') && key.endsWith('_contents')) {
                try {
                    const contents = JSON.parse(localStorage.getItem(key) || '[]');
                    if (!Array.isArray(contents)) {
                        issues.push(`会议内容 ${key}: 格式错误，应为数组`);
                    }
                } catch (e) {
                    issues.push(`会议内容 ${key}: 解析错误 - ${e.message}`);
                }
            }
        });
        
        return issues;
    }

    // 修复数据
    fixDataIssues() {
        const issues = this.checkDataIntegrity();
        
        if (issues.length === 0) {
            this.showNotification('数据完整性检查通过，没有发现问题！', 'success');
            return;
        }
        
        if (confirm(`发现 ${issues.length} 个数据问题，是否尝试自动修复？\n\n${issues.slice(0, 5).join('\n')}${issues.length > 5 ? `\n...还有 ${issues.length - 5} 个问题` : ''}`)) {
            let fixedCount = 0;
            
            // 修复历史会议数据
            let meetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
            meetings = meetings.filter(meeting => meeting.id && meeting.date);
            localStorage.setItem('meetingsHistory', JSON.stringify(meetings));
            fixedCount++;
            
            // 修复待办事项数据
            let todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
            todos = todos.filter(todo => todo.id && todo.description);
            localStorage.setItem('meetingTodos', JSON.stringify(todos));
            fixedCount++;
            
            // 修复损坏的会议数据
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('meeting_') && key.endsWith('_contents')) {
                    try {
                        const contents = JSON.parse(localStorage.getItem(key) || '[]');
                        if (!Array.isArray(contents)) {
                            localStorage.removeItem(key);
                            fixedCount++;
                        }
                    } catch (e) {
                        localStorage.removeItem(key);
                        fixedCount++;
                    }
                }
            });
            
            this.showNotification(`修复完成！已处理 ${fixedCount} 个问题区域。`, 'success');
            this.updateDataStats();
        }
    }
}

// 初始化数据管理工具
let meetingDataManager;
if (typeof window !== 'undefined') {
    meetingDataManager = new MeetingDataManager();
    
    // 添加到全局对象，方便调用
    window.meetingDataManager = meetingDataManager;
    
    // 添加数据完整性检查
    setInterval(() => {
        if (Math.random() > 0.9) { // 10% 概率检查
            const issues = meetingDataManager.checkDataIntegrity();
            if (issues.length > 0) {
                console.warn(`发现 ${issues.length} 个数据问题，建议进行数据修复。`);
            }
        }
    }, 24 * 60 * 60 * 1000); // 每天检查一次
}

// 暴露为全局变量
window.MeetingDataManager = MeetingDataManager;