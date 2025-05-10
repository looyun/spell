import ExifReader from 'exifreader';
import { globalMatchers } from './matchers.js';

class ImageParser {
    async parse(file) {
        var exif = null;
        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('请上传图片文件');
            }

            exif = await ExifReader.load(file);
            console.log('解析到的EXIF:', exif);
        } catch (error) {
            console.error('解析失败:', error);
            // 即使解析失败，也尝试返回原始数据
            return
        }

        const rawMetadata = {};
        // 转换ExifReader标签为普通对象
        for (const [key, value] of Object.entries(exif)) {
            if (value && typeof value === 'object') {
                rawMetadata[key] = value;
            }
        }

        try {
            // 获取图片分辨率
            const dimensions = await this.getImageDimensions(file);

            // 检测生成工具类型
            const generator = this.detectGenerator(exif);
            console.log('检测到的生成器:', generator);

            // 根据不同工具解析元数据
            let metadata;
            switch (generator) {
                case 'NovelAI':
                    metadata = this.parseNovelAI(exif);
                    break;
                case 'ComfyUI':
                    metadata = this.parseComfyUI(exif);
                    break;
                case 'Stable Diffusion':
                    metadata = this.parseStableDiffusion(exif);
                    break;
                case 'Midjourney':
                    metadata = this.parseMidjourney(exif);
                    break;
                case 'Illustrious XL':
                    metadata = this.parseIllustriousXL(exif);
                    break;
                default:
                    metadata = this.parseGeneric(exif);
            }

            return {
                generator,
                dimensions,
                ...metadata,
                rawTags: rawMetadata // 添加原始标签数据
            };
        } catch (error) {
            console.error('解析失败:', error);
            // 即使解析失败，也尝试返回原始数据
            return {
                error: error.message,
                rawTags: rawMetadata
            };
        }
    }

    // 新增：获取图片尺寸
    getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => {
                reject(new Error('无法获取图片尺寸'));
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    detectGenerator(exif) {
        // Midjourney 特征
        if (exif.Software?.value?.includes('Midjourney') ||
            exif.Description?.value?.includes('--') ||
            exif.UserComment?.value?.includes('--')) {
            return 'Midjourney';
        }

        // ComfyUI 特征: 包含 prompt 和 workflow
        if (exif.prompt || exif.workflow || exif.generation_data) {
            return 'ComfyUI';
        }

        // NovelAI 特征
        if (exif.Software?.value == "NovelAI") {
            return 'NovelAI';
        }

        // Stable Diffusion 特征: 包含 parameters
        if (exif.generate_info?.value) {
            return 'Illustrious XL';
        }

        // Stable Diffusion 特征: 包含 parameters
        if (exif.parameters?.value) {
            return 'Stable Diffusion';
        }

        return 'Unknown';
    }

    // "{\"checkpoint\": \"Illustrious-XL-v3.0-EPS-stable.safetensors\", \"prompt\": \"A split-color cat with striking green and yellow eyes, peeks out from below a wooden fence, its detailed eyes full of curiosity. The cat's fur is a beautiful blend of white and black, with whiskers twitching slightly as it observes the viewer. Sunlight filters through the trees and plants, casting gentle sun rays and light rays across the scene, creating a serene and picturesque atmosphere. The background is lush with greenery, bushes, and trees, all rendered in anime coloring style. The overall composition is a masterpiece of amazing quality, capturing the essence of a tranquil, sunlit day in a beautifully detailed and vibrant scenery, anime coloring\", \"negativePrompt\": \"worst quality, bad quality, low quality, 3d, light particles, lowres, anatomical nonsense, artistic error, bad anatomy,watermark\", \"width\": 1664, \"height\": 2432, \"seed\": 3445848, \"steps\": 30, \"cfgScale\": 7.5, \"samplerName\": \"euler_ancestral\", \"scheduler\": \"normal\", \"type\": \"AI Generated Image\"}"
    parseIllustriousXL(exif) {
        try {
            const params = JSON.parse(exif.generate_info?.value || '{}');
            console.log('Illustrious-XL 图片信息:', params);

            return {
                model: params.checkpoint || 'Unknown',
                cfg: params.cfgScale || '',
                steps: params.steps || '',
                seed: params.seed || '',
                sampler: params.samplerName || '',
                scheduler: params.scheduler || '',
                positivePrompt: params.prompt || '',
                artistMatches: globalMatchers.artistMatcher.findMatches(params.prompt),
                charaterMatches: globalMatchers.characterMatcher.findMatches(params.prompt),
                negativePrompt: params.negativePrompt || '',
            };
        } catch (error) {
            console.error('解析Illustrious-XL失败:', error);
            return '{}';
        }
    }

    parseNovelAI(exif) {
        try {
            const params = JSON.parse(exif.Comment?.value || '{}');
            console.log('NovelAI 图片信息:', params);

            return {
                model: exif.Source?.value || 'Unknown',
                cfg: params.scale || '',
                steps: params.steps || '',
                seed: params.seed || '',
                sampler: params.sampler || '',
                scheduler: params.noise_schedule || '',
                positivePrompt: params.prompt || '',
                artistMatches: globalMatchers.artistMatcher.findMatches(params.prompt),
                charaterMatches: globalMatchers.characterMatcher.findMatches(params.prompt),
                negativePrompt: params.uc || '',
            };
        } catch (error) {
            console.error('解析NovelAI失败:', error);
            return '{}';
        }
    }

    // 修改 parseComfyUI 方法以保存完整 workflow
    parseComfyUI(exif) {

        try {
            var data = null;
            // parse generation_data
            if (!data && exif.generation_data) {
                data = this.parseComfyUIGenerationData(exif);
            }
            // parse prompt
            if (!data && exif.prompt) {
                data = this.parseComfyUIPrompts(exif);
            }
            // parse workflow
            if (!data && exif.workflow) {
                data = this.parseComfyUIWorkflow(exif);
            }
            return data;
        } catch (error) {
            console.error('解析ComfyUI参数失败:', error);
            return this.parseGeneric(exif);
        }
    }

    // parse generation_data
    // "generation_data": {
    // "value": "{\"models\":[{\"label\":\"v1\",\"type\":\"LORA\",\"modelId\":\"768486055772084310\",\"modelFileId\":\"768486077245872243\",\"weight\":0.8,\"modelFileName\":\"08f3d7ea-3f73-4b1a-a385-8fb23b3628b6.by_tusi\",\"baseModel\":\"FLUX.1\",\"hash\":\"E0BF2C7F56FE663E054DDD64EB138D65C7F38ADE3BC1A2A980E5002EECB4341D\"},{\"label\":\"109Epoch\",\"type\":\"LORA\",\"modelId\":\"766575899131862285\",\"modelFileId\":\"766575899130813710\",\"weight\":0.3,\"modelFileName\":\"YJ-000109\",\"baseModel\":\"FLUX.1\",\"hash\":\"C15FCA0EAC9B3003D1D38403427108F425DB987313A2950EEC1DF6462DAEE112\"}],\"prompt\":\"depth of field, cowboy shot, (dynamic angle:0.8), (Inception_(film)), solo, girl standing, (playing instrument), (cello), looking down, original, (from side:0.7), (medium chest), white hair, long hair, blunt bangs, hairclip, closed eyes, white pleated dress, long dress, short sleeves, sailor collar, nature, outdoors, lush environment, background filled with dense green foliage, hedge, white flower, lily_(flower) surround, leaves, glowing white butterfly, dapped sunlight, handsome, \",\"width\":1344,\"height\":2048,\"imageCount\":2,\"samplerName\":\"DPM++ 2M SDE Karras\",\"steps\":20,\"cfgScale\":5.5,\"seed\":\"-1\",\"clipSkip\":2,\"baseModel\":{\"label\":\"V4.0\",\"type\":\"BASE_MODEL\",\"modelId\":\"788819169685673178\",\"modelFileId\":\"788819169684624603\",\"modelFileName\":\"FLUX-Anime_v4.0\",\"baseModel\":\"FLUX.1\",\"hash\":\"D85DC0CF4A22CB446A20E0DA3D6748F1DA4282A10811EC9C854AAE911C253B98\"},\"sdVae\":\"Automatic\",\"etaNoiseSeedDelta\":31337,\"sdxl\":{},\"ksamplerName\":\"dpmpp_2m_sde_gpu\",\"schedule\":\"karras\",\"guidance\":5.5}\u0000",
    parseComfyUIGenerationData(exif) {
        try {
            // fix \u0000 问题
            if (exif.generation_data?.value) {
                exif.generation_data.value = exif.generation_data.value.replace(/\u0000/g, '');
            }
            const data = JSON.parse(exif.generation_data?.value || '{}');
            console.log('解析到的Comfy UI generation_data:', data);
            const positivePrompt = data.prompt || '';
            const negativePrompt = data.uc || '';

            return {
                model: data.baseModel?.modelFileName || 'Unknown',
                cfg: data.cfgScale || '',
                steps: data.steps || '',
                seed: data.seed || '',
                sampler: data.ksamplerName || data.samplerName || '',
                scheduler: data.schedule || '',
                positivePrompt: positivePrompt,
                negativePrompt: negativePrompt,
                artistMatches: globalMatchers.artistMatcher.findMatches(positivePrompt),
                charaterMatches: globalMatchers.characterMatcher.findMatches(positivePrompt),
            };
        } catch (error) {
            console.error('解析ComfyUI参数失败:', error);
            return '{}';
        }
    }

    parseComfyUIPrompts(exif) {

        try {

            // 修复NaN问题
            if (exif.prompt?.value) {
                exif.prompt.value = exif.prompt.value.replace(/NaN/g, '0');
            }
            const data = JSON.parse(exif.prompt?.value || '{}');
            console.log('解析到的ComfyUI prompt:', data);


            // 处理不同节点类型
            var samplerInput = null;
            var schedulerInput = null;
            var checkPointInput = null;
            var unetInput = null;
            var positivePromptInput = null;
            var negativePromptInput = null;

            // SamplerCustomAdvanced = sampler + sigmas(scheduler) + guider(prompt)

            // samplerNodeType: KSampler (Efficient)| KSamplerSelect|BasicScheduler|KSampler
            // checkPointNodeType: easy a1111Loader | CheckpointLoaderSimple|
            // unetNodeType: UNETLoader
            // positivePromptNodeType: WeiLinComfyUIPromptAllInOneGreat | CLIPTextEncode| smZ CLIPTextEncode
            // negativePromptNodeType: WeiLinComfyUIPromptAllInOneNeg | CLIPTextEncode| smZ CLIPTextEncode
            for (const key in data) {
                if (data[key]?.inputs) {
                    if (data[key].class_type === 'KSampler' || data[key].class_type === 'KSampler (Efficient)' || data[key].class_type === 'BasicScheduler') {
                        if (samplerInput == null && data[key].inputs.sampler_name) {
                            samplerInput = data[key].inputs;
                        }
                        if (schedulerInput == null && data[key].inputs.scheduler) {
                            schedulerInput = data[key].inputs;
                        }
                    } else if (data[key].class_type === 'SamplerCustomAdvanced') {
                        if (samplerInput == null) {
                            samplerInput = data[data[key].inputs.sampler[0]].inputs;
                        }
                        if (schedulerInput == null) {
                            schedulerInput = data[data[key].inputs.sigmas[0]].inputs;
                        }
                        if (positivePromptInput == null) {
                            positivePromptInput = this.getPromptNode(data[data[key].inputs.guider[0]], data).inputs;
                        }

                    } else if (data[key].class_type === 'CheckpointLoaderSimple' || data[key].class_type === 'easy a1111Loader') {
                        checkPointInput = data[key].inputs;
                    } else if (data[key].class_type === 'UNETLoader') {
                        unetInput = data[key].inputs;
                    } else if (data[key].class_type === 'WeiLinComfyUIPromptAllInOneGreat') {
                        positivePromptInput = data[key].inputs;
                    } else if (data[key].class_type === 'WeiLinComfyUIPromptAllInOneNeg') {
                        negativePromptInput = data[key].inputs;
                    }
                }
            }
            // 从checkpoint或者unet节点中根据inputs.positive数组或者inputs.negative数组获取正向和负向提示
            if (positivePromptInput == null && samplerInput && samplerInput.positive) {
                const promptNode = this.getPromptNode(data[samplerInput.positive[0]], data)
                if (promptNode) {
                    positivePromptInput = promptNode.inputs;
                }
                const negativePromptNode = this.getPromptNode(data[samplerInput.negative[0]], data)
                if (negativePromptNode) {
                    negativePromptInput = negativePromptNode.inputs;
                }
            }
            const positivePrompt = positivePromptInput?.text || positivePromptInput?.positive || positivePromptInput?.tags || '';
            const negativePrompt = negativePromptInput?.text || negativePromptInput?.positive || negativePromptInput?.tags || '';
            return {
                model: checkPointInput?.ckpt_name || unetInput?.unet_name || 'Unknown',
                cfg: samplerInput?.cfg || '',
                steps: schedulerInput?.steps || '',
                seed: samplerInput?.seed || '',
                sampler: samplerInput?.sampler_name || '',
                scheduler: schedulerInput?.scheduler || '',
                positivePrompt: positivePrompt,
                negativePrompt: negativePrompt,
                artistMatches: globalMatchers.artistMatcher.findMatches(positivePrompt),
                charaterMatches: globalMatchers.characterMatcher.findMatches(positivePrompt),
            };
        } catch (error) {
            console.error('解析ComfyUI参数失败:', error);
            return '{}';
        }
    }

    // 递归获取prompt
    getPromptNode(node, datas) {
        console.log(node.class_type);
        if (node.class_type === 'CLIPTextEncode' || node.class_type === 'smZ CLIPTextEncode') {
            // 判断text是不是字符串
            if (typeof node.inputs?.text === 'string') {
                return node
            }
            // 判断text是不是数组
            if (Array.isArray(node.inputs?.text)) {
                return this.getPromptNode(datas[node.inputs?.text[0]], datas)
            }
        }
        if (node.inputs?.conditioning) {
            const key = node.inputs.conditioning[0]
            return this.getPromptNode(datas[key], datas)
        }
        return node
    }

    parseComfyUIWorkflow(exif) {

        try {
            const data = parseWorkflow(exif?.workflow.value || '{}');
            return data;
        } catch {
            return '{}';
        }
    }

    // 修改 parseStableDiffusion 方法以包含完整参数字符串
    parseStableDiffusion(exif) {
        // Stable Diffusion 通常在 parameters 中存储信息
        const params = exif.parameters?.value || '';
        if (!params) {
            return {};
        }

        if (params.includes("negative_prompt")) {

            try {
                return {
                    model: 'Stable Diffusion',
                    ...this.parseJsonParameters(params),
                    rawParameters: params // 保存完整的参数字符串
                };
            } catch {
                return '{}';
            }
        }

        // 解析常见的 SD 格式
        const positivePrompt = params.split('Negative prompt:')[0].trim();
        const negativePrompt = params.split('Negative prompt:')[1]?.split('Steps:')[0]?.trim() || '';

        return {
            model: 'Stable Diffusion',
            positivePrompt,
            negativePrompt,
            ...this.extractSDParameters(params),
            rawParameters: params // 保存完整的参数字符串
        };
    }

    extractSDParameters(params) {
        const result = {};

        // 提取常见参数
        const patterns = {
            'steps': /Steps: (\d+)/,
            'sampler': /Sampler: ([^,]+)/,
            'cfg': /CFG scale: (\d+\.?\d*)/,
            'seed': /Seed: (\d+)/,
            'size': /Size: (\d+x\d+)/,
            'scheduler': /Schedule type: (\w+)/,
            'model': /Model: ([^,]+)/,
        };

        for (const [key, pattern] of Object.entries(patterns)) {
            const match = params.match(pattern);
            if (match) {
                result[key] = match[1];
            }
        }

        return result;
    }

    parseJsonParameters(paramString) {

        try {
            const data = JSON.parse(paramString || '{}');
            return {
                model: data['Model'] || 'Unknown',
                cfg: data['guidance_scale'] || '',
                steps: data['num_inference_steps'] || '',
                seed: data['seed'] || '',
                sampler: data['sampler'] || '',
                scheduler: data['scheduler'] || '',
                positivePrompt: data['prompt'] || '',
                negativePrompt: data['negative_prompt'] || '',
            };
        } catch {
            return '{}';
        }
        return params;
    }

    parseParameters(paramString) {
        const params = {};
        const pairs = paramString.split(',').map(p => p.trim());

        pairs.forEach(pair => {
            const [key, value] = pair.split(':').map(p => p.trim());
            if (key && value) {
                params[key] = value;
            }
        });

        return params;
    }


    parseMidjourney(exif) {
        // 尝试从不同字段获取prompt
        let prompt = '';
        
        // 1. 检查Description字段
        if (exif.Description?.value) {
            prompt = exif.Description.value;
        }
        // 2. 检查UserComment字段
        else if (exif.UserComment?.value) {
            if (typeof exif.UserComment.value === 'string') {
                prompt = exif.UserComment.value;
            } else {
                // 处理字节数组形式的UserComment
                prompt = String.fromCharCode(null, ...exif.UserComment.value);
            }
        }
        // 3. 检查其他可能字段
        else if (exif.Comment?.value) {
            prompt = exif.Comment.value;
        }

        // 清理prompt中的控制字符
        prompt = prompt.replace(/[\u0000-\u001F]/g, '').trim();

        return {
            positivePrompt: prompt,
            generator: 'Midjourney'
        };
    }

    parseGeneric(exif) {
        if (exif) {
            if (exif.UserComment?.value) {
                const str = String.fromCharCode(null, ...exif.UserComment.value);
                console.log('解析到UserComment:', str);
                const lines = str.trim().split('\n').
                    map(line => line.replace(/[\u0000-\u001F]/g, '')). // 去除控制字符
                    filter(line => line.trim() !== ''); // 去除空行
                return this.parseLines(lines);
            }
        }
    }

    parseLines(lines) {
        try {
            // 先根据 '\n' split, 再根据 ':' split，如果有':'则取第一个为key，第二个为value
            const result = {};
            // 处理最后一行，假设它是 config
            const lastLine = lines.pop();
            const config = lastLine.split(',');
            console.log('解析到的config:', config);
            lastLine.split(',').forEach(param => {
                // 只分割第一个冒号
                const [key, value] = param.split(':', 2).map(p => p.trim());
                if (key && value) {
                    result[key.trim()] = value.trim();
                }
            });
            return {
                model: result['Model'] || 'Unknown',
                cfg: result['CFG scale'] || '',
                steps: result['Steps'] || '',
                seed: result['Seed'] || '',
                sampler: result['Sampler'] || '',
                scheduler: result['Schedule type'] || '',
                negativePrompt: lines.pop() || '',
                positivePrompt: lines || '',
            };
        } catch (error) {
            console.error('解析行失败:', error);
            return '{}';
        }
    }
}

export default ImageParser;





/**
 * Finds a node by its ID in the workflow.
 * @param {Array} nodes - The array of nodes from the workflow.
 * @param {number} nodeId - The ID of the node to find.
 * @returns {object|null} The node object or null if not found.
 */
function findNodeById(nodes, nodeId) {
    return nodes.find(node => node.id === nodeId) || null;
}

/**
 * Finds the node and output slot index that produces a given link ID.
 * @param {Array} nodes - The array of nodes from the workflow.
 * @param {number} targetLinkId - The ID of the link we are looking for.
 * @returns {{node: object, outputIndex: number}|null} The source node and output slot index or null.
 */
function findSourceNodeForLink(nodes, targetLinkId) {
    for (const node of nodes) {
        if (node.outputs) {
            for (let i = 0; i < node.outputs.length; i++) {
                const output = node.outputs[i];
                if (output.links && output.links.includes(targetLinkId)) {
                    return { node: node, outputIndex: i };
                }
            }
        }
    }
    return null;
}

/**
 * Traces back conditioning links to find the originating CLIPTextEncode node.
 * @param {number} initialLinkId - The link ID connected to the sampler's input.
 * @param {Array} nodes - The array of nodes from the workflow.
 * @returns {object|null} The CLIPTextEncode node or null.
 */
function findTextEncodeNodeForConditioning(initialLinkId, nodes) {
    let currentLinkId = initialLinkId;
    let safetyCounter = 0; // Prevent infinite loops in complex graphs

    while (currentLinkId !== null && safetyCounter < 20) {
        const sourceInfo = findSourceNodeForLink(nodes, currentLinkId);
        if (!sourceInfo) return null; // Link source not found

        const sourceNode = sourceInfo.node;

        // If we found a CLIPTextEncode, return it
        if (sourceNode.type === "CLIPTextEncode") {
            return sourceNode;
        }

        // If it's an intermediate node (like ControlNetApply), trace its input
        // Look for a 'positive' or 'negative' input that corresponds to the output link
        // This logic might need adjustment based on the specific intermediate node types
        if (sourceNode.inputs) {
             // Find the input slot that corresponds to the link we came from.
             // This assumes the intermediate node passes conditioning through.
             const relevantInput = sourceNode.inputs.find(input =>
                (input.type === "CONDITIONING" || input.name === "positive" || input.name === "negative") &&
                sourceNode.outputs[sourceInfo.outputIndex]?.name === input.name // Simple check if names match
             );

            if (relevantInput && relevantInput.link) {
                 currentLinkId = relevantInput.link; // Continue tracing back from the input link
            } else {
                 // Try finding *any* conditioning input if the name matching failed
                 const conditioningInput = sourceNode.inputs.find(input => input.type === "CONDITIONING" && input.link);
                 if (conditioningInput) {
                    currentLinkId = conditioningInput.link;
                 } else {
                    currentLinkId = null; // Cannot trace back further
                 }
            }
        } else {
            currentLinkId = null; // Node has no inputs to trace back
        }
        safetyCounter++;
    }
    return null; // Didn't find a CLIPTextEncode node within limits
}


/**
 * Parses a ComfyUI workflow JSON to extract key generation parameters.
 * @param {object|string} workflowData - The workflow JSON object or string.
 * @returns {object|null} An object containing extracted parameters or null if parsing fails.
 */
function parseWorkflow(workflowData) {
    const workflow = typeof workflowData === 'string' ? JSON.parse(workflowData) : workflowData;

    if (!workflow ) {
        console.error("Invalid workflow data provided.");
        return null;
    }
    if (!workflow.nodes) {
        console.error("Invalid workflow nodes provided.");
        return null;
    }

    const nodes = workflow.nodes;
    const links = workflow.links; // Links aren't directly used in this version but useful for complex tracing

    // --- Find the Sampler Node ---
    // Prioritize KSampler (Efficient), then KSampler, then KSampler (Advanced)
    // We take the first one found, assuming it's the primary one.
    let samplerNode = nodes.find(node => node.type === "KSampler (Efficient)");
    if (!samplerNode) {
        samplerNode = nodes.find(node => node.type === "KSampler");
    }
    if (!samplerNode) {
         samplerNode = nodes.find(node => node.type === "KSampler (Advanced)");
    }
    // Add more sampler types if needed

    if (!samplerNode) {
        console.warn("Could not find a suitable KSampler node in the workflow.");
        // Optionally, search for other custom sampler nodes here
        return null;
    }

    // --- Extract Sampler Parameters ---
    let seed = null;
    let steps = null;
    let cfg = null;
    let samplerName = null;
    let scheduler = null;

    // Parameter indices can vary based on the *exact* sampler node type.
    // These indices are based on the "KSampler (Efficient)" node in your example.
    // Adjust these if using standard KSampler or KSampler Advanced primarily.
    if (samplerNode.type === "KSampler (Efficient)" && samplerNode.widgets_values) {
        // Expected order for KSampler (Efficient): [seed, ?, steps, cfg, sampler_name, scheduler, ...]
        // Note: Index 1 is often 'noise_seed' or similar, skipped here.
        if (samplerNode.widgets_values.length > 5) {
             seed = samplerNode.widgets_values[0];
             steps = samplerNode.widgets_values[2];
             cfg = samplerNode.widgets_values[3];
             samplerName = samplerNode.widgets_values[4];
             scheduler = samplerNode.widgets_values[5];
        }
    } else if (samplerNode.type === "KSampler" && samplerNode.widgets_values) {
         // Expected order for KSampler: [seed, steps, cfg, sampler_name, scheduler, denoise]
         if (samplerNode.widgets_values.length > 4) {
             seed = samplerNode.widgets_values[0];
             steps = samplerNode.widgets_values[1];
             cfg = samplerNode.widgets_values[2];
             samplerName = samplerNode.widgets_values[3];
             scheduler = samplerNode.widgets_values[4];
         }
    }
    // Add logic for other sampler types (like KSampler Advanced) if needed

    // --- Extract Prompts ---
    let positivePrompt = null;
    let negativePrompt = null;

    const positiveInput = samplerNode.inputs?.find(inp => inp.name === 'positive');
    const negativeInput = samplerNode.inputs?.find(inp => inp.name === 'negative');

    if (positiveInput && positiveInput.link) {
        const positiveTextNode = findTextEncodeNodeForConditioning(positiveInput.link, nodes);
        // Extract text from the widget_values of the CLIPTextEncode node
        // Assumes the first widget value is the text prompt.
        if (positiveTextNode && positiveTextNode.widgets_values && positiveTextNode.widgets_values.length > 0) {
            positivePrompt = positiveTextNode.widgets_values[0];
        } else if (positiveTextNode) {
             console.warn("Found positive CLIPTextEncode node (ID:", positiveTextNode.id, ") but could not extract text from widgets_values.");
        } else {
             console.warn("Could not trace positive prompt link (", positiveInput.link, ") back to a CLIPTextEncode node.");
        }
    }

    if (negativeInput && negativeInput.link) {
        const negativeTextNode = findTextEncodeNodeForConditioning(negativeInput.link, nodes);
        // Extract text from the widget_values of the CLIPTextEncode node
        if (negativeTextNode && negativeTextNode.widgets_values && negativeTextNode.widgets_values.length > 0) {
            negativePrompt = negativeTextNode.widgets_values[0];
        } else if (negativeTextNode) {
             console.warn("Found negative CLIPTextEncode node (ID:", negativeTextNode.id, ") but could not extract text from widgets_values.");
        } else {
            console.warn("Could not trace negative prompt link (", negativeInput.link, ") back to a CLIPTextEncode node.");
        }
    }


    return {
        positivePrompt: positivePrompt,
        negativePrompt: negativePrompt,
        artistMatches: globalMatchers.artistMatcher.findMatches(positivePrompt),
        charaterMatches: globalMatchers.characterMatcher.findMatches(positivePrompt),
        cfg: cfg,
        sampler: samplerName,
        scheduler: scheduler,
        steps: steps,
        seed: seed,
    };
}
