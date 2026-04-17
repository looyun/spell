import { t, getCurrentLang, setLanguage } from '../i18n.js';

const GAP = 0;
const ROW_HEIGHT = 200;

export function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

export function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

export function initLanguage() {
    const langSelect = document.getElementById('langSelect');
    if (!langSelect) return;

    langSelect.value = getCurrentLang();
    langSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
        updateI18n();
    });
}

export function initJsonToggle() {
    const jsonToggle = document.getElementById('jsonToggle');
    const jsonViewer = document.getElementById('jsonViewer');
    const resultDiv = document.getElementById('result');
    const scrollToTopBtn = document.getElementById('scrollToTop');

    if (!jsonToggle || !jsonViewer) return;

    const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isDevMode) {
        jsonToggle.classList.add('collapsed');
        jsonViewer.classList.add('collapsed');
    }

    jsonToggle.addEventListener('click', () => {
        const isCollapsed = !jsonToggle.classList.contains('collapsed');
        jsonToggle.classList.toggle('collapsed');
        jsonViewer.classList.toggle('collapsed');

        if (isCollapsed) {
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            scrollToTopBtn?.classList.remove('visible');
            scrollToTopBtn?.classList.add('hidden');
        } else {
            jsonToggle.scrollIntoView({ behavior: 'smooth', block: 'start' });
            scrollToTopBtn?.classList.add('visible');
            scrollToTopBtn?.classList.remove('hidden');
        }
    });
}

export function initScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    const resultDiv = document.getElementById('result');
    if (!scrollToTopBtn || !resultDiv) return;

    scrollToTopBtn.addEventListener('click', () => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function getRowWidth(row) {
    let width = 0;
    Array.from(row.children).forEach(img => {
        const ratio = img.naturalWidth / (img.naturalHeight || 1);
        width += ratio * ROW_HEIGHT + GAP;
    });
    return width;
}

function appendImageToShorterRow(imgElement) {
    const row1 = document.getElementById('photoRow1');
    const row2 = document.getElementById('photoRow2');
    if (!row1 || !row2) return;

    const targetRow = getRowWidth(row1) <= getRowWidth(row2) ? row1 : row2;
    targetRow.appendChild(imgElement);
}

export function addToPhotoWall(imgSrc, altText = 'Image') {
    window.uploadedImages = window.uploadedImages || new Set();
    if (window.uploadedImages.has(imgSrc)) return false;
    window.uploadedImages.add(imgSrc);

    const preloader = new Image();
    preloader.src = imgSrc;
    preloader.onload = () => {
        const wallImage = document.createElement('img');
        wallImage.src = imgSrc;
        wallImage.alt = altText;
        wallImage.loading = 'lazy';
        wallImage.draggable = true;
        wallImage.className = 'h-full shadow-sm opacity-0 transition-opacity duration-500 ease-out cursor-move';
        wallImage.style.objectFit = 'contain';
        wallImage.style.height = `${ROW_HEIGHT}px`;
        wallImage.style.width = 'auto';
        wallImage.style.minWidth = '0';
        wallImage.style.flexShrink = '0';

        wallImage.onload = () => wallImage.classList.remove('opacity-0');

        wallImage.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/uri-list', imgSrc);
            e.dataTransfer.effectAllowed = 'copy';
        });

        wallImage.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('photowall:image-click', { detail: { url: imgSrc } }));
        });

        appendImageToShorterRow(wallImage);
    };

    return true;
}

function setupPhotoWallNavigation() {
    try {
        const scroller = document.getElementById('photoWallScroller');
        const wall = document.getElementById('photoWall');
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');

        if (!scroller || !scrollLeftBtn || !scrollRightBtn || !wall) {
            throw new Error('Required DOM elements not found');
        }

        const scrollStep = scroller.clientWidth * 0.8;

        scrollLeftBtn.addEventListener('click', () => {
            scroller.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        });

        scrollRightBtn.addEventListener('click', () => {
            scroller.scrollBy({ left: scrollStep, behavior: 'smooth' });
        });

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let hasDragged = false;

        wall.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'IMG') return;
            isDown = true;
            hasDragged = false;
            startX = e.clientX;
            scrollLeft = scroller.scrollLeft;
            wall.style.cursor = 'grabbing';
            scroller.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            wall.style.cursor = '';
            scroller.style.cursor = '';
        });

        wall.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 3) hasDragged = true;
            scroller.scrollLeft = scrollLeft - dx * 1.2;
        });

        wall.addEventListener('mouseleave', () => {
            isDown = false;
            wall.style.cursor = '';
            scroller.style.cursor = '';
        });

        // 阻止拖拽后触发图片上的 click（如有）
        wall.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', (e) => {
                if (hasDragged) e.preventDefault();
            });
        });
    } catch (error) {
        console.error('Photo wall navigation setup failed:', error);
    }
}

export async function initPhotoWall() {
    setupPhotoWallNavigation();
    try {
        const imageModules = import.meta.glob('../assets/images/compressed/*.{png,jpg,jpeg}');
        const entries = Object.entries(imageModules)
            .sort(([a], [b]) => a.localeCompare(b));

        window.currentPhotoRow = 1;

        // 并行预加载获取尺寸
        const images = await Promise.all(
            entries.map(async ([path, loader]) => {
                try {
                    const module = await loader();
                    const imgUrl = module.default;
                    return await new Promise((resolve) => {
                        const img = new Image();
                        img.src = imgUrl;
                        img.onload = () => resolve({ url: imgUrl, width: img.width, height: img.height });
                        img.onerror = () => {
                            console.error('Failed to load image:', path);
                            resolve(null);
                        };
                    });
                } catch (error) {
                    console.error('Error loading image:', path, error);
                    return null;
                }
            })
        );

        const validImages = images.filter(img => img !== null);

        validImages.forEach(({ url }) => {
            const wallImage = document.createElement('img');
            wallImage.src = url;
            wallImage.alt = 'Initial image';
            wallImage.loading = 'lazy';
            wallImage.draggable = true;
        wallImage.className = 'h-full shadow-sm opacity-0 transition-opacity duration-500 ease-out cursor-move';
            wallImage.style.objectFit = 'contain';
            wallImage.style.height = `${ROW_HEIGHT}px`;
            wallImage.style.width = 'auto';
            wallImage.style.minWidth = '0';
            wallImage.style.flexShrink = '0';

            wallImage.onload = () => wallImage.classList.remove('opacity-0');

            wallImage.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/uri-list', url);
                e.dataTransfer.effectAllowed = 'copy';
            });

            wallImage.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('photowall:image-click', { detail: { url } }));
            });

            appendImageToShorterRow(wallImage);
        });
    } catch (error) {
        console.error('初始化照片墙失败:', error);
    }
}
