// ===== 内联 trie.js =====
class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.fullWord = '';
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        word = word.toLowerCase();
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }
        node.isEndOfWord = true;
        node.fullWord = word;
    }

    findAllMatches(text) {
        const matches = [];
        const len = text.length;
        text = text.toLowerCase();

        for (let i = 0; i < len; i++) {
            let node = this.root;
            for (let j = i; j < len; j++) {
                if (!node.children.has(text[j])) break;
                node = node.children.get(text[j]);
                if (node.isEndOfWord) {
                    matches.push({
                        word: node.fullWord,
                        start: i,
                        end: j + 1
                    });
                }
            }
        }
        return matches;
    }
}

// ===== 内联 tag-matcher.js =====
class TagMatcher {
    constructor() {
        this.trie = new Trie();
        this.tagsLoaded = false;
    }

    normalizedTag(tag) {
        const normalizedTags = new Set();
        normalizedTags.add(tag);
        normalizedTags.add(tag.replace(/\\/g, ''));
        normalizedTags.add(tag.replace(/\\/g, '').replace(/\s+/g, '_'));
        return normalizedTags;
    }

    async loadTags(filePathOrContent) {
        if (this.tagsLoaded) return;
        try {
            let content;
            if (typeof filePathOrContent === 'string' && filePathOrContent.startsWith('http')) {
                const response = await fetch(filePathOrContent);
                content = await response.text();
            } else {
                content = filePathOrContent;
            }

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

// ===== worker 逻辑 =====
const artistMatcher = new TagMatcher();
const characterMatcher = new TagMatcher();

function getDataUrl(filename, baseUrl) {
    const base = baseUrl.replace(/\/$/, '');
    return `${base}/data/${filename}`;
}

async function initialize(baseUrl) {
    try {
        const [artistRes, characterRes] = await Promise.all([
            fetch(getDataUrl('artist.txt', baseUrl)),
            fetch(getDataUrl('character.txt', baseUrl))
        ]);

        const [artistText, characterText] = await Promise.all([
            artistRes.text(),
            characterRes.text()
        ]);

        await Promise.all([
            artistMatcher.loadTags(artistText),
            characterMatcher.loadTags(characterText)
        ]);

        self.postMessage({ type: 'ready' });
    } catch (error) {
        console.error('Worker initialization failed:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
}

self.onmessage = function (e) {
    const { type, text, id, baseUrl } = e.data;

    if (type === 'init') {
        initialize(baseUrl);
    } else if (type === 'match') {
        const matches = {
            artist: artistMatcher.findMatches(text),
            character: characterMatcher.findMatches(text)
        };
        self.postMessage({ type: 'result', matches, id });
    }
};
