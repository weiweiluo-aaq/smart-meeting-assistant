// 历史会议管理逻辑

class HistoryManager {
    constructor() {
        this.meetings = [];
        this.filteredMeetings = [];
        this.selectedMeetings = new Set();
        
        this.init();
    }

    init() {
        this.loadMeetings();
        this.setupEventListeners();
        this.updateStats();
    }

    // 加载会议数据
    loadMeetings() {
        this.meetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
        this.filteredMeetings = [...this.meetings];
        
        this.displayMeetings();
        this.updateStats();
        document.getElementById('total-meetings').textContent = this.meetings.length;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 筛选器
        document.getElementById('date-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('participant-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('type-filter').addEventListener('change', () => this.applyFilters());
        
        // 搜索
        document.getElementById('search-input').addEventListener('input', () => this.applyFilters());
        
        // 排序
        document.getElementById('sort-order').addEventListener('change', () => this.sortMeetings());
        
        // 导出
        document.getElementById('export-selected').addEventListener('click', () => this.exportSelected());
        
        // 清除筛选
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
    }

    // 应用筛选
    applyFilters() {
        const dateFilter = document.getElementById('date-filter').value;
        const participantFilter = document.getElementById('participant-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const searchQuery = document.getElementById('search-input').value.toLowerCase();

        let filtered = [...this.meetings];

        // 日期筛选
        if (dateFilter !== 'all') {
            const now = new Date();
            let filterDate = new Date();
            
            switch (dateFilter) {
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    filterDate.setMonth(now.getMonth() - 3);
                    break;
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            filtered = filtered.filter(meeting => 
                new Date(meeting.date) >= filterDate
            );
        }

        // 参与人数筛选
        if (participantFilter !== 'all') {
            filtered = filtered.filter(meeting => {
                const participantCount = meeting.participants ? meeting.participants.length : 0;
                
                switch (participantFilter) {
                    case '1-3':
                        return participantCount >= 1 && participantCount <= 3;
                    case '4-10':
                        return participantCount >= 4 && participantCount <= 10;
                    case '10+':
                        return participantCount > 10;
                    default:
                        return true;
                }
            });
        }

        // 类型筛选（这里我们根据内容推断类型）
        if (typeFilter !== 'all') {
            filtered = filtered.filter(meeting => {
                const contentText = meeting.contents.map(c => c.content).join(' ').toLowerCase();
                
                switch (typeFilter) {
                    case 'project':
                        return contentText.includes('项目') || contentText.includes('开发') || contentText.includes('进度');
                    case 'weekly':
                        return contentText.includes('周报') || contentText.includes('周会') || contentText.includes('本周');
                    case 'review':
                        return contentText.includes('评审') || contentText.includes('审核') || contentText.includes('反馈');
                    case 'brainstorm':
                        return contentText.includes('想法') || contentText.includes('创意') || contentText.includes('头脑风暴');
                    default:
                        return true;
                }
            });
        }

        // 搜索筛选
        if (searchQuery) {
            filtered = filtered.filter(meeting => {
                const meetingText = `${meeting.id} ${meeting.contents.map(c => c.content).join(' ')} ${meeting.participants ? meeting.participants.join(' ') : ''}`.toLowerCase();
                return meetingText.includes(searchQuery);
            });
        }

        this.filteredMeetings = filtered;
        this.displayMeetings();
        document.getElementById('total-meetings').textContent = filtered.length;
    }

    // 排序会议
    sortMeetings() {
        const sortOrder = document.getElementById('sort-order').value;
        let sorted = [...this.filteredMeetings];

        switch (sortOrder) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'most-content':
                sorted.sort((a, b) => {
                    const aContent = a.contents ? a.contents.length : 0;
                    const bContent = b.contents ? b.contents.length : 0;
                    return bContent - aContent;
                });
                break;
            case 'most-participants':
                sorted.sort((a, b) => {
                    const aParticipants = a.participants ? a.participants.length : 0;
                    const bParticipants = b.participants ? b.participants.length : 0;
                    return bParticipants - aParticipants;
                });
                break;
        }

        this.filteredMeetings = sorted;
        this.displayMeetings();
    }

    // 显示会议列表
    displayMeetings() {
        const meetingsList = document.getElementById('meetings-list');
        
        if (this.filteredMeetings.length === 0) {
            meetingsList.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">没有找到匹配的会议记录</p>
                </div>
            `;
            return;
        }

        meetingsList.innerHTML = this.filteredMeetings.map((meeting, index) => {
            const participantCount = meeting.participants ? meeting.participants.length : 0;
            const contentCount = meeting.contents ? meeting.contents.length : 0;
            const actionItemsCount = meeting.analysis && meeting.analysis.actionItems ? meeting.analysis.actionItems.length : 0;
            const date = new Date(meeting.date);
            
            // 推断会议优先级
            const priority = this.inferMeetingPriority(meeting);
            
            return `
                <div class="meeting-card bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <div class="flex items-center gap-2">
                                    <h4 class="font-semibold text-gray-800">${meeting.id}</h4>
                                    ${priority ? `<span class="priority-badge priority-${priority}">${priority === 'high' ? '高优先级' : priority === 'medium' ? '中优先级' : '低优先级'}</span>` : ''}
                                </div>
                                <p class="text-sm text-gray-500">${date.toLocaleString('zh-CN')}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="selectMeeting('${meeting.id}')" class="text-gray-400 hover:text-blue-600">
                                    <i class="far fa-check-circle"></i>
                                </button>
                                <button onclick="viewMeetingDetails('${meeting.id}')" class="text-gray-400 hover:text-blue-600">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-4 text-center mb-3">
                            <div>
                                <p class="text-xs text-gray-500 mb-0.5">参与人数</p>
                                <p class="text-sm font-semibold text-gray-800">${participantCount}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 mb-0.5">内容数量</p>
                                <p class="text-sm font-semibold text-gray-800">${contentCount}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 mb-0.5">行动项</p>
                                <p class="text-sm font-semibold text-gray-800">${actionItemsCount}</p>
                            </div>
                        </div>
                        
                        ${meeting.analysis && meeting.analysis.summary ? `
                            <p class="text-sm text-gray-700 mb-3 line-clamp-2">${meeting.analysis.summary}</p>
                        ` : ''}
                        
                        <div class="flex flex-wrap gap-2">
                            ${meeting.participants && meeting.participants.slice(0, 3).map(participant => `
                                <span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">${participant}</span>
                            `).join('')}
                            ${meeting.participants && meeting.participants.length > 3 ? `
                                <span class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">+${meeting.participants.length - 3}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 推断会议优先级
    inferMeetingPriority(meeting) {
        let highPriorityCount = 0;
        let mediumPriorityCount = 0;
        
        if (meeting.analysis && meeting.analysis.actionItems) {
            meeting.analysis.actionItems.forEach(item => {
                if (item.priority === 'high') highPriorityCount++;
                if (item.priority === 'medium') mediumPriorityCount++;
            });
        }
        
        if (highPriorityCount > 2) return 'high';
        if (highPriorityCount > 0 || mediumPriorityCount > 3) return 'medium';
        return null;
    }

    // 更新统计数据
    updateStats() {
        const totalMeetings = this.meetings.length;
        
        // 计算总参与人数（去重）
        const allParticipants = new Set();
        this.meetings.forEach(meeting => {
            if (meeting.participants) {
                meeting.participants.forEach(p => allParticipants.add(p));
            }
        });
        
        // 计算总内容数
        const totalContents = this.meetings.reduce((sum, meeting) => {
            return sum + (meeting.contents ? meeting.contents.length : 0);
        }, 0);
        
        // 计算总行动项
        const totalActions = this.meetings.reduce((sum, meeting) => {
            return sum + (meeting.analysis && meeting.analysis.actionItems ? meeting.analysis.actionItems.length : 0);
        }, 0);

        document.getElementById('stat-total').textContent = totalMeetings;
        document.getElementById('stat-participants').textContent = allParticipants.size;
        document.getElementById('stat-contents').textContent = totalContents;
        document.getElementById('stat-actions').textContent = totalActions;
    }

    // 导出选中的会议
    exportSelected() {
        if (this.selectedMeetings.size === 0) {
            alert('请先选择要导出的会议');
            return;
        }

        const selectedMeetings = this.meetings.filter(meeting => 
            this.selectedMeetings.has(meeting.id)
        );

        const exportData = {
            exportDate: new Date().toISOString(),
            meetings: selectedMeetings,
            count: selectedMeetings.length
        };

        // 创建下载链接
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-history-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // 清除选择
        this.selectedMeetings.clear();
    }

    // 清除筛选
    clearFilters() {
        document.getElementById('date-filter').value = 'all';
        document.getElementById('participant-filter').value = 'all';
        document.getElementById('type-filter').value = 'all';
        document.getElementById('search-input').value = '';
        
        this.applyFilters();
    }
}

// 全局函数
let historyManager;
const selectedMeetings = new Set();

function initHistoryManager() {
    historyManager = new HistoryManager();
}

function selectMeeting(meetingId) {
    if (selectedMeetings.has(meetingId)) {
        selectedMeetings.delete(meetingId);
    } else {
        selectedMeetings.add(meetingId);
    }
    
    // 更新按钮状态
    const exportBtn = document.getElementById('export-selected');
    if (selectedMeetings.size > 0) {
        exportBtn.innerHTML = `<i class="fas fa-download mr-2"></i>导出选中 (${selectedMeetings.size})`;
        exportBtn.classList.remove('bg-green-600');
        exportBtn.classList.add('bg-green-700');
    } else {
        exportBtn.innerHTML = '<i class="fas fa-download mr-2"></i>导出选中';
        exportBtn.classList.remove('bg-green-700');
        exportBtn.classList.add('bg-green-600');
    }
}

function viewMeetingDetails(meetingId) {
    const meeting = historyManager.meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    
    const modal = document.getElementById('meeting-modal');
    const modalContent = document.getElementById('modal-content');
    const modalMeetingId = document.getElementById('modal-meeting-id');
    
    modalMeetingId.textContent = `会议详情 - ${meeting.id}`;
    
    const date = new Date(meeting.date);
    const participantCount = meeting.participants ? meeting.participants.length : 0;
    const contentCount = meeting.contents ? meeting.contents.length : 0;
    
    // 构建详情内容
    let detailsHTML = `
        <div class="space-y-6">
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">会议基本信息</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">会议ID</p>
                        <p class="font-medium text-gray-800 font-mono">${meeting.id}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">会议时间</p>
                        <p class="font-medium text-gray-800">${date.toLocaleString('zh-CN')}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">参与人数</p>
                        <p class="font-medium text-gray-800">${participantCount} 人</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">内容数量</p>
                        <p class="font-medium text-gray-800">${contentCount} 条</p>
                    </div>
                </div>
            </div>
    `;
    
    // 添加会议总结
    if (meeting.analysis && meeting.analysis.summary) {
        detailsHTML += `
            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-2">会议总结</h4>
                <p class="text-gray-700 leading-relaxed">${meeting.analysis.summary}</p>
            </div>
        `;
    }
    
    // 添加会议内容
    detailsHTML += `
        <div>
            <h4 class="text-lg font-semibold text-gray-800 mb-2">会议内容</h4>
            <div class="space-y-3">
                ${meeting.contents.map((content, index) => `
                    <div class="bg-white border border-gray-200 rounded-lg p-3">
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-sm font-medium text-gray-800">${content.participant || '匿名参与者'}</span>
                            <span class="text-xs text-gray-500">${new Date(content.timestamp).toLocaleTimeString('zh-CN')}</span>
                        </div>
                        <p class="text-gray-700">${content.content}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 添加AI分析结果
    if (meeting.analysis) {
        // 情感分析
        if (meeting.analysis.sentimentAnalysis) {
            detailsHTML += `
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">情感分析</h4>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div class="bg-green-50 rounded-lg p-3">
                            <p class="text-sm text-gray-600 mb-1">积极</p>
                            <p class="text-lg font-bold text-green-600">${meeting.analysis.sentimentAnalysis.positivePercentage}%</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                            <p class="text-sm text-gray-600 mb-1">中性</p>
                            <p class="text-lg font-bold text-gray-600">${meeting.analysis.sentimentAnalysis.neutralPercentage}%</p>
                        </div>
                        <div class="bg-red-50 rounded-lg p-3">
                            <p class="text-sm text-gray-600 mb-1">消极</p>
                            <p class="text-lg font-bold text-red-600">${meeting.analysis.sentimentAnalysis.negativePercentage}%</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 行动项
        if (meeting.analysis.actionItems && meeting.analysis.actionItems.length > 0) {
            detailsHTML += `
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">行动项</h4>
                    <div class="space-y-2">
                        ${meeting.analysis.actionItems.map(item => `
                            <div class="bg-white border border-gray-200 rounded-lg p-3">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="px-2 py-0.5 text-xs font-medium rounded-full ${item.priority === 'high' ? 'bg-red-100 text-red-800' : item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                                        ${item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级'}
                                    </span>
                                    <span class="text-xs text-gray-500">${item.participant}</span>
                                </div>
                                <p class="text-gray-800">${item.description}</p>
                                ${item.deadline ? `<p class="text-sm text-gray-600 mt-1">截止日期: ${item.deadline}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    detailsHTML += `</div>`;
    
    modalContent.innerHTML = detailsHTML;
    modal.classList.remove('hidden');
}

function closeMeetingModal() {
    document.getElementById('meeting-modal').classList.add('hidden');
}

// 初始化
window.addEventListener('DOMContentLoaded', initHistoryManager);