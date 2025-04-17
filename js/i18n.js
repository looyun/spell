export const languages = {
    zh: {
        title: '魔法咒语解析',
        subtitle: '轻松提取AI生成图片的元数据信息',
        dropzoneText: '点击上传或将图片拖到页面任意位置',
        dropzoneSubtext: '浏览器本地实现，不会上传到云端',
        globalDropText: '松开鼠标上传图片',
        generator: '生成器',
        dimensions: '图片尺寸',
        model: '模型',
        findModel: '查找模型',
        samplingSettings: '采样设置',
        sampler: '采样器',
        scheduler: '调度器',
        steps: '步数',
        seed: '种子',
        positivePrompt: '正面提示词',
        negativePrompt: '负面提示词',
        parameters: '参数设置',
        workflow: '完整工作流',
        fullMetadata: '完整元数据',
        copy: '复制',
        copied: '已复制',
        firefox_cross_tab_drag_not_supported: 'Firefox不支持跨标签页拖拽文件，请使用文件选择或拖拽本地文件',
        upload_failed: '上传失败'
    },
    en: {
        title: 'AI Image Spell Parser',
        subtitle: 'Extract metadata from AI generated images easily',
        dropzoneText: 'Click or drag image to upload',
        dropzoneSubtext: 'Local browser processing, no cloud upload',
        globalDropText: 'Release to upload image',
        generator: 'Generator',
        dimensions: 'Dimensions',
        model: 'Model',
        findModel: 'Find Model',
        samplingSettings: 'Sampling Settings',
        sampler: 'Sampler',
        scheduler: 'Scheduler',
        steps: 'Steps',
        seed: 'Seed',
        positivePrompt: 'Positive Prompt',
        negativePrompt: 'Negative Prompt',
        parameters: 'Parameters',
        workflow: 'Complete Workflow',
        fullMetadata: 'Full Metadata',
        copy: 'Copy',
        copied: 'Copied',
        firefox_cross_tab_drag_not_supported: 'Firefox does not support cross-tab file dragging, please use file selection or drag local files',
        upload_failed: 'Upload failed'
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