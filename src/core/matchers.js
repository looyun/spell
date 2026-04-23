class GlobalMatchers {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.pendingRequests = new Map();
        this.requestId = 0;
    }

    async initialize() {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            const workerUrl = new URL('./matchers-worker.js', import.meta.url);
            this.worker = new Worker(workerUrl, { type: 'module' });

            this.worker.onmessage = (e) => {
                const { type, matches, id, error } = e.data;

                if (type === 'ready') {
                    this.isInitialized = true;
                } else if (type === 'result') {
                    const pending = this.pendingRequests.get(id);
                    if (pending) {
                        pending.resolve(matches);
                        this.pendingRequests.delete(id);
                    }
                } else if (type === 'error') {
                    console.error('Matcher worker error:', error);
                    // 如果有等待初始化的 promise，这里不 reject，让 match 请求在初始化后重试
                }
            };

            this.worker.onerror = (err) => {
                console.error('Worker error:', err);
            };

            // 等待 worker 初始化完成（最多 30 秒）
            await Promise.race([
                new Promise((resolve) => {
                    const check = () => {
                        if (this.isInitialized) {
                            resolve();
                        } else {
                            setTimeout(check, 50);
                        }
                    };
                    check();
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Worker initialization timeout')), 30000)
                )
            ]);

            console.log('Tag matchers initialized successfully');
        } catch (error) {
            console.error('Failed to initialize tag matchers:', error);
            throw error;
        }
    }

    _ensureInitialized() {
        if (!this.isInitialized) {
            return this.initialize();
        }
        return Promise.resolve();
    }

    async _sendMatchRequest(text) {
        await this._ensureInitialized();

        const id = ++this.requestId;
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'match', text, id });

            // 5 秒超时
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Match request timeout'));
                }
            }, 5000);
        });
    }

    async findArtistMatches(text) {
        try {
            const result = await this._sendMatchRequest(text);
            return result.artist || [];
        } catch (error) {
            console.error('Artist match failed:', error);
            return [];
        }
    }

    async findCharacterMatches(text) {
        try {
            const result = await this._sendMatchRequest(text);
            return result.character || [];
        } catch (error) {
            console.error('Character match failed:', error);
            return [];
        }
    }

    async findMatches(text) {
        try {
            const result = await this._sendMatchRequest(text);
            return {
                artist: result.artist || [],
                character: result.character || []
            };
        } catch (error) {
            console.error('Match failed:', error);
            return { artist: [], character: [] };
        }
    }

    // 兼容旧接口：保持 artistMatcher / characterMatcher 属性
    // 注意：同步调用在 Worker 未就绪时返回空数组，建议使用 findMatches() 异步接口
    get artistMatcher() {
        return {
            findMatches: (text) => {
                if (!this.isInitialized) {
                    console.warn('Tags not loaded yet, returning empty matches');
                    return [];
                }
                // 同步接口无法等待 Worker，返回空数组
                // parser.js 已改为使用 await globalMatchers.findMatches()
                return [];
            }
        };
    }

    get characterMatcher() {
        return {
            findMatches: (text) => {
                if (!this.isInitialized) {
                    console.warn('Tags not loaded yet, returning empty matches');
                    return [];
                }
                return [];
            }
        };
    }
}

// 导出单例
export const globalMatchers = new GlobalMatchers();
