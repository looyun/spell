import 'tailwindcss/dist/tailwind.css'
import 'remixicon/fonts/remixicon.css'
import 'highlight.js/styles/github.css'

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const result = document.getElementById('result');
    const metadata = document.getElementById('metadata');
    const parser = new ImageParser();

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
            handleFile(file);
            const parser = new ImageParser();
            const metadata = await parser.parse(file);
            console.log('解析结果:', metadata);
            // 添加这行来显示解析结果
            displayMetadata(metadata);
        } catch (error) {
            console.error('处理图片失败:', error);
            alert(error.message);
        }
    }

    function handleFile(file) {
        // 添加图片预览
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewImage = document.getElementById('previewImage');
            previewImage.src = e.target.result;
        }
        reader.readAsDataURL(file);
        
        // 显示结果区域
        document.getElementById('result').classList.remove('hidden');
        
        // 继续处理元数据...
    }

    function displayMetadata(metadata) {
        const metadataDiv = document.getElementById('metadata');
        metadataDiv.innerHTML = '';

        // 添加生成器信息
        const generatorEl = document.createElement('div');
        generatorEl.innerHTML = `
            <div class="font-medium text-gray-700">生成器</div>
            <div class="text-gray-600">${metadata.generator}</div>
        `;
        metadataDiv.appendChild(generatorEl);

        // 添加分辨率信息
        if (metadata.dimensions) {
            const dimensionsEl = document.createElement('div');
            dimensionsEl.innerHTML = `
                <div class="font-medium text-gray-700">图片尺寸</div>
                <div class="text-gray-600">${metadata.dimensions.width} × ${metadata.dimensions.height}</div>
            `;
            metadataDiv.appendChild(dimensionsEl);
        }

        // 添加参数信息
        if (metadata.model) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700">model</div>
                <div class="text-gray-600">${metadata.model}</div>
            `;
            metadataDiv.appendChild(paramsEl);
        }
        
        if (metadata.sampler) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700">sampler</div>
                <div class="text-gray-600">${metadata.sampler}</div>
            `;
            metadataDiv.appendChild(paramsEl);
        }
        if (metadata.scheduler) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700">scheduler</div>
                <div class="text-gray-600">${metadata.scheduler}</div>
            `;
            metadataDiv.appendChild(paramsEl);
        }
        if (metadata.cfg) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700">cfg</div>
                <div class="text-gray-600">${metadata.cfg}</div>
            `;
            metadataDiv.appendChild(paramsEl);
        }
        if (metadata.steps) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700">steps</div>
                <div class="text-gray-600">${metadata.steps}</div>
            `;
            metadataDiv.appendChild(paramsEl);
        }

        // 添加提示词信息
        if (metadata.positivePrompt) {
            const promptEl = createPromptElement('正面提示词', metadata.positivePrompt);
            metadataDiv.appendChild(promptEl);
        }

        if (metadata.negativePrompt) {
            const negPromptEl = createPromptElement('负面提示词', metadata.negativePrompt);
            metadataDiv.appendChild(negPromptEl);
        }

        // 添加参数信息
        if (metadata.parameters && Object.keys(metadata.parameters).length > 0) {
            const paramsEl = document.createElement('div');
            paramsEl.innerHTML = `
                <div class="font-medium text-gray-700">参数设置</div>
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
                <div class="font-medium text-gray-700">完整工作流</div>
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

        // JSON 显示切换 - 简化版本
        const toggleJsonBtn = document.getElementById('toggleJson');
        const jsonViewer = document.getElementById('jsonViewer');
        
        toggleJsonBtn.removeEventListener('click', toggleJson);
        toggleJsonBtn.addEventListener('click', toggleJson);
        
        function toggleJson() {
            if (jsonViewer.classList.contains('hidden')) {
                jsonViewer.classList.remove('hidden');
            } else {
                jsonViewer.classList.add('hidden');
            }
        }

        // 显示结果区域
        document.getElementById('result').classList.remove('hidden');
    }
});


function createPromptElement(label, content) {

    const promptEl = document.createElement('div');
    promptEl.innerHTML = `
        <div class="prompt-group mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-700">${label}</span>
                <button class="copy-btn flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors duration-200" data-content="${content}">
                    <i class="ri-file-copy-line mr-1"></i>
                    复制
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
            btn.innerHTML = '<i class="ri-check-line mr-1"></i>已复制';
            btn.classList.add('bg-green-100', 'text-green-600');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('bg-green-100', 'text-green-600');
            }, 2000);
        });
    });
    return promptEl;
}