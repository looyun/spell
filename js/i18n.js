export const languages = {
    zh: {
        title: '魔法咒语解析',
        subtitle: '轻松提取AI生成图片的元数据信息(提示词、画师串、画风串)',
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
        upload_failed: '上传失败',
        reportIssues: '报告问题'
    },
    en: {
        title: 'AI Image Spell Parser',
        subtitle: 'Extract metadata(prompts, artist tags, style tags) from AI generated images easily',
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
        upload_failed: 'Upload failed',
        reportIssues: 'Report Issues'
    },
    ja: {
        title: 'AI画像メタデータ解析',
        subtitle: 'AI生成画像からメタデータ(プロンプト、アーティストタグ、スタイルタグ)を簡単に抽出',
        dropzoneText: 'クリックまたはドラッグで画像をアップロード',
        dropzoneSubtext: 'ブラウザ上で処理、クラウドにアップロードされません',
        globalDropText: '画像をアップロード',
        generator: '生成器',
        dimensions: '画像サイズ',
        model: 'モデル',
        findModel: 'モデルを検索',
        samplingSettings: 'サンプリング設定',
        sampler: 'サンプラー',
        scheduler: 'スケジューラー',
        steps: 'ステップ数',
        seed: 'シード',
        positivePrompt: 'ポジティブプロンプト',
        negativePrompt: 'ネガティブプロンプト',
        parameters: 'パラメータ設定',
        workflow: '完全なワークフロー',
        fullMetadata: '完全なメタデータ',
        copy: 'コピー',
        copied: 'コピーしました',
        firefox_cross_tab_drag_not_supported: 'Firefoxではタブ間のファイルドラッグがサポートされていません。ファイル選択またはローカルファイルのドラッグを使用してください',
        upload_failed: 'アップロード失敗',
        reportIssues: '問題を報告'
    },
    ko: {
        title: 'AI 이미지 메타데이터 파서',
        subtitle: 'AI 생성 이미지에서 메타데이터(프롬프트, 아티스트 태그, 스타일 태그)를 쉽게 추출',
        dropzoneText: '클릭 또는 드래그로 이미지 업로드',
        dropzoneSubtext: '브라우저에서 로컬 처리, 클라우드 업로드 없음',
        globalDropText: '이미지 업로드',
        generator: '생성기',
        dimensions: '이미지 크기',
        model: '모델',
        findModel: '모델 찾기',
        samplingSettings: '샘플링 설정',
        sampler: '샘플러',
        scheduler: '스케줄러',
        steps: '스텝 수',
        seed: '시드',
        positivePrompt: '긍정적 프롬프트',
        negativePrompt: '부정적 프롬프트',
        parameters: '파라미터 설정',
        workflow: '전체 워크플로우',
        fullMetadata: '전체 메타데이터',
        copy: '복사',
        copied: '복사됨',
        firefox_cross_tab_drag_not_supported: 'Firefox는 탭 간 파일 드래그를 지원하지 않습니다. 파일 선택 또는 로컬 파일 드래그를 사용하세요',
        upload_failed: '업로드 실패',
        reportIssues: '문제 보고'
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