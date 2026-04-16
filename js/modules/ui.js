import { t, getCurrentLang, setLanguage } from '../i18n.js';

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

export function addToPhotoWall(imgSrc, altText = 'Image') {
    let currentRow = window.currentPhotoRow || 1;

    window.uploadedImages = window.uploadedImages || new Set();
    if (window.uploadedImages.has(imgSrc)) return false;
    window.uploadedImages.add(imgSrc);

    const wallImage = document.createElement('img');
    wallImage.src = imgSrc;
    wallImage.className = 'h-full rounded-none shadow-sm';
    wallImage.alt = altText;
    wallImage.style.objectFit = 'contain';
    wallImage.style.height = '200px';
    wallImage.style.width = 'auto';
    wallImage.style.minWidth = '0';
    wallImage.style.flexShrink = '0';

    wallImage.onload = function() {
        const targetRow = currentRow === 1 ? 'photoRow1' : 'photoRow2';
        document.getElementById(targetRow)?.appendChild(wallImage);
        window.currentPhotoRow = currentRow === 1 ? 2 : 1;
    };

    return true;
}

function setupPhotoWallNavigation() {
    try {
        const container = document.querySelector('.flex.flex-col.overflow-x-auto');
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');

        if (!container || !scrollLeftBtn || !scrollRightBtn) {
            throw new Error('Required DOM elements not found');
        }

        const scrollStep = container.clientWidth * 0.8;

        scrollLeftBtn.addEventListener('click', () => {
            container.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        });

        scrollRightBtn.addEventListener('click', () => {
            container.scrollBy({ left: scrollStep, behavior: 'smooth' });
        });

        const photoRows = container.querySelectorAll('div[id^="photoRow"]');
        photoRows.forEach(row => {
            row.style.display = 'flex';
            row.style.visibility = 'visible';
        });

        const wrapper = container.closest('div[class*="relative"]');
        if (wrapper) {
            wrapper.addEventListener('mouseenter', () => {
                scrollLeftBtn.classList.remove('opacity-0');
                scrollRightBtn.classList.remove('opacity-0');
            });
            wrapper.addEventListener('mouseleave', () => {
                scrollLeftBtn.classList.add('opacity-0');
                scrollRightBtn.classList.add('opacity-0');
            });
        }
    } catch (error) {
        console.error('Photo wall navigation setup failed:', error);
    }
}

export async function initPhotoWall() {
    setupPhotoWallNavigation();
    try {
        const imageModules = import.meta.glob('../../assets/img_ultracompressed/*.{png,jpg,jpeg}');
        const imageFiles = Object.keys(imageModules)
            .map(path => path.replace('../../assets/', 'assets/'))
            .sort((a, b) => a.localeCompare(b));

        window.currentPhotoRow = 1;

        for (const imgPath of imageFiles) {
            try {
                const module = await imageModules[`../../${imgPath}`]();
                const imgUrl = module.default;

                await new Promise((resolve) => {
                    const img = new Image();
                    img.src = imgUrl;
                    img.onload = function() {
                        addToPhotoWall(imgUrl, 'Initial image');
                        resolve();
                    };
                    img.onerror = function() {
                        console.error('Failed to load image:', imgPath);
                        resolve();
                    };
                });
            } catch (error) {
                console.error('Error loading image:', imgPath, error);
            }
        }
    } catch (error) {
        console.error('初始化照片墙失败:', error);
    }
}
