// 高级AI会议分析工具

class AdvancedAIAnalyzer {
    constructor() {
        this.analysisModels = {
            topicClassification: this.topicClassification.bind(this),
            sentimentAnalysis: this.sentimentAnalysis.bind(this),
            actionItemExtraction: this.actionItemExtraction.bind(this),
            priorityAssessment: this.priorityAssessment.bind(this),
            dependencyAnalysis: this.dependencyAnalysis.bind(this)
        };
    }

    // 综合分析会议内容
    async analyzeMeetingContents(contents) {
        if (!contents || contents.length === 0) {
            return this.createEmptyAnalysis();
        }

        // 并行运行所有分析模型
        const [
            topicResult,
            sentimentResult,
            actionItemsResult,
            priorityResult,
            dependencyResult
        ] = await Promise.all([
            this.analysisModels.topicClassification(contents),
            this.analysisModels.sentimentAnalysis(contents),
            this.analysisModels.actionItemExtraction(contents),
            this.analysisModels.priorityAssessment(contents),
            this.analysisModels.dependencyAnalysis(contents)
        ]);

        // 整合分析结果
        const comprehensiveResult = {
            summary: this.generateSummary(contents, topicResult, sentimentResult),
            topicClassification: topicResult,
            sentimentAnalysis: sentimentResult,
            actionItems: actionItemsResult,
            priorityAssessment: priorityResult,
            dependencyAnalysis: dependencyResult,
            discussionPoints: this.generateDiscussionPoints(contents, priorityResult),
            meetingInsights: this.generateMeetingInsights(contents, sentimentResult, priorityResult),
            recommendations: this.generateRecommendations(priorityResult, dependencyResult)
        };

        return comprehensiveResult;
    }

    // 创建空分析结果
    createEmptyAnalysis() {
        return {
            summary: '没有可分析的会议内容。',
            topicClassification: { categories: [], distribution: {} },
            sentimentAnalysis: { overall: 'neutral', positive: 0, negative: 0, neutral: 0 },
            actionItems: [],
            priorityAssessment: [],
            dependencyAnalysis: { dependencies: [], conflicts: [] },
            discussionPoints: [],
            meetingInsights: [],
            recommendations: []
        };
    }

    // 获取内容的文本（兼容新旧格式）
    getContentText(content) {
        // 新格式：多字段
        if (content.lastWeek || content.thisWeek || content.blockers || content.risks || content.others) {
            return [
                content.lastWeek || '',
                content.thisWeek || '',
                content.blockers || '',
                content.risks || '',
                content.others || ''
            ].join(' ');
        }
        // 旧格式：单个content字段
        return content.content || '';
    }

    // 主题分类
    topicClassification(contents) {
        const categoryKeywords = {
            '工作进展': ['进展', '完成', '开发', '测试', '实现', '上线', '进度'],
            '问题求助': ['问题', '求助', '协助', '支持', '困难', '障碍', '错误'],
            '需求建议': ['需求', '建议', '希望', '需要', '提议', '改进'],
            '资源申请': ['资源', '申请', '预算', '人力', '设备', '工具'],
            '风险预警': ['风险', '预警', '问题', '隐患', '可能', '影响'],
            '决策讨论': ['决策', '讨论', '选择', '方案', '评估', '比较']
        };

        const categoryCounts = {};
        const classifiedContents = [];

        contents.forEach(content => {
            const text = this.getContentText(content);
            let assignedCategory = '其他';
            let maxMatches = 0;

            Object.entries(categoryKeywords).forEach(([category, keywords]) => {
                const matches = keywords.filter(keyword => text.includes(keyword)).length;
                if (matches > maxMatches) {
                    maxMatches = matches;
                    assignedCategory = category;
                }
            });

            categoryCounts[assignedCategory] = (categoryCounts[assignedCategory] || 0) + 1;
            classifiedContents.push({
                content: content,
                category: assignedCategory
            });
        });

        // 计算分布百分比
        const total = contents.length;
        const distribution = {};
        Object.entries(categoryCounts).forEach(([category, count]) => {
            distribution[category] = ((count / total) * 100).toFixed(1);
        });

        return {
            categories: classifiedContents,
            distribution: distribution,
            categoryCounts: categoryCounts
        };
    }

    // 情感分析
    sentimentAnalysis(contents) {
        const positiveKeywords = ['好', '成功', '完成', '顺利', '满意', '优秀', '完美', '很棒', '出色'];
        const negativeKeywords = ['问题', '错误', '失败', '困难', '延迟', '糟糕', '不满意', '麻烦', '风险'];

        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        const sentimentResults = contents.map(content => {
            const text = this.getContentText(content);
            let positiveMatches = 0;
            let negativeMatches = 0;

            positiveKeywords.forEach(keyword => {
                if (text.includes(keyword)) positiveMatches++;
            });

            negativeKeywords.forEach(keyword => {
                if (text.includes(keyword)) negativeMatches++;
            });

            let sentiment;
            if (positiveMatches > negativeMatches) {
                sentiment = 'positive';
                positiveCount++;
            } else if (negativeMatches > positiveMatches) {
                sentiment = 'negative';
                negativeCount++;
            } else {
                sentiment = 'neutral';
                neutralCount++;
            }

            return {
                content: content,
                sentiment: sentiment,
                positiveMatches: positiveMatches,
                negativeMatches: negativeMatches
            };
        });

        const total = contents.length;
        let overallSentiment = 'neutral';
        
        if (positiveCount > negativeCount && positiveCount > total * 0.4) {
            overallSentiment = 'positive';
        } else if (negativeCount > positiveCount && negativeCount > total * 0.3) {
            overallSentiment = 'negative';
        }

        return {
            overall: overallSentiment,
            positive: positiveCount,
            negative: negativeCount,
            neutral: neutralCount,
            details: sentimentResults,
            positivePercentage: total > 0 ? ((positiveCount / total) * 100).toFixed(1) : 0,
            negativePercentage: total > 0 ? ((negativeCount / total) * 100).toFixed(1) : 0,
            neutralPercentage: total > 0 ? ((neutralCount / total) * 100).toFixed(1) : 0
        };
    }

    // 行动项提取
    actionItemExtraction(contents) {
        const actionItemPatterns = [
            { regex: /需要(.*?)(协助|支持|帮忙)/, type: 'assistance' },
            { regex: /要(.*?)(做|完成|实现)/, type: 'task' },
            { regex: /必须(.*?)(处理|解决|完成)/, type: 'mandatory' },
            { regex: /建议(.*?)(讨论|考虑|实施)/, type: 'suggestion' },
            { regex: /计划(.*?)(进行|开展|实施)/, type: 'plan' }
        ];

        const actionItems = [];

        contents.forEach(content => {
            const text = this.getContentText(content);
            
            actionItemPatterns.forEach(pattern => {
                const matches = text.match(pattern.regex);
                if (matches && matches.length > 1) {
                    actionItems.push({
                        id: `ACTION-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        description: matches[0].trim(),
                        detail: matches[1].trim(),
                        type: pattern.type,
                        source: text,
                        participant: content.participant,
                        priority: this.inferPriority(text),
                        deadline: this.inferDeadline(text)
                    });
                }
            });

            // 检查是否有明确的负责人
            if (text.includes('负责') || text.includes('由谁')) {
                actionItems.push({
                    id: `ACTION-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    description: text,
                    type: 'responsibility',
                    source: text,
                    participant: content.participant,
                    priority: this.inferPriority(text),
                    needAssignment: true
                });
            }
        });

        return actionItems;
    }

    // 推断优先级
    inferPriority(content) {
        const highPriorityWords = ['紧急', '立即', '马上', '必须', '重要', '关键'];
        const mediumPriorityWords = ['需要', '应该', '计划', '安排'];
        
        for (const word of highPriorityWords) {
            if (content.includes(word)) {
                return 'high';
            }
        }
        
        for (const word of mediumPriorityWords) {
            if (content.includes(word)) {
                return 'medium';
            }
        }
        
        return 'low';
    }

    // 推断截止日期
    inferDeadline(content) {
        const datePatterns = [
            { regex: /今天/, days: 0 },
            { regex: /明天/, days: 1 },
            { regex: /后天/, days: 2 },
            { regex: /本周/, days: 3 },
            { regex: /下周/, days: 7 },
            { regex: /本月/, days: 15 },
            { regex: /下月/, days: 30 }
        ];

        for (const pattern of datePatterns) {
            if (content.match(pattern.regex)) {
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + pattern.days);
                return deadline.toISOString().slice(0, 10);
            }
        }

        // 默认一周后
        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 7);
        return defaultDeadline.toISOString().slice(0, 10);
    }

    // 优先级评估
    priorityAssessment(contents) {
        const priorityAssessments = contents.map(content => {
            const text = this.getContentText(content);
            const priority = this.inferPriority(text);
            const impact = this.assessImpact(text);
            const effort = this.assessEffort(text);
            
            return {
                content: content,
                priority: priority,
                impact: impact,
                effort: effort,
                score: this.calculatePriorityScore(priority, impact, effort),
                shouldDiscuss: this.shouldDiscussInMeeting(priority, impact)
            };
        });

        // 按优先级排序
        priorityAssessments.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority] || b.score - a.score;
        });

        return priorityAssessments;
    }

    // 评估影响
    assessImpact(content) {
        const highImpactWords = ['全局', '系统', '所有', '用户', '收入', '关键', '核心'];
        const mediumImpactWords = ['模块', '团队', '部分', '功能'];
        
        for (const word of highImpactWords) {
            if (content.includes(word)) {
                return 'high';
            }
        }
        
        for (const word of mediumImpactWords) {
            if (content.includes(word)) {
                return 'medium';
            }
        }
        
        return 'low';
    }

    // 评估工作量
    assessEffort(content) {
        const highEffortWords = ['复杂', '大量', '长期', '多个', '系统'];
        const mediumEffortWords = ['一些', '部分', '几个', '需要'];
        
        for (const word of highEffortWords) {
            if (content.includes(word)) {
                return 'high';
            }
        }
        
        for (const word of mediumEffortWords) {
            if (content.includes(word)) {
                return 'medium';
            }
        }
        
        return 'low';
    }

    // 计算优先级分数
    calculatePriorityScore(priority, impact, effort) {
        const priorityScores = { high: 5, medium: 3, low: 1 };
        const impactScores = { high: 4, medium: 2, low: 1 };
        const effortScores = { high: 1, medium: 2, low: 3 }; // 工作量越低，分数越高
        
        return priorityScores[priority] + impactScores[impact] + effortScores[effort];
    }

    // 判断是否需要在会议中讨论
    shouldDiscussInMeeting(priority, impact) {
        return priority === 'high' || impact === 'high';
    }

    // 依赖关系分析
    dependencyAnalysis(contents) {
        const dependencies = [];
        const conflicts = [];

        // 查找依赖关系
        const dependencyRegex = /依赖(.*?)|取决于(.*?)|需要(.*?)完成/;
        
        contents.forEach((content, index) => {
            const text = this.getContentText(content);
            const matches = text.match(dependencyRegex);
            if (matches) {
                dependencies.push({
                    fromContent: content.id,
                    fromParticipant: content.participant,
                    dependency: matches[0],
                    toContent: this.findRelatedContent(contents, matches[1] || matches[2] || matches[3]),
                    index: index
                });
            }
        });

        // 查找潜在冲突
        const positiveWords = ['完成', '成功', '顺利', '好'];
        const negativeWords = ['延迟', '问题', '困难', '失败'];
        
        for (let i = 0; i < contents.length; i++) {
            for (let j = i + 1; j < contents.length; j++) {
                const content1 = contents[i];
                const content2 = contents[j];
                const text1 = this.getContentText(content1);
                const text2 = this.getContentText(content2);
                
                const hasPositive = positiveWords.some(word => text1.includes(word));
                const hasNegative = negativeWords.some(word => text2.includes(word));
                
                if (hasPositive && hasNegative && this.areRelatedContents(content1, content2)) {
                    conflicts.push({
                        content1: content1,
                        content2: content2,
                        reason: '潜在进度冲突'
                    });
                }
            }
        }

        return {
            dependencies: dependencies,
            conflicts: conflicts,
            hasConflicts: conflicts.length > 0
        };
    }

    // 查找相关内容
    findRelatedContent(contents, keyword) {
        if (!keyword) return null;
        
        return contents.find(content => {
            const text = this.getContentText(content);
            return text.includes(keyword.trim()) && text.length > keyword.length;
        })?.id || null;
    }

    // 判断内容是否相关
    areRelatedContents(content1, content2) {
        const text1 = this.getContentText(content1);
        const text2 = this.getContentText(content2);
        const words1 = text1.split(/\s+/).filter(word => word.length > 2);
        const words2 = text2.split(/\s+/).filter(word => word.length > 2);
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length > 0;
    }

    // 生成总结
    generateSummary(contents, topicResult, sentimentResult) {
        const totalContents = contents.length;
        const participantCount = [...new Set(contents.map(c => c.participant))].length;
        const mainCategories = Object.entries(topicResult.distribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([category]) => category);

        let sentimentText = '';
        if (sentimentResult.overall === 'positive') {
            sentimentText = '整体氛围积极，团队进展顺利。';
        } else if (sentimentResult.overall === 'negative') {
            sentimentText = '整体氛围略显紧张，存在一些挑战需要解决。';
        } else {
            sentimentText = '整体氛围平和，团队稳步推进工作。';
        }

        return `本次会议共有${participantCount}位参与者，提交了${totalContents}条内容。主要涉及${mainCategories.join('和')}等方面。${sentimentText}`;
    }

    // 生成讨论要点
    generateDiscussionPoints(contents, priorityResult) {
        const highPriorityItems = priorityResult.filter(item => item.shouldDiscuss);
        
        return highPriorityItems.map(item => {
            const text = this.getContentText(item.content);
            const priorityIcon = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
            return `${priorityIcon} ${text.substring(0, 50)}${text.length > 50 ? '...' : ''} (来自: ${item.content.participant || '未知'})`;
        });
    }

    // 生成会议洞察
    generateMeetingInsights(contents, sentimentResult, priorityResult) {
        const insights = [];
        
        // 优先级分布洞察
        const highPriorityCount = priorityResult.filter(item => item.priority === 'high').length;
        if (highPriorityCount > priorityResult.length * 0.5) {
            insights.push('本次会议有较多高优先级事项，建议重点关注和分配资源。');
        }
        
        // 情感洞察
        if (sentimentResult.positivePercentage > 60) {
            insights.push('团队整体士气高昂，对工作进展感到满意。');
        } else if (sentimentResult.negativePercentage > 40) {
            insights.push('团队面临一些挑战，需要关注成员的困难并提供支持。');
        }
        
        // 参与度洞察
        const participantContents = {};
        contents.forEach(content => {
            participantContents[content.participant] = (participantContents[content.participant] || 0) + 1;
        });
        
        const maxContents = Math.max(...Object.values(participantContents));
        const mostActiveParticipant = Object.keys(participantContents).find(p => participantContents[p] === maxContents);
        if (maxContents > contents.length * 0.3) {
            insights.push(`${mostActiveParticipant}参与度最高，贡献了${maxContents}条内容。`);
        }
        
        return insights;
    }

    // 生成建议
    generateRecommendations(priorityResult, dependencyResult) {
        const recommendations = [];
        
        // 优先级相关建议
        const highPriorityItems = priorityResult.filter(item => item.priority === 'high');
        if (highPriorityItems.length > 3) {
            recommendations.push('高优先级事项较多，建议进行优先级排序，集中资源解决最重要的问题。');
        }
        
        // 依赖关系建议
        if (dependencyResult.dependencies.length > 0) {
            recommendations.push('发现存在任务依赖关系，建议明确依赖顺序和责任人，避免阻塞。');
        }
        
        // 冲突建议
        if (dependencyResult.hasConflicts) {
            recommendations.push('发现潜在冲突，建议在会议中专门讨论解决方案，达成共识。');
        }
        
        // 工作量平衡建议
        const effortDistribution = {
            high: priorityResult.filter(item => item.effort === 'high').length,
            medium: priorityResult.filter(item => item.effort === 'medium').length,
            low: priorityResult.filter(item => item.effort === 'low').length
        };
        
        if (effortDistribution.high > effortDistribution.low * 2) {
            recommendations.push('高工作量任务较多，建议评估资源分配，考虑是否需要增加人手或调整计划。');
        }
        
        return recommendations;
    }
}

// 初始化高级AI分析器
const advancedAIAnalyzer = new AdvancedAIAnalyzer();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedAIAnalyzer;
} else {
    window.advancedAIAnalyzer = advancedAIAnalyzer;
}