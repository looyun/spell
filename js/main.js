import 'tailwindcss/dist/tailwind.css'
import 'remixicon/fonts/remixicon.css'
import 'highlight.js/styles/github.css'
import { t, getCurrentLang, setLanguage } from './i18n.js';

function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 主题切换功能
    const themeToggle = document.getElementById('themeToggle');
    
    function updateTheme(dark) {
        if (dark) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    }

    // 初始化主题状态
    updateTheme(false);

    // 主题切换按钮点击事件
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        updateTheme(!isDark);
    });

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const result = document.getElementById('result');
    const metadata = document.getElementById('metadata');
    const parser = new ImageParser();

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
            reader.onload = function(e) {
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
        const metadataDiv = document.getElementById('metadata');
        metadataDiv.innerHTML = '';

        // 添加生成器信息
        const generatorEl = document.createElement('div');
        generatorEl.innerHTML = `
            <div class="font-medium text-gray-700" data-i18n="generator">${t('generator')}</div>
            <div class="text-gray-600">${metadata.generator}</div>
        `;
        metadataDiv.appendChild(generatorEl);

        // 添加分辨率信息
        if (metadata.dimensions) {
            const dimensionsEl = document.createElement('div');
            dimensionsEl.innerHTML = `
                <div class="font-medium text-gray-700" data-i18n="dimensions">${t('dimensions')}</div>
                <div class="text-gray-600">${metadata.dimensions.width} × ${metadata.dimensions.height}</div>
            `;
            metadataDiv.appendChild(dimensionsEl);
        }

        // Model 信息（保持不变，因为有额外的按钮）
        if (metadata.model) {
            const civitaiLink = `https://civitai.com/search/models?query=${metadata.model}`;
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700" data-i18n="model">${t('model')}</div>
                <div class="flex justify-between items-center">
                    <div class="text-gray-600">${metadata.model}</div>
                    <a href="${civitaiLink}" target="_blank" class="text-blue-500 hover:underline ml-4" data-i18n='findModel'>${t('findModel')}</a>
                </div>
            `;
            metadataDiv.appendChild(paramsEl);
        }

        // 合并 sampler 和 scheduler
        if (metadata.sampler || metadata.scheduler) {
            const samplingEl = document.createElement('div');
            samplingEl.innerHTML = `
                <div class="font-medium text-gray-700" data-i18n="samplingSettings">${t('samplingSettings')}</div>
                <div class="text-gray-600 grid grid-cols-2 gap-4">
                    ${metadata.sampler ? `
                        <div>
                            <span data-i18n="sampler">${t('sampler')}</span>: 
                            <span>${metadata.sampler}</span>
                        </div>` : ''
                    }
                    ${metadata.scheduler ? `
                        <div>
                            <span data-i18n="scheduler">${t('scheduler')}</span>: 
                            <span>${metadata.scheduler}</span>
                        </div>` : ''
                    }
                </div>
            `;
            metadataDiv.appendChild(samplingEl);
        }

        // 合并 steps 和 cfg
        if (metadata.steps || metadata.cfg) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700" data-i18n="generationParams">${t('generationParams')}</div>
                <div class="text-gray-600 grid grid-cols-2 gap-4">
                    ${metadata.cfg ? `<div>CFG: ${metadata.cfg}</div>` : ''}
                    ${metadata.steps ? `
                        <div>
                            <span data-i18n="steps">${t('steps')}</span>: 
                            <span>${metadata.steps}</span>
                        </div>` : ''
                    }
                </div>
            `;
            metadataDiv.appendChild(paramsEl);
        }

        // 添加提示词信息
        if (metadata.positivePrompt) {
            const promptEl = createPromptElement('positivePrompt', metadata.positivePrompt);
            metadataDiv.appendChild(promptEl);
        }

        if (metadata.negativePrompt) {
            const negPromptEl = createPromptElement('negativePrompt', metadata.negativePrompt);
            metadataDiv.appendChild(negPromptEl);
        }

        // 添加参数信息
        if (metadata.parameters && Object.keys(metadata.parameters).length > 0) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700" data-i18n="parameters">参数设置</div>
                <div class="text-gray-600">
                    ${Object.entries(metadata.parameters)
                        .map(([key, value]) => `<div>${key}: ${value}</div>`)
                        .join('')}
                </div>
            `;
            metadataDiv.appendChild(paramsEl);
        }

        // 添加完整 workflow（如果有）
        if (metadata.workflow) {
            const workflowEl = document.createElement('div');
            workflowEl.innerHTML = `
                <div class="font-medium text-gray-700" data-i18n="workflow">完整工作流</div>
                <div class="text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    <pre class="text-sm">${metadata.workflow}</pre>
                </div>
            `;
            metadataDiv.appendChild(workflowEl);
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
});


function createPromptElement(label, content) {

    const promptEl = document.createElement('div');
    promptEl.innerHTML = `
        <div class="prompt-group mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-700" data-i18n="label">${t(label)}</span>
                <button class="copy-btn flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors duration-200" data-content="${content}">
                    <i class="ri-file-copy-line mr-1" data-i18n="copy"></i>
                    ${t('copy')}
                </button>
            </div>
            <p class="text-gray-600 bg-gray-50 p-3 rounded-lg">${content}</p>
        </div>
    `;
    promptEl.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const content = btn.dataset.content;
            await navigator.clipboard.writeText(content);
            
            // 显示复制成功的临时提示
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="ri-check-line mr-1" data-i18n="copied"></i>${t('copied')}`;
            btn.classList.add('bg-green-100', 'text-green-600');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('bg-green-100', 'text-green-600');
            }, 2000);
        });
    });
    return promptEl;
}