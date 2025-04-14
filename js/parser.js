class ImageParser {
    async parse(file) {
        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('请上传图片文件');
            }

            const exif = await ExifReader.load(file);
            console.log('解析到的EXIF:', exif);

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
                default:
                    metadata = {};
            }

            // 将完整的原始标签数据添加到返回结果中
            const rawMetadata = {};
            // 转换ExifReader标签为普通对象
            for (const [key, value] of Object.entries(exif)) {
                if (value && typeof value === 'object') {
                    rawMetadata[key] = {
                        description: value.description,
                        value: value.value
                    };
                }
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
                rawTags: await this.getRawTags(file)
            };
        }
    }

    // 新增：获取原始标签数据的辅助方法
    async getRawTags(file) {
        try {
            const tags = await ExifReader.load(file);
            const rawMetadata = {};
            for (const [key, value] of Object.entries(tags)) {
                if (value && typeof value === 'object') {
                    rawMetadata[key] = {
                        description: value.description,
                        value: value.value
                    };
                }
            }
            return rawMetadata;
        } catch (error) {
            return { error: '无法读取原始元数据' };
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

    detectGenerator(tags) {
        
        // ComfyUI 特征: 包含 prompt 和 workflow
        if (tags.prompt && tags.workflow) {
            return 'ComfyUI';
        }

        // NovelAI 特征: 包含 parameters
        if (tags.parameters || tags.Parameters) {
            return 'NovelAI';
        }
        
        return 'Unknown';
    }

    parseNovelAI(exif) {
        try {
            // 先根据 '\n' split, 再根据 ':' split，如果有':'则取第一个为key，第二个为value
            const params = exif.parameters?.description || '';
            const lines = params.split('\n');
            console.log('解析到的NovelAI参数:', lines);
            const result = {};
            // 处理最后一行，假设它是 config
            const lastLine = lines.pop();
            const config = lastLine.split(',');
            console.log('解析到的config:', config);
            lastLine.split(',').forEach(param => {
                // 只分割第一个冒号
                const [key, value] = param.split(':',2).map(p => p.trim());
                if (key && value) {
                    result[key] = value;
                }
            });
            console.log('解析到的result:', result);
            return {
                model: result['Model'] || 'Unknown',
                cfg: result['CFG scale'] || '',
                steps: result['Steps']  || '',
                seed: result['Seed']  || '',
                sampler: result['Sampler']  || '',
                scheduler: result['Schedule type']  || '',
                negativePrompt: lines.pop() || '',
                positivePrompt: lines || '',
            };
        } catch {
            return '{}';
        }
    }

    // 修改 parseComfyUI 方法以保存完整 workflow
    parseComfyUI(exif) {
        
        try {
            const prompts = this.parseComfyUIPrompts(exif);
            const workflowData = JSON.parse(exif.workflow?.description || '{}');
            const workflow = this.parseComfyUIWorkflow(workflowData || '{}');
            return prompts;
        } catch {
            return this.parseGeneric(exif);
        }
    }


    parseComfyUIPrompts(exif) {
        
        try {
            const data = JSON.parse(exif.prompt?.description || '{}');
            console.log('解析到的ComfyUI提示:', data);

            const samplerNode = data["5"] || data["61"] ;
            return {
                model: data["1"]?.inputs?.ckpt_name || 'Unknown',
                cfg: samplerNode?.inputs?.cfg || '',
                steps: samplerNode?.inputs?.steps || '',
                seed: samplerNode?.inputs?.seed || '',
                sampler: samplerNode?.inputs?.sampler_name || '',
                scheduler: samplerNode?.inputs?.scheduler || '',
                positivePrompt: data["39"]?.inputs?.text || '',
                negativePrompt: data["25"]?.inputs?.text || '',
            };
        } catch {
            return '{}';
        }
    }


    parseComfyUIWorkflow(workflowDescription) {
        
        try {
            const data = JSON.parse(workflowDescription.description || '{}');
            return data;
        } catch {
            return '{}';
        }
    }

    // 修改 parseStableDiffusion 方法以包含完整参数字符串
    parseStableDiffusion(tags) {
        // Stable Diffusion 通常在 parameters 中存储信息
        const params = tags.parameters?.description || '';
        
        // 解析常见的 SD 格式
        const positivePrompt = params.split('Negative prompt:')[0].trim();
        const negativePrompt = params.split('Negative prompt:')[1]?.split('Steps:')[0]?.trim() || '';
        
        return {
            model: 'Stable Diffusion',
            positivePrompt,
            negativePrompt,
            parameters: this.extractSDParameters(params),
            rawParameters: params // 保存完整的参数字符串
        };
    }

    extractSDParameters(params) {
        const result = {};
        
        // 提取常见参数
        const patterns = {
            'Steps': /Steps: (\d+)/,
            'Sampler': /Sampler: ([^,]+)/,
            'CFG scale': /CFG scale: (\d+\.?\d*)/,
            'Seed': /Seed: (\d+)/,
            'Size': /Size: (\d+x\d+)/,
            'Model hash': /Model hash: (\w+)/,
            'Model': /Model: ([^,]+)/,
        };

        for (const [key, pattern] of Object.entries(patterns)) {
            const match = params.match(pattern);
            if (match) {
                result[key] = match[1];
            }
        }

        return result;
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
}