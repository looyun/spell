import TagMatcher from './tagMatcher.js';
import artistTagsContent from '../assets/artist.txt?raw';
import characterTagsContent from '../assets/character.txt?raw';


class GlobalMatchers {
    constructor() {
        this.artistMatcher = new TagMatcher();
        this.characterMatcher = new TagMatcher();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // 并行加载所有标签文件
            await Promise.all([
                this.artistMatcher.loadTags(artistTagsContent),
                this.characterMatcher.loadTags(characterTagsContent)
            ]);
            
            this.isInitialized = true;
            console.log('Tag matchers initialized successfully');
        } catch (error) {
            console.error('Failed to initialize tag matchers:', error);
            throw error;
        }
    }
}

// 导出单例
export const globalMatchers = new GlobalMatchers();