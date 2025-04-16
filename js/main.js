import { t, getCurrentLang, setLanguage } from './i18n.js';
import ImageParser from './parser.js';
import hljs from 'highlight.js'
import { globalMatchers } from './matchers.js';

window.hljs = hljs


function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await globalMatchers.initialize();
        // 继续其他初始化操作...
    } catch (error) {
        console.error('初始化失败:', error);
        // 处理初始化失败的情况
    }

    // 主题切换功能
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // 初始化语言选择器
    const langSelect = document.getElementById('langSelect');
    langSelect.value = getCurrentLang();
    langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
        updateI18n();
    });

    // 初始化时更新一次
    updateI18n();

    // 拖拽处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await processImage(file);
        }
    });

    // 点击上传
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await processImage(file);
        }
    });

    // 添加全局拖拽支持
    const globalDropZone = document.getElementById('globalDropZone');

    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
        globalDropZone.classList.add('active');
    });

    document.body.addEventListener('dragleave', (e) => {
        if (e.target === document.body || e.target === globalDropZone) {
            globalDropZone.classList.remove('active');
        }
    });

    document.body.addEventListener('drop', async (e) => {
        e.preventDefault();
        globalDropZone.classList.remove('active');

        // 处理文件拖拽
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await processImage(file);
            return;
        }
    });

    async function processImage(file) {
        try {
            const parser = new ImageParser();
            const metadata = await parser.parse(file);
            console.log('解析结果:', metadata);
            displayMetadata(metadata);
            handleFile(file);
        } catch (error) {
            console.error('处理图片失败:', error);
            alert(error.message);
        }
    }

    async function handleFile(file) {
        // 显示结果区域（仅在首次加载时）
        const resultDiv = document.getElementById('result');
        if (resultDiv.classList.contains('hidden')) {
            resultDiv.classList.remove('hidden');
        }

        // 等待图片加载完成
        await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const previewImage = document.getElementById('previewImage');
                previewImage.src = e.target.result;
                // 等待图片加载完成后再滚动
                previewImage.onload = () => {
                    resultDiv.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    resolve();
                };
            }
            reader.readAsDataURL(file);
        });
    }

    function displayMetadata(metadata) {
        // 更新生成器信息
        toggleSection('generator', metadata.generator);

        // 更新分辨率信息
        if (metadata.dimensions) {
            toggleSection('dimensions',
                `${metadata.dimensions.width} × ${metadata.dimensions.height}`);
        }

        // 更新模型信息
        if (metadata.model) {
            toggleSection('model', metadata.model);
            // 删除后缀
            var keyword = metadata.model.trim().split('.')[0];
            // 将字符串分割
            keyword = keyword.replace(/([vV])([0-9])/g, ' $1$2');
            keyword = keyword.replace(/([a-z])([A-Z])/g, '$1 $2');
            keyword = keyword.replace('_', ' ');
            const modelLink = document.getElementById('model-link');
            modelLink.href = `https://civitai.com/search/models?modelType=Checkpoint&query=${keyword}`;
        }

        // 更新采样设置
        if (metadata.sampler || metadata.scheduler) {

            if (metadata.sampler) {
                document.getElementById('sampler-content').classList.remove('hidden');
                document.getElementById('sampler-value').textContent = metadata.sampler;
            } else {
                document.getElementById('sampler-content').classList.add('hidden');
            }

            if (metadata.scheduler) {
                document.getElementById('scheduler-content').classList.remove('hidden');
                document.getElementById('scheduler-value').textContent = metadata.scheduler;
            } else {
                document.getElementById('scheduler-content').classList.add('hidden');
            }
        }

        // 更新 CFG 和步数和种子
        if (metadata.seed || metadata.steps || metadata.cfg) {
            document.getElementById('generation-section').classList.remove('hidden');
            if (metadata.cfg) {
                document.getElementById('cfg-content').classList.remove('hidden');
                document.getElementById('cfg-value').textContent = metadata.cfg;
            } else {
                document.getElementById('cfg-content').classList.add('hidden');
            }
            if (metadata.steps) {
                document.getElementById('steps-content').classList.remove('hidden');
                document.getElementById('steps-value').textContent = metadata.steps;
            } else {
                document.getElementById('steps-content').classList.add('hidden');
            }
            if (metadata.seed) {
                document.getElementById('seed-content').classList.remove('hidden');
                document.getElementById('seed-value').textContent = metadata.seed;
            } else {
                document.getElementById('seed-content').classList.add('hidden');
            }
        } else {
            document.getElementById('generation-section').classList.add('hidden');
        }

        // 更新提示词
        if (metadata.positivePrompt) {
            document.getElementById('prompt-section').classList.remove('hidden');
            const promptContainer = document.getElementById('prompt-content');
            
            // 对提示词进行高亮处理
            let highlightedText = metadata.positivePrompt;
            metadata.charaterMatches?.forEach(match => {
                const escapedWord = match.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(?<!\\w)${escapedWord}(?!\\w)`, 'gi');
                highlightedText = highlightedText.replace(regex, match => 
                    `<span class="highlight-character">${match}</span>`
                );
            });

            metadata.artistMatches?.forEach(match => {
                const escapedWord = match.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(?<!\\w)${escapedWord}(?!\\w)`, 'gi');
                highlightedText = highlightedText.replace(regex, match => 
                    `<span class="highlight-artist">${match}</span>`
                );
            });
            
            // 使用innerHTML设置高亮后的内容
            promptContainer.innerHTML = highlightedText;
            
            const copyPromptBtn = document.getElementById('copy-prompt');
            copyPromptBtn.dataset.content = metadata.positivePrompt;
        } else {
            document.getElementById('prompt-section').classList.add('hidden');
        }
        if (metadata.negativePrompt) {
            document.getElementById('negative-prompt-section').classList.remove('hidden');
            document.getElementById('negative-prompt-content').textContent = metadata.negativePrompt;
            document.getElementById('copy-negative-prompt').dataset.content = metadata.negativePrompt;
        } else {
            document.getElementById('negative-prompt-section').classList.add('hidden');
        }

        // 修改 JSON 预览部分
        const jsonContent = document.getElementById('jsonContent');
        jsonContent.textContent = JSON.stringify(metadata.rawTags, null, 2);
        jsonContent.classList.add('whitespace-pre');  // 保持原始格式

        // 使用 highlight.js 的正确方法
        if (hljs) {
            hljs.highlightAll();
        }
    }

    // 显示/隐藏区域并更新内容
    function toggleSection(id, content) {
        if (!content) {
            section.classList.add('hidden');
            return
        }
        const section = document.getElementById(`${id}-section`);
        const contentEl = document.getElementById(`${id}-content`);

        section.classList.remove('hidden');
        contentEl.textContent = content;
    }

    // 复制按钮事件处理
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const content = btn.dataset.content;
            await navigator.clipboard.writeText(content);
            showCopySuccess(btn);
        });
    });

    function showCopySuccess(btn) {
        const defaultMessage = btn.querySelector('#default-message');
        const successMessage = btn.querySelector('#success-message');

        defaultMessage.classList.add('hidden');
        successMessage.classList.remove('hidden');

        // reset to default state
        setTimeout(() => {
            defaultMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
        }, 2000);
    }
});
