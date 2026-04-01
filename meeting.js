// 会议空间页面逻辑

class MeetingRoom {
    constructor() {
        this.meetingId = '';
        this.mode = '';
        this.phoneContents = [];
        this.hostContents = [];
        this.meetingInfo = null;
        this.autoRefreshInterval = null;
        this.currentMinutes = '';
        
        this.init();
    }
    
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.meetingId = urlParams.get('id') || this.generateMeetingId();
        this.mode = urlParams.get('mode') || 'create';
        
        this.saveToRecentMeetings();
        this.setupPage();
        this.generateQRCode();
        await this.loadData();
        this.startAutoRefresh();
        this.setupEventListeners();
    }
    
    generateMeetingId() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `MEET-${dateStr}-${randomStr}`;
    }
    
    setupPage() {
        document.getElementById('meeting-id-display').textContent = this.meetingId;
        document.getElementById('meeting-id-copy').textContent = this.meetingId;
        document.getElementById('info-meeting-id').textContent = this.meetingId;
        document.getElementById('info-created-time').textContent = new Date().toLocaleString('zh-CN');
    }
    
    generateQRCode() {
        const meetingUrl = `${window.location.origin}${window.location.pathname.replace('meeting.html', 'input.html')}?meeting=${this.meetingId}`;
        
        document.getElementById('meeting-url').textContent = meetingUrl;
        
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        qrcodeContainer.appendChild(canvas);
        
        try {
            QRCode.toCanvas(canvas, meetingUrl, {
                width: 180,
                color: { dark: '#2563eb', light: '#ffffff' }
            }, (error) => {
                if (error) {
                    console.error('QRCode生成失败:', error);
                    this.fallbackQRCode(meetingUrl);
                }
            });
        } catch (error) {
            console.error('QRCode.js不可用:', error);
            this.fallbackQRCode(meetingUrl);
        }
    }
    
    fallbackQRCode(meetingUrl) {
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(meetingUrl)}" 
                 alt="会议二维码" class="border-4 border-gray-200 rounded-lg p-2">
        `;
    }
    
    async loadData() {
        await this.refreshData();
    }
    
    async refreshData() {
        try {
            const apiUrl = new URL('/api/meeting', window.location.origin);
            apiUrl.searchParams.set('meetingId', this.meetingId);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.phoneContents = result.data.contents || [];
                    this.updateContentsList();
                    this.updateStats();
                }
            }
            
            this.hostContents = JSON.parse(localStorage.getItem(`host_${this.meetingId}`) || '[]');
            
        } catch (error) {
            console.error('刷新数据失败:', error);
        }
    }
    
    updateContentsList() {
        const container = document.getElementById('contents-list');
        
        const allContents = [
            ...this.phoneContents.map(c => ({ ...c, source: 'phone' })),
            ...this.hostContents.map(c => ({ ...c, source: 'host' }))
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        if (allContents.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>暂无内容提交</p>
                    <p class="text-sm">等待参会人员扫码输入...</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = allContents.map(item => {
            const time = new Date(item.timestamp).toLocaleTimeString('zh-CN');
            const isHost = item.source === 'host';
            
            // 处理新的多字段格式
            let contentHtml = '';
            if (item.lastWeek) {
                contentHtml += `<div class="mb-2"><span class="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">上周关键结果</span><p class="text-gray-700 text-sm mt-1">${item.lastWeek}</p></div>`;
            }
            if (item.thisWeek) {
                contentHtml += `<div class="mb-2"><span class="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">本周重点事项</span><p class="text-gray-700 text-sm mt-1">${item.thisWeek}</p></div>`;
            }
            if (item.blockers) {
                contentHtml += `<div class="mb-2"><span class="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">卡点 & 需要协调</span><p class="text-gray-700 text-sm mt-1">${item.blockers}</p></div>`;
            }
            if (item.risks) {
                contentHtml += `<div class="mb-2"><span class="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">风险 & 提醒</span><p class="text-gray-700 text-sm mt-1">${item.risks}</p></div>`;
            }
            if (item.others) {
                contentHtml += `<div class="mb-2"><span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">其他</span><p class="text-gray-700 text-sm mt-1">${item.others}</p></div>`;
            }
            if (item.content && !contentHtml) {
                // 兼容旧格式
                contentHtml = `<p class="text-gray-700 text-sm">${item.content}</p>`;
            }
            
            return `
                <div class="p-3 rounded-lg ${isHost ? 'bg-purple-50 border-l-4 border-purple-500' : 'bg-gray-50 border-l-4 border-blue-500'}">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-sm font-medium ${isHost ? 'text-purple-700' : 'text-blue-700'}">
                            ${isHost ? '主持人' : (item.participant || '匿名')}
                        </span>
                        <span class="text-xs text-gray-500">${time}</span>
                    </div>
                    ${contentHtml}
                </div>
            `;
        }).join('');
    }
    
    getTypeColor(type) {
        const colors = { 'resolution': 'blue', 'action': 'green', 'discussion': 'yellow', 'note': 'gray' };
        return colors[type] || 'gray';
    }
    
    getTypeLabel(type) {
        const labels = { 'resolution': '决议', 'action': '行动项', 'discussion': '讨论', 'note': '备注' };
        return labels[type] || '其他';
    }
    
    updateStats() {
        const participants = new Set(this.phoneContents.map(c => c.participant).filter(Boolean));
        document.getElementById('stat-participants').textContent = participants.size;
        document.getElementById('stat-phone').textContent = this.phoneContents.length;
        document.getElementById('stat-host').textContent = this.hostContents.length;
    }
    
    setupEventListeners() {
        document.getElementById('host-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addHostContent();
            }
        });
        
        ['meeting-info-modal', 'end-meeting-modal'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                if (e.target.id === id) {
                    document.getElementById(id).classList.add('hidden');
                }
            });
        });
    }
    
    addHostContent() {
        const input = document.getElementById('host-input');
        const text = input.value.trim();
        
        if (!text) {
            this.showNotification('请输入内容', 'warning');
            return;
        }
        
        let type = 'note';
        if (text.includes('决议：') || text.includes('决议:')) type = 'resolution';
        else if (text.includes('行动项：') || text.includes('行动项:') || text.includes('TODO：')) type = 'action';
        else if (text.includes('讨论：') || text.includes('讨论:')) type = 'discussion';
        
        const content = {
            id: `HOST-${Date.now()}`,
            content: text,
            participant: '主持人',
            timestamp: new Date().toISOString(),
            source: 'host',
            type: type
        };
        
        this.hostContents.push(content);
        localStorage.setItem(`host_${this.meetingId}`, JSON.stringify(this.hostContents));
        
        input.value = '';
        this.updateContentsList();
        this.updateStats();
        this.showNotification('已添加记录', 'success');
    }
    
    insertTemplate(text) {
        const input = document.getElementById('host-input');
        input.value += (input.value ? '\n' : '') + text;
        input.focus();
    }
    
    async analyzeMeeting() {
        const allContents = [...this.phoneContents, ...this.hostContents];
        
        if (allContents.length === 0) {
            this.showNotification('暂无内容可分析', 'warning');
            return;
        }
        
        const analyzeBtn = document.querySelector('button[onclick="analyzeMeeting()"]');
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>分析中...';
        analyzeBtn.disabled = true;
        
        try {
            const analysisResult = await window.advancedAIAnalyzer.analyzeMeetingContents(allContents);
            this.showAnalysisResult(analysisResult);
            this.showNotification('分析完成！', 'success');
        } catch (error) {
            console.error('分析失败:', error);
            this.showNotification('分析失败，请重试', 'error');
        } finally {
            analyzeBtn.innerHTML = originalText;
            analyzeBtn.disabled = false;
        }
    }
    
    showAnalysisResult(result) {
        const section = document.getElementById('analysis-section');
        const container = document.getElementById('analysis-content');
        
        const priorityStyles = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800'
        };
        
        container.innerHTML = `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">会议总结</h3>
                <p class="text-gray-700">${result.summary}</p>
            </div>
            
            ${Object.keys(result.topicClassification.distribution).length > 0 ? `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">主题分布</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        ${Object.entries(result.topicClassification.distribution).map(([topic, percent]) => `
                            <div class="bg-gray-50 rounded-lg p-3">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-sm font-medium text-gray-700">${topic}</span>
                                    <span class="text-sm text-gray-500">${percent}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${result.actionItems.length > 0 ? `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">行动项 (${result.actionItems.length})</h3>
                    <div class="space-y-2">
                        ${result.actionItems.map(item => `
                            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <span class="px-2 py-1 text-xs rounded ${priorityStyles[item.priority] || 'bg-gray-100 text-gray-800'}">
                                    ${item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                                </span>
                                <span class="text-gray-700">${item.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${result.discussionPoints.length > 0 ? `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">讨论要点</h3>
                    <ul class="space-y-2">
                        ${result.discussionPoints.map(point => `
                            <li class="flex items-start gap-2">
                                <i class="fas fa-circle text-blue-500 mt-1.5 text-xs"></i>
                                <span class="text-gray-700">${point}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        section.classList.remove('hidden');
        section.scrollIntoView({ behavior: 'smooth' });
    }
    
    closeAnalysis() {
        document.getElementById('analysis-section').classList.add('hidden');
    }
    
    async generateMinutes() {
        const allContents = [...this.phoneContents, ...this.hostContents];
        
        if (allContents.length === 0) {
            this.showNotification('暂无内容可生成纪要', 'warning');
            return;
        }
        
        const btn = document.querySelector('button[onclick="generateMinutes()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
        btn.disabled = true;
        
        try {
            const apiSettings = JSON.parse(localStorage.getItem('apiSettings') || '{}');
            
            if (apiSettings.url && apiSettings.key && apiSettings.model) {
                this.currentMinutes = await this.generateMinutesWithAI(allContents, apiSettings);
            } else {
                this.currentMinutes = this.generateMinutesTemplate(allContents);
            }
            
            this.showMinutes();
            this.showNotification('纪要已生成！', 'success');
        } catch (error) {
            console.error('生成纪要失败:', error);
            this.showNotification('生成纪要失败，将使用模板生成', 'warning');
            this.currentMinutes = this.generateMinutesTemplate(allContents);
            this.showMinutes();
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
    
    async generateMinutesWithAI(contents, settings) {
        const prompt = this.buildMinutesPrompt(contents);
        
        const response = await fetch(`${settings.url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.key}`
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: '你是一个专业的会议纪要助手，请根据提供的会议内容生成结构化的会议纪要。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        return result.choices[0].message.content;
    }
    
    buildMinutesPrompt(contents) {
        const participants = [...new Set(contents.map(c => c.participant).filter(Boolean))];
        const phoneContents = contents.filter(c => c.source !== 'host');
        
        let prompt = `请根据以下会议内容生成一份专业的会议纪要：

【会议信息】
- 会议编号：${this.meetingId}
- 会议时间：${new Date().toLocaleString('zh-CN')}
- 参会人数：${participants.length}人

【参会人员】
${participants.join('、') || '未记录'}

`;

        // 按人员整理内容
        phoneContents.forEach((c, i) => {
            prompt += `【${c.participant}的汇报】\n`;
            if (c.lastWeek) prompt += `- 上周关键结果：${c.lastWeek}\n`;
            if (c.thisWeek) prompt += `- 本周重点事项：${c.thisWeek}\n`;
            if (c.blockers) prompt += `- 卡点 & 需要协调：${c.blockers}\n`;
            if (c.risks) prompt += `- 风险 & 提醒：${c.risks}\n`;
            if (c.others) prompt += `- 其他：${c.others}\n`;
            prompt += '\n';
        });

        prompt += `请生成包含以下部分的会议纪要：
1. 会议概述
2. 上周关键结果汇总
3. 本周重点事项汇总
4. 卡点 & 需要协调事项
5. 风险 & 提醒
6. 行动项（包含负责人和截止时间）
7. 备注`;

        return prompt;
    }
    
    generateMinutesTemplate(contents) {
        const participants = [...new Set(contents.map(c => c.participant).filter(Boolean))];
        const phoneContents = contents.filter(c => c.source !== 'host');
        const hostContents = contents.filter(c => c.source === 'host');
        
        // 汇总各类内容
        const allLastWeeks = phoneContents.map(c => c.lastWeek).filter(Boolean);
        const allThisWeeks = phoneContents.map(c => c.thisWeek).filter(Boolean);
        const allBlockers = phoneContents.map(c => c.blockers).filter(Boolean);
        const allRisks = phoneContents.map(c => c.risks).filter(Boolean);
        const allOthers = phoneContents.map(c => c.others).filter(Boolean);
        
        let minutes = `# 会议纪要

## 会议信息
- **会议编号**: ${this.meetingId}
- **会议时间**: ${new Date().toLocaleString('zh-CN')}
- **参会人数**: ${participants.length}人

## 参会人员
${participants.length > 0 ? participants.map(p => `- ${p}`).join('\n') : '- 未记录'}

`;

        // 上周关键结果
        if (allLastWeeks.length > 0) {
            minutes += `## 上周关键结果
`;
            phoneContents.filter(c => c.lastWeek).forEach(c => {
                minutes += `- **${c.participant}**: ${c.lastWeek}\n`;
            });
            minutes += '\n';
        }
        
        // 本周重点事项
        if (allThisWeeks.length > 0) {
            minutes += `## 本周重点事项
`;
            phoneContents.filter(c => c.thisWeek).forEach(c => {
                minutes += `- **${c.participant}**: ${c.thisWeek}\n`;
            });
            minutes += '\n';
        }
        
        // 卡点 & 需要协调
        if (allBlockers.length > 0) {
            minutes += `## 卡点 & 需要协调
`;
            phoneContents.filter(c => c.blockers).forEach(c => {
                minutes += `- **${c.participant}**: ${c.blockers}\n`;
            });
            minutes += '\n';
        }
        
        // 风险 & 提醒
        if (allRisks.length > 0) {
            minutes += `## 风险 & 提醒
`;
            phoneContents.filter(c => c.risks).forEach(c => {
                minutes += `- **${c.participant}**: ${c.risks}\n`;
            });
            minutes += '\n';
        }
        
        // 其他
        if (allOthers.length > 0) {
            minutes += `## 其他事项
`;
            phoneContents.filter(c => c.others).forEach(c => {
                minutes += `- **${c.participant}**: ${c.others}\n`;
            });
            minutes += '\n';
        }
        
        // 主持人记录
        if (hostContents.length > 0) {
            minutes += `## 主持人记录
`;
            hostContents.forEach((h, i) => {
                minutes += `${i + 1}. ${h.content}\n`;
            });
            minutes += '\n';
        }
        
        minutes += `## 统计信息
- 参会人员提交: ${phoneContents.length} 条
- 主持人记录: ${hostContents.length} 条

---
*本纪要由智能会议助手自动生成*
`;
        
        return minutes;
    }
    
    showMinutes() {
        const section = document.getElementById('minutes-section');
        const container = document.getElementById('minutes-content');
        
        const html = this.markdownToHtml(this.currentMinutes);
        container.innerHTML = `<div class="prose max-w-none">${html}</div>`;
        
        section.classList.remove('hidden');
        section.scrollIntoView({ behavior: 'smooth' });
    }
    
    markdownToHtml(md) {
        return md
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 border-b pb-2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
            .replace(/\n\n/g, '</p><p class="mb-2">')
            .replace(/\n/g, '<br>');
    }
    
    closeMinutes() {
        document.getElementById('minutes-section').classList.add('hidden');
    }
    
    copyMinutes() {
        if (!this.currentMinutes) {
            this.showNotification('请先生成会议纪要', 'warning');
            return;
        }
        
        navigator.clipboard.writeText(this.currentMinutes).then(() => {
            this.showNotification('已复制到剪贴板！', 'success');
        }).catch(() => {
            this.showNotification('复制失败，请手动复制', 'error');
        });
    }
    
    downloadMinutes() {
        if (!this.currentMinutes) {
            this.showNotification('请先生成会议纪要', 'warning');
            return;
        }
        
        const blob = new Blob([this.currentMinutes], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `会议纪要_${this.meetingId}_${new Date().toISOString().slice(0,10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('纪要已下载！', 'success');
    }
    
    exportMinutes() {
        this.generateMinutes();
    }
    
    endMeeting() {
        document.getElementById('end-meeting-modal').classList.remove('hidden');
    }
    
    closeEndMeeting() {
        document.getElementById('end-meeting-modal').classList.add('hidden');
    }
    
    confirmEndMeeting() {
        const meeting = {
            id: this.meetingId,
            name: `会议 ${this.meetingId}`,
            date: new Date().toISOString(),
            status: 'completed',
            participantCount: new Set(this.phoneContents.map(c => c.participant).filter(Boolean)).size,
            contents: [...this.phoneContents, ...this.hostContents]
        };
        
        const history = JSON.parse(localStorage.getItem('recentMeetings') || '[]');
        const existingIndex = history.findIndex(m => m.id === this.meetingId);
        if (existingIndex >= 0) {
            history[existingIndex] = { ...history[existingIndex], ...meeting };
        } else {
            history.unshift(meeting);
        }
        localStorage.setItem('recentMeetings', JSON.stringify(history.slice(0, 20)));
        
        document.getElementById('info-status').textContent = '已结束';
        document.getElementById('info-status').className = 'px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800';
        
        this.closeEndMeeting();
        this.showNotification('会议已结束，纪要已保存', 'success');
        this.stopAutoRefresh();
    }
    
    showMeetingInfo() {
        document.getElementById('info-meeting-id').textContent = this.meetingId;
        document.getElementById('info-created-time').textContent = new Date().toLocaleString('zh-CN');
        document.getElementById('meeting-info-modal').classList.remove('hidden');
    }
    
    closeMeetingInfo() {
        document.getElementById('meeting-info-modal').classList.add('hidden');
    }
    
    saveToRecentMeetings() {
        const meeting = {
            id: this.meetingId,
            name: `会议 ${this.meetingId}`,
            date: new Date().toISOString(),
            status: 'active',
            participantCount: 0
        };
        
        const history = JSON.parse(localStorage.getItem('recentMeetings') || '[]');
        const existingIndex = history.findIndex(m => m.id === this.meetingId);
        if (existingIndex >= 0) {
            history[existingIndex] = { ...history[existingIndex], ...meeting };
        } else {
            history.unshift(meeting);
        }
        localStorage.setItem('recentMeetings', JSON.stringify(history.slice(0, 20)));
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        this.autoRefreshInterval = setInterval(() => {
            this.refreshData();
        }, 5000);
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    showNotification(message, type = 'info') {
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
        
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.meetingRoom = new MeetingRoom();
});

window.refreshData = () => window.meetingRoom?.refreshData();
window.addHostContent = () => window.meetingRoom?.addHostContent();
window.insertTemplate = (text) => window.meetingRoom?.insertTemplate(text);
window.analyzeMeeting = () => window.meetingRoom?.analyzeMeeting();
window.generateMinutes = () => window.meetingRoom?.generateMinutes();
window.exportMinutes = () => window.meetingRoom?.exportMinutes();
window.endMeeting = () => window.meetingRoom?.endMeeting();
window.showMeetingInfo = () => window.meetingRoom?.showMeetingInfo();
window.closeMeetingInfo = () => window.meetingRoom?.closeMeetingInfo();
window.closeEndMeeting = () => window.meetingRoom?.closeEndMeeting();
window.confirmEndMeeting = () => window.meetingRoom?.confirmEndMeeting();
window.closeAnalysis = () => window.meetingRoom?.closeAnalysis();
window.closeMinutes = () => window.meetingRoom?.closeMinutes();
window.copyMinutes = () => window.meetingRoom?.copyMinutes();
window.downloadMinutes = () => window.meetingRoom?.downloadMinutes();
