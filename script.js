// 智能会议助手主逻辑

class MeetingAssistant {
    constructor() {
        this.meetingId = this.generateMeetingId();
        this.participants = new Set();
        this.contents = [];
        this.meetingsHistory = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
        this.todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
        
        // init() 现在是异步的，不在构造函数里调用，而是在外部调用
    }

    async init() {
        this.setupEventListeners();
        this.generateQRCode();
        await this.updateStats();
        this.loadHistory();

        // 启动定时自动刷新（每5秒刷新一次）
        this.startAutoRefresh();
    }

    // 生成唯一会议ID
    generateMeetingId() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `MEET-${dateStr}-${randomStr}`;
    }

    // 生成二维码
    generateQRCode() {
        const meetingId = this.meetingId;
        const meetingUrl = `${window.location.origin}${window.location.pathname}input.html?meeting=${meetingId}`;
        
        // 更新会议URL显示
        document.getElementById('meeting-url').textContent = meetingUrl;
        document.getElementById('meeting-id').textContent = meetingId;
        
        // 清空二维码容器
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = '';

        // 创建canvas元素
        const canvas = document.createElement('canvas');
        qrcodeContainer.appendChild(canvas);

        // 尝试使用QRCode.js生成二维码
        try {
            QRCode.toCanvas(canvas, meetingUrl, {
                width: 200,
                color: {
                    dark: '#165DFF',
                    light: '#ffffff'
                }
            }, (error) => {
                if (error) {
                    console.error('QRCode.js生成失败:', error);
                    this.fallbackQRCode(meetingUrl);
                }
            });
        } catch (error) {
            console.error('QRCode.js不可用:', error);
            this.fallbackQRCode(meetingUrl);
        }
    }
    
    // 备用二维码生成方案
    fallbackQRCode(meetingUrl) {
        const qrcodeContainer = document.getElementById('qrcode');
        
        // 方法1：使用img标签显示二维码（使用在线API）
        try {
            qrcodeContainer.innerHTML = `
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(meetingUrl)}" 
                     alt="会议二维码" 
                     class="border-4 border-gray-200 rounded-lg p-2">
            `;
        } catch (error) {
            console.error('在线API生成失败:', error);
            
            // 方法2：显示文本链接
            qrcodeContainer.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-sm text-gray-600 mb-2">二维码无法显示，请手动访问：</p>
                    <div class="bg-gray-100 p-2 rounded-lg break-all text-xs">
                        ${meetingUrl}
                    </div>
                    <p class="text-sm text-gray-600 mt-2">或使用会议编号：${this.meetingId}</p>
                </div>
            `;
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 刷新二维码
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.meetingId = this.generateMeetingId();
            this.generateQRCode();
            this.showNotification('二维码已刷新', 'success');
        });

        // 开始会议
        document.getElementById('start-meeting-btn').addEventListener('click', async () => {
            await this.startMeeting();
        });

        // 分析会议内容
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeMeeting();
        });

        // 查看历史会议（直接通过a标签跳转）
        // document.getElementById('history-btn').addEventListener('click', () => {
        //     this.showHistory();
        // });

        // 待办事项回顾（直接通过a标签跳转）
        // document.getElementById('todos-btn').addEventListener('click', () => {
        //     this.showTodos();
        // });

        // 刷新数据按钮
        document.getElementById('refresh-data-btn').addEventListener('click', async () => {
            await this.refreshDataFromAPI();
        });

        // 实时监听数据变化
        this.setupRealtimeListener();
    }

    // 实时数据监听
    setupRealtimeListener() {
        // 先清除已存在的定时器
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // 每5秒从云端API刷新统计数据
        this.autoRefreshInterval = setInterval(async () => {
            await this.updateStats();
        }, 5000);
    }

    // 停止自动刷新
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('自动刷新已停止');
        }
    }

    // 启动定时自动刷新
    startAutoRefresh() {
        this.setupRealtimeListener();
        console.log('自动刷新已启动，每5秒更新一次');
    }

    // 更新统计信息
    async updateStats() {
        // 从 API 刷新数据
        await this.refreshDataFromAPI(true); // true = 静默刷新，不弹通知

        // 从 localStorage 读取最新数据
        const storedContents = JSON.parse(localStorage.getItem(`meeting_${this.meetingId}_contents`) || '[]');
        const storedParticipants = JSON.parse(localStorage.getItem(`meeting_${this.meetingId}_participants`) || '[]');

        document.getElementById('participant-count').textContent = storedParticipants.length;
        document.getElementById('content-count').textContent = storedContents.length;
    }

    // 从 API 刷新数据（silent=true时不弹通知）
    async refreshDataFromAPI(silent = false) {
        try {
            const refreshBtn = document.getElementById('refresh-data-btn');
            if (!silent) {
                refreshBtn.innerHTML = '<span class="loading-spinner mr-2"></span>刷新中...';
                refreshBtn.disabled = true;
            }

            // 使用绝对路径访问API
            const apiUrl = new URL('/api/meeting', window.location.origin);
            apiUrl.searchParams.set('meetingId', this.meetingId);
            
            // 添加超时处理（10秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId); // 清除超时定时器
            
            const result = await response.json();

            if (result.success && result.data) {
                // 保存到本地存储（同步到本地）
                if (result.data.contents && result.data.contents.length > 0) {
                    localStorage.setItem(`meeting_${this.meetingId}_contents`, JSON.stringify(result.data.contents));
                }
                if (result.data.participants && result.data.participants.length > 0) {
                    localStorage.setItem(`meeting_${this.meetingId}_participants`, JSON.stringify(result.data.participants));
                }

                // 直接更新统计显示
                document.getElementById('participant-count').textContent = result.data.participants?.length || 0;
                document.getElementById('content-count').textContent = result.data.contents?.length || 0;

                if (!silent) {
                    this.showNotification(`刷新成功！${result.data.participants?.length || 0} 人提交了 ${result.data.contents?.length || 0} 条内容`, 'success');
                }
            } else {
                if (!silent) throw new Error(result.error || '刷新失败');
            }
        } catch (error) {
            console.error('刷新数据失败:', error);
            if (!silent) {
                if (error.name === 'AbortError') {
                    this.showNotification('请求超时，请检查网络连接或稍后再试', 'error');
                } else {
                    this.showNotification('刷新失败，请检查网络或 API 配置', 'error');
                }
            }
        } finally {
            const refreshBtn = document.getElementById('refresh-data-btn');
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>刷新数据';
            refreshBtn.disabled = false;
        }
    }

    // 开始会议
    async startMeeting() {
        // 清除当前会议数据
        localStorage.removeItem(`meeting_${this.meetingId}_contents`);
        localStorage.removeItem(`meeting_${this.meetingId}_participants`);
        
        await this.updateStats();
        this.showNotification('会议已开始，请大家扫码输入内容', 'success');
        
        // 生成新的二维码
        this.generateQRCode();
    }

    // 分析会议内容
    async analyzeMeeting() {
        const contents = JSON.parse(localStorage.getItem(`meeting_${this.meetingId}_contents`) || '[]');
        
        if (contents.length === 0) {
            this.showNotification('还没有会议内容，请先让大家输入', 'warning');
            return;
        }

        // 显示加载状态
        const analyzeBtn = document.getElementById('analyze-btn');
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '<span class="loading-spinner mr-2"></span>分析中...';
        analyzeBtn.disabled = true;

        try {
            // 使用高级AI分析
            const analysisResult = await window.advancedAIAnalyzer.analyzeMeetingContents(contents);
            
            // 保存会议记录
            const meetingRecord = {
                id: this.meetingId,
                date: new Date().toISOString(),
                contents: contents,
                analysis: analysisResult,
                participants: JSON.parse(localStorage.getItem(`meeting_${this.meetingId}_participants`) || '[]')
            };
            
            this.meetingsHistory.unshift(meetingRecord);
            localStorage.setItem('meetingsHistory', JSON.stringify(this.meetingsHistory));
            
            // 更新待办事项
            this.updateTodos(analysisResult.actionItems);
            
            // 显示结果
            this.showAdvancedAnalysisResult(analysisResult);
            
            this.showNotification('会议分析完成！', 'success');
        } catch (error) {
            console.error('分析失败:', error);
            // 回退到简单分析
            try {
                const simpleResult = await this.simulateAIanalysis(contents);
                this.showAnalysisResult(simpleResult);
                this.showNotification('使用备用分析引擎完成分析', 'success');
            } catch (fallbackError) {
                console.error('备用分析也失败:', fallbackError);
                this.showNotification('分析失败，请重试', 'error');
            }
        } finally {
            analyzeBtn.innerHTML = originalText;
            analyzeBtn.disabled = false;
        }
    }

    // 模拟AI分析
    async simulateAIanalysis(contents) {
        return new Promise(resolve => {
            setTimeout(() => {
                // 分类内容
                const importantMatters = contents.filter(item => 
                    item.content.includes('重要') || item.content.includes('紧急') || item.content.includes('关键')
                );
                
                const helpNeeded = contents.filter(item => 
                    item.content.includes('协助') || item.content.includes('帮助') || item.content.includes('支持') || item.content.includes('需要')
                );
                
                const updates = contents.filter(item => 
                    item.content.includes('更新') || item.content.includes('进展') || item.content.includes('完成')
                );

                // 生成讨论点
                const discussionPoints = [
                    ...importantMatters.map(item => `• ${item.content.substring(0, 50)}...`),
                    ...helpNeeded.map(item => `• 需要协助：${item.content.substring(0, 50)}...`),
                    ...updates.map(item => `• 进展更新：${item.content.substring(0, 50)}...`)
                ];

                // 生成行动项
                const actionItems = helpNeeded.map((item, index) => ({
                    id: `ACTION-${Date.now()}-${index}`,
                    description: item.content,
                    assignee: item.participant || '未指定',
                    status: 'pending',
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                }));

                resolve({
                    summary: `本次会议共有${contents.length}条输入，${importantMatters.length}项重要事项，${helpNeeded.length}项需要协助，${updates.length}项进展更新。`,
                    discussionPoints: discussionPoints.slice(0, 10), // 最多显示10个
                    actionItems: actionItems,
                    participants: contents.map(item => item.participant).filter(Boolean)
                });
            }, 2000);
        });
    }

    // 更新待办事项
    updateTodos(newTodos) {
        this.todos = [...this.todos, ...newTodos];
        localStorage.setItem('meetingTodos', JSON.stringify(this.todos));
    }

    // 显示高级分析结果
    showAdvancedAnalysisResult(result) {
        const resultsSection = document.getElementById('meeting-results');
        const resultContainer = document.getElementById('analysis-result');
        
        // 优先级样式映射
        const priorityStyles = {
            high: 'bg-red-100 border-red-500 text-red-800',
            medium: 'bg-yellow-100 border-yellow-500 text-yellow-800',
            low: 'bg-green-100 border-green-500 text-green-800'
        };
        
        // 情感分析HTML
        const sentimentHTML = `
            <div class="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">情感分析</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">整体氛围</p>
                        <p class="text-lg font-semibold ${result.sentimentAnalysis.overall === 'positive' ? 'text-green-600' : result.sentimentAnalysis.overall === 'negative' ? 'text-red-600' : 'text-gray-600'}">
                            ${result.sentimentAnalysis.overall === 'positive' ? '积极' : result.sentimentAnalysis.overall === 'negative' ? '消极' : '中性'}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">情感分布</p>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                积极: ${result.sentimentAnalysis.positivePercentage}%
                            </span>
                            <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                消极: ${result.sentimentAnalysis.negativePercentage}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 主题分类HTML
        const topicsHTML = `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">主题分类</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${Object.entries(result.topicClassification.distribution).map(([category, percentage]) => `
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-sm font-medium text-gray-800">${category}</span>
                                <span class="text-sm text-gray-600">${percentage}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 行动项HTML
        const actionItemsHTML = `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">行动项 (${result.actionItems.length}项)</h3>
                <div class="space-y-3">
                    ${result.actionItems.map(item => `
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[item.priority]}">
                                    ${item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级'}
                                </span>
                                <span class="text-xs text-gray-500">${item.type === 'assistance' ? '需要协助' : item.type === 'task' ? '任务' : item.type === 'suggestion' ? '建议' : '其他'}</span>
                            </div>
                            <p class="text-gray-800 mb-2">${item.description}</p>
                            <div class="flex flex-wrap gap-2 text-sm text-gray-600">
                                <span>负责人: ${item.participant}</span>
                                ${item.deadline ? `<span>截止日期: ${item.deadline}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 会议洞察HTML
        const insightsHTML = result.meetingInsights.length > 0 ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">会议洞察</h3>
                <div class="bg-purple-50 rounded-lg p-4">
                    <ul class="space-y-2">
                        ${result.meetingInsights.map(insight => `
                            <li class="flex items-start">
                                <i class="fas fa-lightbulb text-purple-500 mt-1 mr-2"></i>
                                <span class="text-gray-700">${insight}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        ` : '';
        
        // 建议HTML
        const recommendationsHTML = result.recommendations.length > 0 ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">建议</h3>
                <div class="bg-green-50 rounded-lg p-4">
                    <ul class="space-y-2">
                        ${result.recommendations.map(rec => `
                            <li class="flex items-start">
                                <i class="fas fa-check-circle text-green-500 mt-1 mr-2"></i>
                                <span class="text-gray-700">${rec}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        ` : '';
        
        // 依赖关系HTML
        const dependenciesHTML = result.dependencyAnalysis.dependencies.length > 0 ? `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">依赖关系</h3>
                <div class="bg-yellow-50 rounded-lg p-4">
                    <ul class="space-y-2">
                        ${result.dependencyAnalysis.dependencies.map((dep, index) => `
                            <li class="flex items-start">
                                <i class="fas fa-link text-yellow-600 mt-1 mr-2"></i>
                                <span class="text-gray-700">${dep.dependency}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        ` : '';
        
        resultContainer.innerHTML = `
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">会议总结</h3>
                <p class="text-gray-700 leading-relaxed">${result.summary}</p>
            </div>
            
            ${sentimentHTML}
            ${topicsHTML}
            
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">讨论重点</h3>
                <ul class="space-y-2">
                    ${result.discussionPoints.map((point, index) => `
                        <li class="flex items-start">
                            <i class="fas fa-circle text-blue-500 mt-1 mr-2 text-xs"></i>
                            <span class="text-gray-700">${point}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            ${actionItemsHTML}
            ${insightsHTML}
            ${recommendationsHTML}
            ${dependenciesHTML}
            
            <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">参与人员</h3>
                <div class="flex flex-wrap gap-2">
                    ${result.topicClassification.categories ? [...new Set(result.topicClassification.categories.map(c => c.content.participant))].map((participant, index) => `
                        <span class="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                            ${participant || '匿名参与者'}
                        </span>
                    `).join('') : ''}
                </div>
            </div>
        `;
        
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 显示历史会议
    showHistory() {
        if (this.meetingsHistory.length === 0) {
            this.showNotification('还没有历史会议记录', 'info');
            return;
        }

        // 创建历史会议弹窗
        const historyHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-2xl font-bold text-gray-800">历史会议记录</h3>
                        <button onclick="this.closest('.fixed').remove()" class="absolute top-6 right-6 text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6 space-y-4">
                        ${this.meetingsHistory.map((meeting, index) => `
                            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 class="font-semibold text-gray-800">会议 ${meeting.id}</h4>
                                        <p class="text-sm text-gray-600">${new Date(meeting.date).toLocaleString('zh-CN')}</p>
                                    </div>
                                    <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                        ${meeting.contents.length} 条内容
                                    </span>
                                </div>
                                <p class="text-sm text-gray-700 mb-3">${meeting.participants.length} 位参与者</p>
                                <button onclick="viewMeetingDetails('${meeting.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    查看详情 <i class="fas fa-chevron-right text-xs ml-1"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', historyHTML);
    }

    // 显示待办事项
    showTodos() {
        if (this.todos.length === 0) {
            this.showNotification('还没有待办事项', 'info');
            return;
        }

        // 创建待办事项弹窗
        const pendingTodos = this.todos.filter(todo => todo.status === 'pending');
        const completedTodos = this.todos.filter(todo => todo.status === 'completed');
        
        const todosHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-2xl font-bold text-gray-800">待办事项</h3>
                        <button onclick="this.closest('.fixed').remove()" class="absolute top-6 right-6 text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6">
                        <div class="mb-6">
                            <h4 class="text-xl font-semibold text-gray-800 mb-3">待完成 (${pendingTodos.length})</h4>
                            <div class="space-y-3">
                                ${pendingTodos.map(todo => `
                                    <div class="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p class="text-gray-800">${todo.description}</p>
                                            <p class="text-sm text-gray-600 mt-1">负责人: ${todo.assignee} | 截止: ${todo.deadline}</p>
                                        </div>
                                        <button onclick="markTodoCompleted('${todo.id}')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                                            已完成
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        ${completedTodos.length > 0 ? `
                            <div>
                                <h4 class="text-xl font-semibold text-gray-800 mb-3">已完成 (${completedTodos.length})</h4>
                                <div class="space-y-3">
                                    ${completedTodos.map(todo => `
                                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between opacity-70">
                                            <div>
                                                <p class="text-gray-800 line-through">${todo.description}</p>
                                                <p class="text-sm text-gray-600 mt-1">负责人: ${todo.assignee} | 完成于: ${todo.completedDate || '未知'}</p>
                                            </div>
                                            <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                                已完成
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', todosHTML);
    }

    // 加载历史数据
    loadHistory() {
        // 可以在这里添加更多历史数据加载逻辑
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
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
        
        notification.className = `fixed top-4 right-4 ${colorMap[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="${iconMap[type]} mr-3 text-xl"></i>
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
}

// 全局函数
function viewMeetingDetails(meetingId) {
    const meetings = JSON.parse(localStorage.getItem('meetingsHistory') || '[]');
    const meeting = meetings.find(m => m.id === meetingId);
    
    if (!meeting) return;
    
    const detailsHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-2xl font-bold text-gray-800">会议详情 - ${meeting.id}</h3>
                    <button onclick="this.closest('.fixed').remove()" class="absolute top-6 right-6 text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 space-y-6">
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 mb-2">会议信息</h4>
                        <p class="text-gray-700"><strong>时间:</strong> ${new Date(meeting.date).toLocaleString('zh-CN')}</p>
                        <p class="text-gray-700"><strong>参与者:</strong> ${meeting.participants.length} 人</p>
                        <p class="text-gray-700"><strong>内容数量:</strong> ${meeting.contents.length} 条</p>
                    </div>
                    
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 mb-2">会议内容</h4>
                        <div class="space-y-3">
                            ${meeting.contents.map((content, index) => `
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-sm font-medium text-gray-800">${content.participant || '匿名参与者'}</span>
                                        <span class="text-xs text-gray-500">${new Date(content.timestamp).toLocaleTimeString('zh-CN')}</span>
                                    </div>
                                    <p class="text-gray-700">${content.content}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${meeting.analysis ? `
                        <div>
                            <h4 class="text-lg font-semibold text-gray-800 mb-2">AI分析结果</h4>
                            <p class="text-gray-700 mb-3">${meeting.analysis.summary}</p>
                            
                            ${meeting.analysis.discussionPoints.length > 0 ? `
                                <div class="mb-4">
                                    <h5 class="font-medium text-gray-800 mb-2">讨论重点</h5>
                                    <ul class="list-disc list-inside space-y-1 text-gray-700">
                                        ${meeting.analysis.discussionPoints.map(point => `
                                            <li>${point.replace('• ', '')}</li>
                                        `).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            
                            ${meeting.analysis.actionItems.length > 0 ? `
                                <div>
                                    <h5 class="font-medium text-gray-800 mb-2">行动项</h5>
                                    <div class="space-y-2">
                                        ${meeting.analysis.actionItems.map(item => `
                                            <div class="bg-blue-50 rounded p-3">
                                                <p class="text-gray-800">${item.description}</p>
                                                <p class="text-sm text-gray-600">负责人: ${item.assignee} | 截止: ${item.deadline}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailsHTML);
}

function markTodoCompleted(todoId) {
    const todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
    const todoIndex = todos.findIndex(todo => todo.id === todoId);
    
    if (todoIndex !== -1) {
        todos[todoIndex].status = 'completed';
        todos[todoIndex].completedDate = new Date().toISOString().slice(0, 10);
        localStorage.setItem('meetingTodos', JSON.stringify(todos));
        
        // 刷新界面
        document.querySelector('.fixed').remove();
        assistant.showTodos();
        assistant.showNotification('待办事项已标记为完成', 'success');
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', async () => {
    const assistant = new MeetingAssistant();
    await assistant.init();
});