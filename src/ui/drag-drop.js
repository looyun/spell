import { t } from '../i18n.js';

export function initDragDrop(onFileSelect) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const globalDropZone = document.getElementById('globalDropZone');

    if (dropZone) {
        dropZone.addEventListener('click', () => {
            fileInput?.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                onFileSelect(file);
            }
        });
    }

    if (globalDropZone) {
        globalDropZone.addEventListener('click', () => {
            globalDropZone.classList.remove('active');
        });
    }

    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
        globalDropZone?.classList.add('flex');
        globalDropZone?.classList.remove('hidden');
        globalDropZone?.classList.add('active');
    });

    document.body.addEventListener('dragleave', (e) => {
        if (e.target === document.body || e.target === globalDropZone) {
            globalDropZone?.classList.remove('active');
        }
    });

    document.body.addEventListener('drop', async (e) => {
        e.preventDefault();
        globalDropZone?.classList.remove('active');

        try {
            let file;
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                file = e.dataTransfer.files[0];
            } else if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                const item = e.dataTransfer.items[0];
                if (item.kind === 'file') {
                    file = item.getAsFile();
                }
            }

            if (!file) {
                let url = e.dataTransfer.getData('text/uri-list');
                if (!url) {
                    const html = e.dataTransfer.getData('text/html');
                    const match = html.match(/src=["']([^"']+)["']/);
                    if (match) url = match[1];
                }

                if (url) {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const filename = url.split('/').pop() || 'dropped-image.png';
                    file = new File([blob], filename, { type: blob.type || 'image/png' });
                } else if (navigator.userAgent.toLowerCase().includes('firefox')) {
                    alert(t('firefox_cross_tab_drag_not_supported'));
                    return;
                } else {
                    console.warn('No file found in global drop event', e);
                    return;
                }
            }

            if (!file.type.startsWith('image/')) {
                console.warn('Dropped file is not an image:', file.type);
                return;
            }

            onFileSelect(file);
        } catch (error) {
            console.error('Error handling global drop:', error);
            alert(t('upload_failed'));
        }
    });
}
