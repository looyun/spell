import { t, getCurrentLang, setLanguage } from '../i18n.js';
import imageSizes from '../assets/data/image-sizes.json';

const GAP = 0;
const ROW_HEIGHT = 200;
const DEFAULT_UPLOAD_WIDTH = 200;

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
    Array.from(row.children).forEach(item => {
        width += (parseFloat(item.dataset.width) || item.offsetWidth || DEFAULT_UPLOAD_WIDTH) + GAP;
    });
    return width;
}

function appendImageToShorterRow(itemElement) {
    const row1 = document.getElementById('photoRow1');
    const row2 = document.getElementById('photoRow2');
    if (!row1 || !row2) return;

    const targetRow = getRowWidth(row1) <= getRowWidth(row2) ? row1 : row2;
    targetRow.appendChild(itemElement);
}

function createPhotoItem(width, imgUrl, altText = 'Image') {
    const item = document.createElement('div');
    item.className = 'photo-item shadow-sm cursor-move';
    item.style.width = `${width}px`;
    item.style.height = `${ROW_HEIGHT}px`;
    item.dataset.width = width;
    item.dataset.src = imgUrl;

    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';

    const img = document.createElement('img');
    img.className = 'photo-img';
    img.alt = altText;
    img.loading = 'lazy';
    img.draggable = true;
    img.src = imgUrl;

    img.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/uri-list', imgUrl);
        e.dataTransfer.effectAllowed = 'copy';
    });

    img.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('photowall:image-click', { detail: { url: imgUrl } }));
    });

    item.appendChild(skeleton);
    item.appendChild(img);
    return item;
}

function loadImageIntoItem(item) {
    const img = item.querySelector('.photo-img');
    const skeleton = item.querySelector('.skeleton');
    if (!img) return;

    const onLoad = () => {
        img.classList.add('loaded');
        if (skeleton) skeleton.classList.add('hidden');
    };

    const onError = () => {
        console.error('Failed to load image:', img.src);
        if (skeleton) skeleton.classList.add('hidden');
    };

    if (img.complete && img.naturalWidth > 0) {
        onLoad();
    } else {
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onError, { once: true });
    }
}

export function addToPhotoWall(imgSrc, altText = 'Image') {
    window.uploadedImages = window.uploadedImages || new Set();
    if (window.uploadedImages.has(imgSrc)) return false;
    window.uploadedImages.add(imgSrc);

    const preload = new Image();
    preload.src = imgSrc;
    preload.onload = () => {
        const ratio = preload.naturalWidth / (preload.naturalHeight || 1);
        const width = ratio * ROW_HEIGHT;
        const item = createPhotoItem(width, imgSrc, altText);
        appendImageToShorterRow(item);
        loadImageIntoItem(item);
    };
    preload.onerror = () => {
        console.error('Failed to preload uploaded image:', imgSrc);
    };

    return true;
}

function countBits(x) {
    let count = 0;
    while (x) {
        count += x & 1;
        x >>= 1;
    }
    return count;
}

function distributeImages(images) {
    const n = images.length;
    if (n === 0) return { row1: [], row2: [] };

    const total = images.reduce((sum, img) => sum + img.aspectRatio, 0);
    let bestDiff = Infinity;
    let bestMask = 0;
    const targetCount = n / 2;

    for (let mask = 0; mask < (1 << n); mask++) {
        const c = countBits(mask);
        if (Math.abs(c - targetCount) > 2) continue;

        let sum1 = 0;
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) sum1 += images[i].aspectRatio;
        }
        const diff = Math.abs(total - 2 * sum1);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestMask = mask;
        }
    }

    const row1 = [];
    const row2 = [];
    for (let i = 0; i < n; i++) {
        if (bestMask & (1 << i)) row1.push(images[i]);
        else row2.push(images[i]);
    }

    // 错落有致：一行从大到小，另一行从小到大
    row1.sort((a, b) => b.aspectRatio - a.aspectRatio);
    row2.sort((a, b) => a.aspectRatio - b.aspectRatio);

    return { row1, row2 };
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

        // 阻止拖拽后触发图片上的 click
        wall.addEventListener('click', (e) => {
            if (hasDragged && e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });
    } catch (error) {
        console.error('Photo wall navigation setup failed:', error);
    }
}

export function initPhotoWall() {
    setupPhotoWallNavigation();

    // 延迟到浏览器空闲时加载照片墙，避免阻塞首屏关键路径
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    schedule(async () => {
        try {
            // const imageModules = import.meta.glob('../assets/images/compressed/*.{png,jpg,jpeg}');
            const imageModules = import.meta.glob('../assets/images/webp/*.{png,jpg,jpeg,webp}');
            const entries = Object.entries(imageModules)
                .sort(([a], [b]) => a.localeCompare(b));

            // 分批加载图片模块，避免一次性大量并发请求阻塞网络
            const batchSize = 4;
            const images = [];
            for (let i = 0; i < entries.length; i += batchSize) {
                const batch = entries.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map(async ([path, loader]) => {
                    const module = await loader();
                    const filename = path.split('/').pop();
                    const meta = imageSizes[filename] || imageSizes[filename.replace(/\.webp$/, '.png')] || { width: ROW_HEIGHT, height: ROW_HEIGHT, aspectRatio: 1 };
                    return {
                        url: module.default,
                        filename,
                        aspectRatio: meta.aspectRatio
                    };
                }));
                images.push(...batchResults);

                // 让出主线程，避免阻塞用户交互
                if (i + batchSize < entries.length) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            const { row1, row2 } = distributeImages(images);

            const row1El = document.getElementById('photoRow1');
            const row2El = document.getElementById('photoRow2');
            if (!row1El || !row2El) return;

            // 使用 DocumentFragment 批量插入，减少重排
            const frag1 = document.createDocumentFragment();
            const frag2 = document.createDocumentFragment();

            for (const img of row1) {
                const width = img.aspectRatio * ROW_HEIGHT;
                const item = createPhotoItem(width, img.url, 'Initial image');
                frag1.appendChild(item);
            }
            for (const img of row2) {
                const width = img.aspectRatio * ROW_HEIGHT;
                const item = createPhotoItem(width, img.url, 'Initial image');
                frag2.appendChild(item);
            }

            row1El.appendChild(frag1);
            row2El.appendChild(frag2);

            // 使用 Intersection Observer 懒加载真实图片
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadImageIntoItem(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { root: document.getElementById('photoWallScroller'), rootMargin: '100px' });

            document.querySelectorAll('.photo-item').forEach(item => observer.observe(item));
        } catch (error) {
            console.error('初始化照片墙失败:', error);
        }
    });
}
