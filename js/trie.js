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
        word = word.toLowerCase(); // 不区分大小写匹配
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
        text = text.toLowerCase(); // 不区分大小写匹配

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
export default Trie;