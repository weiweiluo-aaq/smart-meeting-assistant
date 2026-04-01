// 会议内容输入页面逻辑

class MeetingInput {
    constructor() {
        this.meetingId = this.getMeetingIdFromUrl();
        this.isRecording = false;
        this.recordTimeout = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharacterCounter();
    }

    // 从URL获取会议ID
    getMeetingIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('meeting') || params.get('id') || 'UNKNOWN-MEETING';
    }

    // 设置事件监听器
    setupEventListeners() {
        // 提交按钮
        document.getElementById('submit-btn').addEventListener('click', () => this.submitContent());
        
        // 语音录制按钮
        document.getElementById('voice-record-btn').addEventListener('click', () => this.toggleVoiceRecord());
        
        // 模态框关闭
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeSuccessModal());
    }

    // 设置字符计数器（所有文本框）
    setupCharacterCounter() {
        const textareas = ['last-week', 'this-week', 'blockers', 'risks', 'others'];
        
        textareas.forEach(id => {
            const textarea = document.getElementById(id);
            if (textarea) {
                textarea.addEventListener('input', () => {
                    textarea.value = textarea.value.slice(0, 300);
                });
            }
        });
    }

    // 切换语音录制
    toggleVoiceRecord() {
        const recordBtn = document.getElementById('voice-record-btn');
        const voiceStatus = document.getElementById('voice-status');
        const voiceProgress = document.getElementById('voice-progress');
        
        this.isRecording = !this.isRecording;
        
        if (this.isRecording) {
            recordBtn.classList.add('active');
            voiceStatus.textContent = '正在录音，再次点击停止...';
            voiceProgress.classList.remove('hidden');
            
            this.startRecordingProgress();
            
            // 模拟语音识别
            setTimeout(() => {
                if (this.isRecording) {
                    this.simulateVoiceRecognition();
                }
            }, 3000);
        } else {
            recordBtn.classList.remove('active');
            voiceStatus.textContent = '录音已停止，正在识别...';
            clearTimeout(this.recordTimeout);
            
            document.getElementById('voice-progress-bar').style.width = '0%';
        }
    }

    // 模拟录音进度
    startRecordingProgress() {
        let progress = 0;
        const progressBar = document.getElementById('voice-progress-bar');
        
        const updateProgress = () => {
            if (this.isRecording && progress < 100) {
                progress += Math.random() * 10;
                if (progress > 100) progress = 100;
                progressBar.style.width = `${progress}%`;
                
                this.recordTimeout = setTimeout(updateProgress, 200);
            }
        };
        
        updateProgress();
    }

    // 模拟语音识别 - 将内容填入第一个空字段
    simulateVoiceRecognition() {
        const voiceStatus = document.getElementById('voice-status');
        
        voiceStatus.textContent = '正在识别语音内容...';
        
        setTimeout(() => {
            const voiceResults = [
                '上周完成了API接口开发和数据库优化工作。',
                '本周重点是完成用户模块开发和进行系统测试。',
                '遇到了跨域问题需要前端同事协助解决。',
                '注意项目进度可能受第三方接口延迟影响。',
                ''
            ];
            
            const randomResult = voiceResults[Math.floor(Math.random() * voiceResults.length)];
            
            // 找到第一个空的字段填入
            const fields = ['last-week', 'this-week', 'blockers', 'risks', 'others'];
            for (const fieldId of fields) {
                const field = document.getElementById(fieldId);
                if (field && field.value.trim() === '') {
                    field.value = randomResult;
                    break;
                }
            }
            
            voiceStatus.textContent = '语音识别完成！';
            document.getElementById('voice-progress').classList.add('hidden');
            
            this.isRecording = false;
            document.getElementById('voice-record-btn').classList.remove('active');
        }, 2000);
    }

    // 提交内容
    async submitContent() {
        const participantName = document.getElementById('participant-name').value.trim();

        // 验证姓名必填
        if (!participantName) {
            this.showNotification('请输入您的姓名', 'warning');
            document.getElementById('participant-name').focus();
            return;
        }

        // 收集所有字段内容
        const contentData = {
            id: `CONTENT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            participant: participantName,
            lastWeek: document.getElementById('last-week').value.trim(),
            thisWeek: document.getElementById('this-week').value.trim(),
            blockers: document.getElementById('blockers').value.trim(),
            risks: document.getElementById('risks').value.trim(),
            others: document.getElementById('others').value.trim(),
            timestamp: new Date().toISOString(),
            meetingId: this.meetingId
        };

        // 检查是否至少填写了一项
        if (!contentData.lastWeek && !contentData.thisWeek && !contentData.blockers && !contentData.risks && !contentData.others) {
            this.showNotification('请至少填写一项汇报内容', 'warning');
            return;
        }

        // 显示提交中状态
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>提交中...';
        submitBtn.disabled = true;

        // 保存到localStorage（本地备份）
        this.saveContentToLocalStorage(contentData);

        // 同步到云端API
        try {
            const apiUrl = new URL('/api/meeting', window.location.origin);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId: this.meetingId,
                    participant: participantName,
                    lastWeek: contentData.lastWeek,
                    thisWeek: contentData.thisWeek,
                    blockers: contentData.blockers,
                    risks: contentData.risks,
                    others: contentData.others
                })
            });
            const result = await response.json();
            if (!result.success) {
                console.warn('云端同步失败，数据已保存在本地');
            }
        } catch (error) {
            console.warn('云端同步失败（网络问题），数据已保存在本地');
        }

        // 显示成功弹窗
        this.showSuccessModal();

        // 清空表单
        setTimeout(() => {
            document.getElementById('participant-name').value = participantName; // 保留姓名
            document.getElementById('last-week').value = '';
            document.getElementById('this-week').value = '';
            document.getElementById('blockers').value = '';
            document.getElementById('risks').value = '';
            document.getElementById('others').value = '';
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }, 1000);
    }

    // 保存到localStorage
    saveContentToLocalStorage(contentData) {
        const contentsKey = `meeting_${this.meetingId}_contents`;
        const existingContents = JSON.parse(localStorage.getItem(contentsKey) || '[]');
        existingContents.push(contentData);
        localStorage.setItem(contentsKey, JSON.stringify(existingContents));
        
        const participantsKey = `meeting_${this.meetingId}_participants`;
        const existingParticipants = JSON.parse(localStorage.getItem(participantsKey) || '[]');
        if (!existingParticipants.includes(contentData.participant)) {
            existingParticipants.push(contentData.participant);
            localStorage.setItem(participantsKey, JSON.stringify(existingParticipants));
        }
    }

    // 显示成功弹窗
    showSuccessModal() {
        document.getElementById('success-modal').classList.remove('hidden');
    }

    // 关闭成功弹窗
    closeSuccessModal() {
        document.getElementById('success-modal').classList.add('hidden');
    }

    // 显示通知
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
        
        notification.className = `${colorMap[type]} text-white px-4 py-3 rounded-lg shadow-lg fixed top-4 right-4 left-4 z-50 transform transition-all duration-300 translate-x-full`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="${iconMap[type]} mr-3"></i>
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
}

// 初始化应用
const meetingInput = new MeetingInput();
