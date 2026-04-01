// 首页逻辑

// 创建会议
function createMeeting() {
    const meetingId = generateMeetingId();
    // 跳转到会议空间
    window.location.href = `meeting.html?id=${meetingId}&mode=create`;
}

// 生成唯一会议ID
function generateMeetingId() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MEET-${dateStr}-${randomStr}`;
}

// 加入会议
function joinMeeting() {
    const meetingId = document.getElementById('join-meeting-id').value.trim();
    
    if (!meetingId) {
        showNotification('请输入会议编号', 'warning');
        return;
    }
    
    // 验证会议ID格式
    if (!meetingId.startsWith('MEET-')) {
        showNotification('会议编号格式不正确，应以 MEET- 开头', 'warning');
        return;
    }
    
    // 跳转到会议空间
    window.location.href = `meeting.html?id=${meetingId}&mode=join`;
}

// 显示加入会议弹窗
function showJoinModal() {
    document.getElementById('join-modal').classList.remove('hidden');
}

// 关闭加入会议弹窗
function closeJoinModal() {
    document.getElementById('join-modal').classList.add('hidden');
}

// 显示API设置弹窗
function showSettingsModal() {
    loadApiSettings();
    document.getElementById('settings-modal').classList.remove('hidden');
}

// 关闭API设置弹窗
function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

// 显示关于弹窗
function showAboutModal() {
    document.getElementById('about-modal').classList.remove('hidden');
}

// 关闭关于弹窗
function closeAboutModal() {
    document.getElementById('about-modal').classList.add('hidden');
}

// 加载API设置
function loadApiSettings() {
    const settings = JSON.parse(localStorage.getItem('apiSettings') || '{}');
    
    document.getElementById('api-provider').value = settings.provider || 'custom';
    document.getElementById('api-url').value = settings.url || '';
    document.getElementById('api-key').value = settings.key || '';
    document.getElementById('api-model').value = settings.model || '';
    
    updateApiFields();
}

// 更新API字段
function updateApiFields() {
    const provider = document.getElementById('api-provider').value;
    const urlInput = document.getElementById('api-url');
    const modelInput = document.getElementById('api-model');
    
    const presets = {
        'openai': {
            url: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini'
        },
        'claude': {
            url: 'https://api.anthropic.com/v1',
            model: 'claude-3-haiku-20240307'
        },
        'deepseek': {
            url: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat'
        },
        'siliconflow': {
            url: 'https://api.siliconflow.cn/v1',
            model: 'Qwen/Qwen2.5-72B-Instruct'
        },
        'custom': {
            url: '',
            model: ''
        }
    };
    
    if (presets[provider]) {
        if (!urlInput.value) {
            urlInput.placeholder = presets[provider].url || 'https://api.example.com/v1';
        }
        if (!modelInput.value) {
            modelInput.placeholder = presets[provider].model || '模型名称';
        }
    }
}

// 保存API设置
function saveApiSettings() {
    const settings = {
        provider: document.getElementById('api-provider').value,
        url: document.getElementById('api-url').value.trim(),
        key: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value.trim()
    };
    
    if (!settings.url) {
        showNotification('请输入API地址', 'warning');
        return;
    }
    
    if (!settings.key) {
        showNotification('请输入API Key', 'warning');
        return;
    }
    
    if (!settings.model) {
        showNotification('请输入模型名称', 'warning');
        return;
    }
    
    localStorage.setItem('apiSettings', JSON.stringify(settings));
    showNotification('API设置已保存！', 'success');
    closeSettingsModal();
}

// 测试API连接
async function testApiConnection() {
    const settings = {
        url: document.getElementById('api-url').value.trim(),
        key: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value.trim()
    };
    
    if (!settings.url || !settings.key || !settings.model) {
        showNotification('请先填写完整的API信息', 'warning');
        return;
    }
    
    const resultDiv = document.getElementById('api-test-result');
    resultDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-800', 'text-red-800');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在测试连接...';
    resultDiv.classList.add('bg-blue-100', 'text-blue-800');
    
    try {
        // 使用代理API测试（解决CORS问题）
        const response = await fetch('/api/ai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: `${settings.url}/chat/completions`,
                key: settings.key,
                model: settings.model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) {
                resultDiv.classList.remove('bg-blue-100', 'text-blue-800');
                resultDiv.classList.add('bg-green-100', 'text-green-800');
                resultDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i>连接成功！API配置正确。';
                showNotification('API连接测试成功！', 'success');
            } else {
                throw new Error('响应格式错误');
            }
        } else {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
    } catch (error) {
        resultDiv.classList.remove('bg-blue-100', 'text-blue-800');
        resultDiv.classList.add('bg-red-100', 'text-red-800');
        resultDiv.innerHTML = `<i class="fas fa-times-circle mr-2"></i>连接失败: ${error.message}`;
        showNotification('API连接测试失败', 'error');
    }
}

// 加载最近会议
function loadRecentMeetings() {
    const meetings = JSON.parse(localStorage.getItem('recentMeetings') || '[]');
    const listEl = document.getElementById('recent-meetings-list');
    const noRecentEl = document.getElementById('no-recent-meetings');
    
    if (meetings.length === 0) {
        listEl.classList.add('hidden');
        noRecentEl.classList.remove('hidden');
        return;
    }
    
    listEl.classList.remove('hidden');
    noRecentEl.classList.add('hidden');
    
    listEl.innerHTML = meetings.slice(0, 5).map(meeting => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" 
             onclick="window.location.href='meeting.html?id=${meeting.id}&mode=view'">
            <div>
                <p class="font-medium text-gray-800">${meeting.name || meeting.id}</p>
                <p class="text-sm text-gray-500">${new Date(meeting.date).toLocaleString('zh-CN')}</p>
            </div>
            <div class="text-right">
                <span class="text-xs px-2 py-1 rounded-full ${
                    meeting.status === 'active' ? 'bg-green-100 text-green-800' : 
                    meeting.status === 'completed' ? 'bg-gray-100 text-gray-800' : 
                    'bg-blue-100 text-blue-800'
                }">
                    ${meeting.status === 'active' ? '进行中' : meeting.status === 'completed' ? '已结束' : '新创建'}
                </span>
                <p class="text-xs text-gray-500 mt-1">${meeting.participantCount || 0}人参与</p>
            </div>
        </div>
    `).join('');
}

// 显示通知
function showNotification(message, type = 'info') {
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
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadRecentMeetings();
    
    // 点击弹窗外部关闭
    ['join-modal', 'settings-modal', 'about-modal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            if (e.target.id === id) {
                document.getElementById(id).classList.add('hidden');
            }
        });
    });
    
    // 回车键加入会议
    document.getElementById('join-meeting-id')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinMeeting();
        }
    });
});
