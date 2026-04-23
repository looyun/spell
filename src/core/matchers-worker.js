import TagMatcher from './tag-matcher.js';

const artistMatcher = new TagMatcher();
const characterMatcher = new TagMatcher();

// 根据部署的 base path 计算数据文件 URL
function getDataUrl(filename) {
    const base = self.location.pathname.replace(/\/src\/core\/.*$/, '');
    return `${base}/data/${filename}`;
}

async function initialize() {
    try {
        const [artistRes, characterRes] = await Promise.all([
            fetch(getDataUrl('artist.txt')),
            fetch(getDataUrl('character.txt'))
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
    const { type, text, id } = e.data;

    if (type === 'match') {
        const matches = {
            artist: artistMatcher.findMatches(text),
            character: characterMatcher.findMatches(text)
        };
        self.postMessage({ type: 'result', matches, id });
    }
};

// 自动启动初始化
initialize();
