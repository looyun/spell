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

    async loadTags(filePath) {
        if (this.tagsLoaded) return;
        
        try {
            // 使用流式读取大文件
            const response = await fetch(filePath);
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, {stream: true});
                // 按行处理
                const lines = buffer.split('\n');

                for (const line of lines) {
                    const words = line.split(',');
                    for (const word of words) {
                        const trimmedWord = word.trim();
                        if (trimmedWord) {
                            // 1. 标准化处理: 移除多余的转义和特殊字符
                            const normalizedTags = this.normalizedTag(trimmedWord);

                            // 将所有标准化后的标签添加到 trie 中
                            for (const normalizedTag of normalizedTags) {
                                this.trie.insert(normalizedTag);
                            }
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
        return this.trie.findAllMatches(text);
    }
}
export default TagMatcher;