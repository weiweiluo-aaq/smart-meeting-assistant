// 待办事项管理逻辑

class TodoManager {
    constructor() {
        this.todos = [];
        this.filteredTodos = [];
        this.selectedTodos = new Set();
        
        this.init();
    }

    init() {
        this.loadTodos();
        this.setupEventListeners();
        this.updateStats();
        this.populateAssigneeFilter();
    }

    // 加载待办事项
    loadTodos() {
        this.todos = JSON.parse(localStorage.getItem('meetingTodos') || '[]');
        this.filteredTodos = [...this.todos];
        
        this.displayTodos();
        this.updateStats();
        document.getElementById('total-todos').textContent = this.todos.length;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 筛选器
        document.getElementById('status-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('priority-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('assignee-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('date-filter').addEventListener('change', () => this.applyFilters());
        
        // 搜索
        document.getElementById('search-input').addEventListener('input', () => this.applyFilters());
        
        // 排序
        document.getElementById('sort-order').addEventListener('change', () => this.sortTodos());
        
        // 批量操作
        document.getElementById('batch-complete').addEventListener('click', () => this.batchComplete());
        document.getElementById('batch-delete').addEventListener('click', () => this.batchDelete());
        
        // 清除筛选
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
    }

    // 填充负责人筛选器
    populateAssigneeFilter() {
        const assignees = new Set();
        this.todos.forEach(todo => {
            if (todo.assignee) {
                assignees.add(todo.assignee);
            }
        });
        
        const assigneeFilter = document.getElementById('assignee-filter');
        assignees.forEach(assignee => {
            const option = document.createElement('option');
            option.value = assignee;
            option.textContent = assignee;
            assigneeFilter.appendChild(option);
        });
    }

    // 应用筛选
    applyFilters() {
        const statusFilter = document.getElementById('status-filter').value;
        const priorityFilter = document.getElementById('priority-filter').value;
        const assigneeFilter = document.getElementById('assignee-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        const searchQuery = document.getElementById('search-input').value.toLowerCase();

        let filtered = [...this.todos];

        // 状态筛选
        if (statusFilter !== 'all') {
            filtered = filtered.filter(todo => {
                const status = this.getTodoStatus(todo);
                
                if (statusFilter === 'overdue') {
                    return status === 'overdue';
                }
                return status === statusFilter;
            });
        }

        // 优先级筛选
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(todo => todo.priority === priorityFilter);
        }

        // 负责人筛选
        if (assigneeFilter !== 'all') {
            filtered = filtered.filter(todo => todo.assignee === assigneeFilter);
        }

        // 日期筛选
        if (dateFilter !== 'all') {
            const now = new Date();
            
            filtered = filtered.filter(todo => {
                if (!todo.deadline) return false;
                
                const deadline = new Date(todo.deadline);
                
                switch (dateFilter) {
                    case 'week':
                        const weekFromNow = new Date();
                        weekFromNow.setDate(now.getDate() + 7);
                        return deadline >= now && deadline <= weekFromNow;
                    case 'month':
                        const monthFromNow = new Date();
                        monthFromNow.setMonth(now.getMonth() + 1);
                        return deadline >= now && deadline <= monthFromNow;
                    case 'overdue':
                        return deadline < now && todo.status !== 'completed';
                    default:
                        return true;
                }
            });
        }

        // 搜索筛选
        if (searchQuery) {
            filtered = filtered.filter(todo => {
                const todoText = `${todo.description} ${todo.assignee || ''} ${todo.note || ''}`.toLowerCase();
                return todoText.includes(searchQuery);
            });
        }

        this.filteredTodos = filtered;
        this.displayTodos();
        document.getElementById('total-todos').textContent = filtered.length;
    }

    // 获取待办事项状态
    getTodoStatus(todo) {
        if (todo.status === 'completed') return 'completed';
        if (todo.status === 'in-progress') return 'in-progress';
        
        if (todo.deadline) {
            const deadline = new Date(todo.deadline);
            const now = new Date();
            if (deadline < now) return 'overdue';
        }
        
        return 'pending';
    }

    // 排序待办事项
    sortTodos() {
        const sortOrder = document.getElementById('sort-order').value;
        let sorted = [...this.filteredTodos];

        switch (sortOrder) {
            case 'deadline':
                sorted.sort((a, b) => {
                    // 逾期的排在最前面
                    const aOverdue = this.getTodoStatus(a) === 'overdue';
                    const bOverdue = this.getTodoStatus(b) === 'overdue';
                    
                    if (aOverdue && !bOverdue) return -1;
                    if (!aOverdue && bOverdue) return 1;
                    
                    // 然后按截止日期排序
                    if (a.deadline && b.deadline) {
                        return new Date(a.deadline) - new Date(b.deadline);
                    }
                    if (a.deadline) return -1;
                    if (b.deadline) return 1;
                    return 0;
                });
                break;
            case 'priority':
                sorted.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                });
                break;
            case 'newest':
                sorted.sort((a, b) => {
                    const aDate = a.createdDate ? new Date(a.createdDate) : new Date(0);
                    const bDate = b.createdDate ? new Date(b.createdDate) : new Date(0);
                    return bDate - aDate;
                });
                break;
            case 'oldest':
                sorted.sort((a, b) => {
                    const aDate = a.createdDate ? new Date(a.createdDate) : new Date(0);
                    const bDate = b.createdDate ? new Date(b.createdDate) : new Date(0);
                    return aDate - bDate;
                });
                break;
        }

        this.filteredTodos = sorted;
        this.displayTodos();
    }

    // 显示待办事项列表
    displayTodos() {
        const todosList = document.getElementById('todos-list');
        
        if (this.filteredTodos.length === 0) {
            todosList.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">没有找到匹配的待办事项</p>
                </div>
            `;
            return;
        }

        todosList.innerHTML = this.filteredTodos.map((todo, index) => {
            const status = this.getTodoStatus(todo);
            const isOverdue = status === 'overdue';
            const deadlineText = todo.deadline ? new Date(todo.deadline).toLocaleDateString('zh-CN') : '无截止日期';
            
            return `
                <div class="todo-card bg-white border ${isOverdue ? 'border-red-200' : 'border-gray-200'} rounded-lg overflow-hidden">
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <div class="flex items-center gap-2">
                                    <h4 class="font-semibold text-gray-800">${todo.description}</h4>
                                    <span class="priority-badge priority-${todo.priority || 'low'}">${todo.priority === 'high' ? '高优先级' : todo.priority === 'medium' ? '中优先级' : '低优先级'}</span>
                                    <span class="status-badge status-${status}">${status === 'pending' ? '待处理' : status === 'in-progress' ? '进行中' : status === 'completed' ? '已完成' : '已逾期'}</span>
                                </div>
                                <p class="text-sm text-gray-500">${todo.createdDate ? new Date(todo.createdDate).toLocaleString('zh-CN') : '创建时间未知'}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="selectTodo('${todo.id}')" class="text-gray-400 hover:text-blue-600">
                                    <i class="far fa-check-circle"></i>
                                </button>
                                <button onclick="viewTodoDetails('${todo.id}')" class="text-gray-400 hover:text-blue-600">
                                    <i class="fas fa-external-link-alt"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                                <p class="text-xs text-gray-500 mb-0.5">负责人</p>
                                <p class="text-sm font-semibold text-gray-800">${todo.assignee || '未指定'}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 mb-0.5">截止日期</p>
                                <p class="text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-800'}">${deadlineText}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 mb-0.5">来源会议</p>
                                <p class="text-sm font-semibold text-gray-800">${todo.meetingId || '未知'}</p>
                            </div>
                        </div>
                        
                        ${todo.note ? `
                            <div class="bg-gray-50 rounded-lg p-3 mb-3">
                                <p class="text-sm text-gray-700">${todo.note}</p>
                            </div>
                        ` : ''}
                        
                        <div class="flex gap-2">
                            ${todo.status !== 'completed' ? `
                                <button onclick="updateTodoStatus('${todo.id}', 'in-progress')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center">
                                    <i class="fas fa-play mr-2"></i>开始处理
                                </button>
                                <button onclick="updateTodoStatus('${todo.id}', 'completed')" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center">
                                    <i class="fas fa-check mr-2"></i>标记完成
                                </button>
                            ` : ''}
                            <button onclick="deleteTodo('${todo.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center">
                                <i class="fas fa-trash mr-2"></i>删除
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 更新待办事项状态
    updateTodoStatus(todoId, status) {
        const todoIndex = this.todos.findIndex(todo => todo.id === todoId);
        if (todoIndex === -1) return;
        
        this.todos[todoIndex].status = status;
        if (status === 'completed') {
            this.todos[todoIndex].completedDate = new Date().toISOString();
        }
        
        localStorage.setItem('meetingTodos', JSON.stringify(this.todos));
        this.loadTodos();
        this.applyFilters();
        
        // 显示通知
        this.showNotification(`待办事项已${status === 'completed' ? '标记为完成' : '标记为进行中'}`, 'success');
    }

    // 删除待办事项
    deleteTodo(todoId) {
        if (confirm('确定要删除这个待办事项吗？')) {
            this.todos = this.todos.filter(todo => todo.id !== todoId);
            localStorage.setItem('meetingTodos', JSON.stringify(this.todos));
            this.loadTodos();
            this.applyFilters();
            
            this.showNotification('待办事项已删除', 'success');
        }
    }

    // 批量完成
    batchComplete() {
        if (this.selectedTodos.size === 0) {
            this.showNotification('请先选择要完成的待办事项', 'warning');
            return;
        }
        
        if (confirm(`确定要标记 ${this.selectedTodos.size} 个待办事项为已完成吗？`)) {
            this.todos.forEach(todo => {
                if (this.selectedTodos.has(todo.id)) {
                    todo.status = 'completed';
                    todo.completedDate = new Date().toISOString();
                }
            });
            
            localStorage.setItem('meetingTodos', JSON.stringify(this.todos));
            this.selectedTodos.clear();
            this.updateBatchButtons();
            this.loadTodos();
            this.applyFilters();
            
            this.showNotification(`已成功标记 ${this.selectedTodos.size} 个待办事项为已完成`, 'success');
        }
    }

    // 批量删除
    batchDelete() {
        if (this.selectedTodos.size === 0) {
            this.showNotification('请先选择要删除的待办事项', 'warning');
            return;
        }
        
        if (confirm(`确定要删除 ${this.selectedTodos.size} 个待办事项吗？此操作不可恢复。`)) {
            this.todos = this.todos.filter(todo => !this.selectedTodos.has(todo.id));
            localStorage.setItem('meetingTodos', JSON.stringify(this.todos));
            this.selectedTodos.clear();
            this.updateBatchButtons();
            this.loadTodos();
            this.applyFilters();
            
            this.showNotification(`已成功删除 ${this.selectedTodos.size} 个待办事项`, 'success');
        }
    }

    // 更新批量操作按钮状态
    updateBatchButtons() {
        const completeBtn = document.getElementById('batch-complete');
        const deleteBtn = document.getElementById('batch-delete');
        
        if (this.selectedTodos.size > 0) {
            completeBtn.disabled = false;
            deleteBtn.disabled = false;
            completeBtn.innerHTML = `<i class="fas fa-check mr-2"></i>批量完成 (${this.selectedTodos.size})`;
            deleteBtn.innerHTML = `<i class="fas fa-trash mr-2"></i>批量删除 (${this.selectedTodos.size})`;
        } else {
            completeBtn.disabled = true;
            deleteBtn.disabled = true;
            completeBtn.innerHTML = '<i class="fas fa-check mr-2"></i>批量完成';
            deleteBtn.innerHTML = '<i class="fas fa-trash mr-2"></i>批量删除';
        }
    }

    // 更新统计数据
    updateStats() {
        const totalTodos = this.todos.length;
        
        const pendingCount = this.todos.filter(todo => this.getTodoStatus(todo) === 'pending').length;
        const inProgressCount = this.todos.filter(todo => this.getTodoStatus(todo) === 'in-progress').length;
        const completedCount = this.todos.filter(todo => this.getTodoStatus(todo) === 'completed').length;
        const overdueCount = this.todos.filter(todo => this.getTodoStatus(todo) === 'overdue').length;
        
        // 计算完成率
        const totalActive = totalTodos - completedCount;
        const completionRate = totalTodos > 0 ? Math.round((completedCount / totalTodos) * 100) : 0;
        
        const highPriorityTotal = this.todos.filter(todo => todo.priority === 'high').length;
        const highPriorityCompleted = this.todos.filter(todo => todo.priority === 'high' && todo.status === 'completed').length;
        const highPriorityRate = highPriorityTotal > 0 ? Math.round((highPriorityCompleted / highPriorityTotal) * 100) : 0;
        
        const overdueTotal = overdueCount;
        const overdueCompleted = this.todos.filter(todo => this.getTodoStatus(todo) === 'overdue' && todo.status === 'completed').length;
        const overdueRate = overdueTotal > 0 ? Math.round((overdueCompleted / overdueTotal) * 100) : 0;

        document.getElementById('stat-total').textContent = totalTodos;
        document.getElementById('stat-pending').textContent = pendingCount;
        document.getElementById('stat-in-progress').textContent = inProgressCount;
        document.getElementById('stat-completed').textContent = completedCount;
        document.getElementById('stat-overdue').textContent = overdueCount;
        
        // 更新进度条
        document.getElementById('completion-rate-overall').style.width = `${completionRate}%`;
        document.getElementById('completion-rate-overall-text').textContent = `${completionRate}%`;
        
        document.getElementById('completion-rate-high').style.width = `${highPriorityRate}%`;
        document.getElementById('completion-rate-high-text').textContent = `${highPriorityRate}%`;
        
        document.getElementById('completion-rate-overdue').style.width = `${overdueRate}%`;
        document.getElementById('completion-rate-overdue-text').textContent = `${overdueRate}%`;
    }

    // 排序待办事项
    sortTodos() {
        // 已经在applyFilters中实现
    }

    // 清除筛选
    clearFilters() {
        document.getElementById('status-filter').value = 'all';
        document.getElementById('priority-filter').value = 'all';
        document.getElementById('assignee-filter').value = 'all';
        document.getElementById('date-filter').value = 'all';
        document.getElementById('search-input').value = '';
        
        this.applyFilters();
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

// 全局函数
let todoManager;
const selectedTodos = new Set();

function initTodoManager() {
    todoManager = new TodoManager();
}

function selectTodo(todoId) {
    if (selectedTodos.has(todoId)) {
        selectedTodos.delete(todoId);
    } else {
        selectedTodos.add(todoId);
    }
    
    // 更新按钮状态
    const completeBtn = document.getElementById('batch-complete');
    const deleteBtn = document.getElementById('batch-delete');
    
    if (selectedTodos.size > 0) {
        completeBtn.disabled = false;
        deleteBtn.disabled = false;
        completeBtn.innerHTML = `<i class="fas fa-check mr-2"></i>批量完成 (${selectedTodos.size})`;
        deleteBtn.innerHTML = `<i class="fas fa-trash mr-2"></i>批量删除 (${selectedTodos.size})`;
    } else {
        completeBtn.disabled = true;
        deleteBtn.disabled = true;
        completeBtn.innerHTML = '<i class="fas fa-check mr-2"></i>批量完成';
        deleteBtn.innerHTML = '<i class="fas fa-trash mr-2"></i>批量删除';
    }
}

function viewTodoDetails(todoId) {
    const todo = todoManager.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    const modal = document.getElementById('todo-modal');
    const modalContent = document.getElementById('modal-content');
    const modalTodoTitle = document.getElementById('modal-todo-title');
    
    modalTodoTitle.textContent = `待办事项详情`;
    
    const status = todoManager.getTodoStatus(todo);
    
    // 构建详情内容
    let detailsHTML = `
        <div class="space-y-6">
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-gray-800 mb-2">基本信息</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">待办事项ID</p>
                        <p class="font-medium text-gray-800 font-mono">${todo.id}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">状态</p>
                        <p class="font-medium text-gray-800">${status === 'pending' ? '待处理' : status === 'in-progress' ? '进行中' : status === 'completed' ? '已完成' : '已逾期'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">优先级</p>
                        <p class="font-medium text-gray-800">${todo.priority === 'high' ? '高优先级' : todo.priority === 'medium' ? '中优先级' : '低优先级'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">负责人</p>
                        <p class="font-medium text-gray-800">${todo.assignee || '未指定'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">截止日期</p>
                        <p class="font-medium ${status === 'overdue' ? 'text-red-600' : 'text-gray-800'}">${todo.deadline ? new Date(todo.deadline).toLocaleString('zh-CN') : '无截止日期'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">来源会议</p>
                        <p class="font-medium text-gray-800">${todo.meetingId || '未知'}</p>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-2">详细描述</h4>
                <p class="text-gray-700 leading-relaxed">${todo.description}</p>
            </div>
            
            ${todo.note ? `
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">备注信息</h4>
                    <p class="text-gray-700 leading-relaxed">${todo.note}</p>
                </div>
            ` : ''}
            
            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-2">时间信息</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">创建时间</p>
                        <p class="font-medium text-gray-800">${todo.createdDate ? new Date(todo.createdDate).toLocaleString('zh-CN') : '未知'}</p>
                    </div>
                    ${todo.completedDate ? `
                        <div>
                            <p class="text-sm text-gray-600 mb-1">完成时间</p>
                            <p class="font-medium text-gray-800">${new Date(todo.completedDate).toLocaleString('zh-CN')}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="flex gap-2">
                ${todo.status !== 'completed' ? `
                    <button onclick="updateTodoStatus('${todo.id}', 'in-progress'); closeTodoModal();" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center">
                        <i class="fas fa-play mr-2"></i>开始处理
                    </button>
                    <button onclick="updateTodoStatus('${todo.id}', 'completed'); closeTodoModal();" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center">
                        <i class="fas fa-check mr-2"></i>标记完成
                    </button>
                ` : ''}
                <button onclick="deleteTodo('${todo.id}'); closeTodoModal();" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center">
                    <i class="fas fa-trash mr-2"></i>删除
                </button>
            </div>
        </div>
    `;
    
    modalContent.innerHTML = detailsHTML;
    modal.classList.remove('hidden');
}

function closeTodoModal() {
    document.getElementById('todo-modal').classList.add('hidden');
}

// 初始化
window.addEventListener('DOMContentLoaded', initTodoManager);