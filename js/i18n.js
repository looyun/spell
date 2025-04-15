export const languages = {
    zh: {
        title: '魔法咒语解析',
        subtitle: '轻松提取AI生成图片的元数据信息',
        dropzoneText: '点击上传或将图片拖到页面任意位置',
        dropzoneSubtext: '浏览器本地实现，不会上传到云端',
        globalDropText: '松开鼠标上传图片',
        previewTitle: '图片预览',
        detailsTitle: '详细信息',
        generator: '生成器',
        dimensions: '图片尺寸',
        model: '模型',
        findModel: '查找模型',
        samplingSettings: '采样设置',
        sampler: '采样器',
        scheduler: '调度器',
        generationParams: '生成参数',
        steps: '步数',
        positivePrompt: '正面提示词',
        negativePrompt: '负面提示词',
        parameters: '参数设置',
        workflow: '完整工作流',
        fullMetadata: '完整元数据',
        copy: '复制',
        copied: '已复制'
    },
    en: {
        title: 'AI Image Spell Parser',
        subtitle: 'Extract metadata from AI generated images easily',
        dropzoneText: 'Click or drag image to upload',
        dropzoneSubtext: 'Local browser processing, no cloud upload',
        globalDropText: 'Release to upload image',
        previewTitle: 'Preview',
        detailsTitle: 'Details',
        generator: 'Generator',
        dimensions: 'Dimensions',
        model: 'Model',
        findModel: 'Find Model',
        samplingSettings: 'Sampling Settings',
        sampler: 'Sampler',
        scheduler: 'Scheduler',
        generationParams: 'Generation Parameters',
        steps: 'Steps',
        positivePrompt: 'Positive Prompt',
        negativePrompt: 'Negative Prompt',
        parameters: 'Parameters',
        workflow: 'Complete Workflow',
        fullMetadata: 'Full Metadata',
        copy: 'Copy',
        copied: 'Copied'
    }
};

export const defaultLang = 'zh';

export function getCurrentLang() {
    return localStorage.getItem('language') || defaultLang;
}

export function setLanguage(lang) {
    localStorage.setItem('language', lang);
}

export function t(key) {
    const currentLang = getCurrentLang();
    return languages[currentLang][key] || languages[defaultLang][key] || key;
}