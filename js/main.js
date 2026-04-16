import hljs from 'highlight.js';
import ImageParser from './parser.js';
import { globalMatchers } from './matchers.js';
import {
    updateI18n,
    initTheme,
    initLanguage,
    initJsonToggle,
    initScrollToTop,
    initPhotoWall
} from './modules/ui.js';
import { initDragDrop } from './modules/dragDrop.js';
import { handleFile, displayMetadata, initCopyButtons } from './modules/display.js';

window.hljs = hljs;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLanguage();
    updateI18n();
    initJsonToggle();
    initScrollToTop();
    initCopyButtons();
    initDragDrop(processImage);

    try {
        await globalMatchers.initialize();
    } catch (error) {
        console.error('初始化失败:', error);
    }

    initPhotoWall();
});

async function processImage(file) {
    try {
        await handleFile(file);
        const parser = new ImageParser();
        const metadata = await parser.parse(file);
        console.log('解析结果:', metadata);
        if (!metadata) {
            throw new Error('解析失败，请检查图片格式或内容');
        }
        displayMetadata(metadata, globalMatchers);
    } catch (error) {
        console.error('处理图片失败:', error);
        alert(error.message);
    }
}
