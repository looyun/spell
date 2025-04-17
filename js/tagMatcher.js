import Trie from './trie.js';
class TagMatcher {
    constructor() {
        this.trie = new Trie();
        this.tagsLoaded = false;
    }

    normalizedTag(tag) {
        // 1. 标准化处理: 移除多余的转义和特殊字符
        const normalizedTags = new Set();
        
        // 原始标签
        normalizedTags.add(tag);
        
        // 移除所有转义符号的版本
        normalizedTags.add(tag.replace(/\\/g, ''));
        
        // 空格转下划线的版本
        normalizedTags.add(tag.replace(/\\/g, '').replace(/\s+/g, '_'));

        return normalizedTags;
    }

    async loadTags(filePathOrContent) {
        if (this.tagsLoaded) return;
        
        try {
            let content;
            if (typeof filePathOrContent === 'string' && filePathOrContent.startsWith('http')) {
                // 处理远程文件
                const response = await fetch(filePathOrContent);
                content = await response.text();
            } else {
                // 处理直接传入的内容或Vite导入的raw内容
                content = filePathOrContent;
            }

            // 按行处理
            const lines = content.split('\n');
            for (const line of lines) {
                const words = line.split(',');
                for (const word of words) {
                    const trimmedWord = word.trim();
                    if (trimmedWord) {
                        const normalizedTags = this.normalizedTag(trimmedWord);
                        for (const normalizedTag of normalizedTags) {
                            this.trie.insert(normalizedTag);
                        }
                    }
                }
            }

            this.tagsLoaded = true;
        } catch (error) {
            console.error('加载标签文件失败:', error);
            throw error;
        }
    }

    findMatches(text) {
        if (!this.tagsLoaded) {
            console.warn('Tags not loaded yet, returning empty matches');
            return [];
        }
        if (!text || typeof text !== 'string') {
            console.warn('Invalid input text, returning empty matches, text:', text);
            return [];
        }
        return this.trie.findAllMatches(text);
    }
}
export default TagMatcher;