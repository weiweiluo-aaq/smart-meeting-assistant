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
        this.displayMeetingId();
        this.setupCharacterCounter();
    }

    // 从URL获取会议ID
    getMeetingIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('meeting') || 'UNKNOWN-MEETING';
    }

    // 显示会议ID
    displayMeetingId() {
        document.getElementById('meeting-id-display').textContent = this.meetingId;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 提交按钮
        document.getElementById('submit-btn').addEventListener('click', () => this.submitContent());
        
        // 语音录制按钮
        document.getElementById('voice-record-btn').addEventListener('click', () => this.toggleVoiceRecord());
        
        // 模板按钮
        document.getElementById('add-important').addEventListener('click', () => this.addTag('重要事项：'));
        document.getElementById('add-help').addEventListener('click', () => this.addTag('需要协助：'));
        
        // 模态框关闭
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeSuccessModal());
        
        // 回车键提交
        document.getElementById('meeting-content').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitContent();
            }
        });
    }

    // 设置字符计数器
    setupCharacterCounter() {
        const contentInput = document.getElementById('meeting-content');
        const charCount = document.getElementById('char-count');
        
        contentInput.addEventListener('input', () => {
            const length = contentInput.value.length;
            charCount.textContent = `${length}/500`;
            
            if (length > 450) {
                charCount.classList.add('text-yellow-600');
                charCount.classList.remove('text-gray-500');
            } else if (length >= 500) {
                charCount.classList.add('text-red-600');
                charCount.classList.remove('text-yellow-600');
                contentInput.value = contentInput.value.substring(0, 500);
            } else {
                charCount.classList.remove('text-yellow-600', 'text-red-600');
                charCount.classList.add('text-gray-500');
            }
        });
    }

    // 添加标签
    addTag(tag) {
        const contentInput = document.getElementById('meeting-content');
        const cursorPosition = contentInput.selectionStart;
        const currentValue = contentInput.value;
        
        // 在光标位置插入标签
        const newValue = currentValue.substring(0, cursorPosition) + tag + currentValue.substring(cursorPosition);
        contentInput.value = newValue;
        
        // 将光标移动到标签后面
        contentInput.selectionStart = contentInput.selectionEnd = cursorPosition + tag.length;
        contentInput.focus();
        
        // 更新字符计数
        const charCount = document.getElementById('char-count');
        charCount.textContent = `${newValue.length}/500`;
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
            
            // 模拟录音进度
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
            
            // 重置进度条
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

    // 模拟语音识别
    simulateVoiceRecognition() {
        const voiceStatus = document.getElementById('voice-status');
        const contentInput = document.getElementById('meeting-content');
        
        voiceStatus.textContent = '正在识别语音内容...';
        
        // 模拟语音识别结果
        setTimeout(() => {
            const voiceResults = [
                '我这边的项目进展顺利，已经完成了百分之八十的任务，预计下周可以完成全部开发工作。',
                '需要协助解决数据库性能问题，查询速度比较慢，希望得到技术支持。',
                '重要事项：下周三有客户来访，需要提前准备演示材料和会议室安排。',
                '本周工作重点是完成API接口开发，目前遇到一些跨域问题需要解决。',
                '建议讨论一下项目进度调整的可能性，因为某些外部资源延迟了。'
            ];
            
            const randomResult = voiceResults[Math.floor(Math.random() * voiceResults.length)];
            
            // 如果内容框为空，直接填入结果，否则追加
            if (contentInput.value.trim() === '') {
                contentInput.value = randomResult;
            } else {
                contentInput.value += `\n${randomResult}`;
            }
            
            // 更新字符计数
            const charCount = document.getElementById('char-count');
            charCount.textContent = `${contentInput.value.length}/500`;
            
            voiceStatus.textContent = '语音识别完成！可以继续编辑或直接提交。';
            document.getElementById('voice-progress').classList.add('hidden');
            
            // 停止录制状态
            this.isRecording = false;
            document.getElementById('voice-record-btn').classList.remove('active');
        }, 2000);
    }

    // 提交内容
    submitContent() {
        const participantName = document.getElementById('participant-name').value.trim();
        const meetingContent = document.getElementById('meeting-content').value.trim();

        // 验证
        if (!participantName) {
            this.showNotification('请输入您的姓名', 'warning');
            document.getElementById('participant-name').focus();
            return;
        }

        if (!meetingContent) {
            this.showNotification('请输入会议内容', 'warning');
            document.getElementById('meeting-content').focus();
            return;
        }

        if (meetingContent.length > 500) {
            this.showNotification('内容不能超过500个字符', 'error');
            return;
        }

        // 准备数据
        const contentData = {
            id: `CONTENT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            participant: participantName,
            content: meetingContent,
            timestamp: new Date().toISOString(),
            meetingId: this.meetingId
        };

        // 保存到localStorage
        this.saveContentToLocalStorage(contentData);

        // 显示成功弹窗
        this.showSuccessModal();

        // 清空表单
        setTimeout(() => {
            document.getElementById('meeting-content').value = '';
            document.getElementById('char-count').textContent = '0/500';
        }, 1000);
    }

    // 保存到localStorage
    saveContentToLocalStorage(contentData) {
        // 保存内容
        const contentsKey = `meeting_${this.meetingId}_contents`;
        const existingContents = JSON.parse(localStorage.getItem(contentsKey) || '[]');
        existingContents.push(contentData);
        localStorage.setItem(contentsKey, JSON.stringify(existingContents));
        
        // 保存参与者
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
}

// 全局函数：插入模板
function insertTemplate(template) {
    const contentInput = document.getElementById('meeting-content');
    contentInput.value = template;
    contentInput.focus();
    
    // 更新字符计数
    const charCount = document.getElementById('char-count');
    charCount.textContent = `${template.length}/500`;
}

// 初始化应用
const meetingInput = new MeetingInput();