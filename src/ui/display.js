import { t } from '../i18n.js';
import { addToPhotoWall } from './components.js';

export function initCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const content = btn.dataset.content;
            if (content) {
                await navigator.clipboard.writeText(content);
                showCopySuccess(btn);
            }
        });
    });
}

export async function handleFile(file) {
    const resultDiv = document.getElementById('result');
    if (resultDiv?.classList.contains('hidden')) {
        resultDiv.classList.remove('hidden');
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = e.target.result;
                addToPhotoWall(e.target.result, 'Uploaded image');
                previewImage.onload = () => {
                    resultDiv?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    resolve();
                };
                previewImage.onerror = () => resolve();
            } else {
                resolve();
            }
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
    });
}

export function displayMetadata(metadata, matchers) {
    updateSection('generator', metadata.generator);

    if (metadata.dimensions) {
        updateSection('dimensions', `${metadata.dimensions.width} × ${metadata.dimensions.height}`);
    } else {
        document.getElementById('dimensions-section')?.classList.add('hidden');
    }

    if (metadata.model) {
        updateSection('model', metadata.model);
        let keyword = metadata.model.trim().split('.')[0];
        keyword = keyword.replace(/([vV])([0-9])/g, ' $1$2');
        keyword = keyword.replace(/([a-z])([A-Z])/g, '$1 $2');
        keyword = keyword.replace(/_/g, ' ');
        const modelLink = document.getElementById('model-link');
        if (modelLink) {
            modelLink.href = `https://civitai.com/search/models?modelType=Checkpoint&query=${encodeURIComponent(keyword)}`;
        }
    } else {
        document.getElementById('model-section')?.classList.add('hidden');
    }

    if (metadata.sampler || metadata.scheduler) {
        if (metadata.sampler) {
            document.getElementById('sampler-content')?.classList.remove('hidden');
            document.getElementById('sampler-value').textContent = metadata.sampler;
        } else {
            document.getElementById('sampler-content')?.classList.add('hidden');
        }

        if (metadata.scheduler) {
            document.getElementById('scheduler-content')?.classList.remove('hidden');
            document.getElementById('scheduler-value').textContent = metadata.scheduler;
        } else {
            document.getElementById('scheduler-content')?.classList.add('hidden');
        }
    }

    if (metadata.seed || metadata.steps || metadata.cfg) {
        document.getElementById('generation-section')?.classList.remove('hidden');
        if (metadata.cfg) {
            document.getElementById('cfg-content')?.classList.remove('hidden');
            document.getElementById('cfg-value').textContent = metadata.cfg;
        } else {
            document.getElementById('cfg-content')?.classList.add('hidden');
        }
        if (metadata.steps) {
            document.getElementById('steps-content')?.classList.remove('hidden');
            document.getElementById('steps-value').textContent = metadata.steps;
        } else {
            document.getElementById('steps-content')?.classList.add('hidden');
        }
        if (metadata.seed) {
            document.getElementById('seed-content')?.classList.remove('hidden');
            document.getElementById('seed-value').textContent = metadata.seed;
        } else {
            document.getElementById('seed-content')?.classList.add('hidden');
        }
    } else {
        document.getElementById('generation-section')?.classList.add('hidden');
    }

    if (metadata.positivePrompt) {
        document.getElementById('prompt-section')?.classList.remove('hidden');
        const promptContainer = document.getElementById('prompt-content');
        let highlightedText = metadata.positivePrompt;

        metadata.charaterMatches?.forEach(match => {
            const escapedWord = match.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026');
            const regex = new RegExp(`(?<!\\w)${escapedWord}(?!\\w)`, 'gi');
            highlightedText = highlightedText.replace(regex, m =>
                `<span class="highlight-character">${m}</span>`
            );
        });

        metadata.artistMatches?.forEach(match => {
            const escapedWord = match.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026');
            const regex = new RegExp(`(?<!\\w)${escapedWord}(?!\\w)`, 'gi');
            highlightedText = highlightedText.replace(regex, m =>
                `<span class="highlight-artist">${m}</span>`
            );
        });

        if (promptContainer) {
            promptContainer.innerHTML = highlightedText;
        }

        const copyPromptBtn = document.getElementById('copy-prompt');
        if (copyPromptBtn) {
            copyPromptBtn.dataset.content = metadata.positivePrompt;
        }
    } else {
        document.getElementById('prompt-section')?.classList.add('hidden');
    }

    if (metadata.negativePrompt) {
        document.getElementById('negative-prompt-section')?.classList.remove('hidden');
        const negContent = document.getElementById('negative-prompt-content');
        if (negContent) {
            negContent.textContent = metadata.negativePrompt;
        }
        const copyNegBtn = document.getElementById('copy-negative-prompt');
        if (copyNegBtn) {
            copyNegBtn.dataset.content = metadata.negativePrompt;
        }
    } else {
        document.getElementById('negative-prompt-section')?.classList.add('hidden');
    }

    const jsonContent = document.getElementById('jsonContent');
    if (jsonContent) {
        jsonContent.textContent = JSON.stringify(metadata.rawTags, null, 2);
        jsonContent.classList.add('whitespace-pre');
    }
}

function updateSection(id, content) {
    const section = document.getElementById(`${id}-section`);
    const contentEl = document.getElementById(`${id}-content`);

    if (section) section.classList.remove('hidden');
    if (contentEl) contentEl.textContent = content;
}

function showCopySuccess(btn) {
    const defaultMessage = btn.querySelector('#default-message');
    const successMessage = btn.querySelector('#success-message');

    if (defaultMessage) defaultMessage.classList.add('hidden');
    if (successMessage) successMessage.classList.remove('hidden');

    setTimeout(() => {
        if (defaultMessage) defaultMessage.classList.remove('hidden');
        if (successMessage) successMessage.classList.add('hidden');
    }, 2000);
}
