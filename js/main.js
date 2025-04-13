import 'tailwindcss/dist/tailwind.css'
import 'remixicon/fonts/remixicon.css'
import 'highlight.js/styles/github.css'

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const result = document.getElementById('result');
    const metadata = document.getElementById('metadata');
    const copyBtn = document.getElementById('copyBtn');
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

    // 复制功能
    copyBtn.addEventListener('click', () => {
        const text = metadata.textContent;
        navigator.clipboard.writeText(text)
            .then(() => alert('信息已复制到剪贴板！'))
            .catch(err => console.error('复制失败:', err));
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
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await processImage(file);
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

        // 添加分辨率信息
        if (metadata.dimensions) {
            const dimensionsEl = document.createElement('div');
            dimensionsEl.innerHTML = `
                <div class="font-medium text-gray-700">图片尺寸</div>
                <div class="text-gray-600">${metadata.dimensions.width} × ${metadata.dimensions.height}</div>
            `;
            metadataDiv.appendChild(dimensionsEl);
        }

        // 添加生成器信息
        const generatorEl = document.createElement('div');
        generatorEl.innerHTML = `
            <div class="font-medium text-gray-700">生成器</div>
            <div class="text-gray-600">${metadata.generator}</div>
        `;
        metadataDiv.appendChild(generatorEl);

        // 添加提示词信息
        if (metadata.positivePrompt) {
            const promptEl = document.createElement('div');
            promptEl.innerHTML = `
                <div class="font-medium text-gray-700">正向提示词</div>
                <div class="text-gray-600 whitespace-pre-wrap">${metadata.positivePrompt}</div>
            `;
            metadataDiv.appendChild(promptEl);
        }

        if (metadata.negativePrompt) {
            const negPromptEl = document.createElement('div');
            negPromptEl.innerHTML = `
                <div class="font-medium text-gray-700">负向提示词</div>
                <div class="text-gray-600 whitespace-pre-wrap">${metadata.negativePrompt}</div>
            `;
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