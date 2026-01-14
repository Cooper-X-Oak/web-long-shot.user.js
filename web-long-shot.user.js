// ==UserScript==
// @name         网页长图生成器 (Web Long Shot)
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  一键将任意网页生成长图并直接预览 (Instant Web Long Shot)
// @author       Trae AI Architect
// @match        *://*/*
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 样式注入：简单的浮动状态条
    GM_addStyle(`
        #uls-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 14px;
            z-index: 2147483647; /* Max Z-Index */
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: opacity 0.3s;
        }
        #uls-toast.uls-show {
            display: block;
            animation: uls-fadein 0.3s;
        }
        @keyframes uls-fadein {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `);

    // 创建 Toast 元素
    let toastEl = null;
    function showToast(msg, duration = 0) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'uls-toast';
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = msg;
        toastEl.classList.add('uls-show');

        if (duration > 0) {
            setTimeout(() => {
                toastEl.classList.remove('uls-show');
            }, duration);
        }
    }

    function hideToast() {
        if (toastEl) toastEl.classList.remove('uls-show');
    }

    // 移除 isImageSafe 和 fixCorsImages
    
    /**
     * 获取页面主要滚动容器
     * 针对部分网站使用 div 滚动而非 window 滚动的情况
     */
    function getScrollContainer() {
        // 1. 优先检查 document.scrollingElement (通常是 html 或 body)
        if (document.scrollingElement && document.scrollingElement.scrollHeight > window.innerHeight) {
            return document.scrollingElement;
        }

        // 2. 如果 body 看起来不可滚动 (overflow: hidden 或 height: 100%)，寻找内部滚动容器
        // 简单启发式：寻找 scrollHeight 最大的块级元素
        let maxScrollHeight = 0;
        let candidate = null;
        
        const elements = document.querySelectorAll('div, main, section, article');
        for (let el of elements) {
            const style = window.getComputedStyle(el);
            if (['auto', 'scroll'].includes(style.overflowY) && el.scrollHeight > el.clientHeight) {
                if (el.scrollHeight > maxScrollHeight) {
                    maxScrollHeight = el.scrollHeight;
                    candidate = el;
                }
            }
        }
        
        return candidate || document.body;
    }

    /**
     * 自动滚动页面以触发懒加载 (稳健版)
     * 放弃瞬移，采用大步幅快速滚动，确保懒加载被触发
     */
    async function autoScroll() {
        const scroller = getScrollContainer();
        const totalHeight = scroller.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        showToast('⬇️ 正在滚动加载内容...', 0);

        // 使用较大步幅进行滚动，平衡速度与加载成功率
        // 步幅设为 1.5 倍视口，既能触发可视区域附近的懒加载，又比逐行快
        const step = viewportHeight * 1.5;
        let currentPos = 0;

        // 如果是 window 滚动
        const isWindow = (scroller === document.body || scroller === document.documentElement);

        while (currentPos < totalHeight) {
            currentPos += step;
            if (currentPos > totalHeight) currentPos = totalHeight;

            if (isWindow) {
                window.scrollTo(0, currentPos);
            } else {
                scroller.scrollTop = currentPos;
            }
            
            // 等待时间从 200ms 调整为 100ms，足够触发大部分 IntersectionObserver
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 滚回顶部
        if (isWindow) {
            window.scrollTo(0, 0);
        } else {
            scroller.scrollTop = 0;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // 顶部等待稍长，确保首屏渲染
    }

    /**
     * 显示模态框展示 Canvas (极速版 - 默认方式)
     */
    function showCanvasModal(canvas) {
        // 如果已存在，先移除
        const oldModal = document.getElementById('uls-modal');
        if (oldModal) document.body.removeChild(oldModal);

        const modal = document.createElement('div');
        modal.id = 'uls-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 2147483647;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.2s;
        `;
        
        const container = document.createElement('div');
        container.style.cssText = `
            background: white; padding: 10px; border-radius: 8px;
            max-width: 95%; max-height: 90%; overflow: auto;
            display: flex; flex-direction: column; align-items: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 10px; text-align: center; color: #333; width: 100%; display: flex; justify-content: space-between; align-items: center;';
        
        const title = document.createElement('div');
        title.innerHTML = '✅ <b>长图生成完毕</b> (右键另存为)';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '❌ 关闭';
        closeBtn.onclick = () => document.body.removeChild(modal);
        closeBtn.style.cssText = 'padding: 5px 10px; cursor: pointer; border: 1px solid #ccc; background: #eee; border-radius: 4px;';

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Canvas 样式适配
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.border = '1px solid #ccc';
        // 阻止 Canvas 的右键菜单被拦截（虽然通常不会，但为了保险）
        canvas.oncontextmenu = (e) => e.stopPropagation();

        container.appendChild(header);
        container.appendChild(canvas);
        modal.appendChild(container);
        document.body.appendChild(modal);

        // 动画显示
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });
    }

    /**
     * 处理截图与复制逻辑
     */
    async function handleCapture() {
        try {
            // 1. 自动滚动 (瞬移)
            await autoScroll();
            showToast('⚡ 正在极速渲染...', 0);

            // 2. 准备截图配置
            const fixedElements = [];
            const allElements = document.querySelectorAll('*');
            for (let el of allElements) {
                if (el.id === 'uls-toast' || el.id === 'uls-modal') continue;
                const style = window.getComputedStyle(el);
                if ((style.position === 'fixed' || style.position === 'sticky') && style.display !== 'none') {
                    fixedElements.push({ el, originalDisplay: el.style.display });
                    el.style.display = 'none';
                }
            }

            // 3. 执行截图
            const canvas = await html2canvas(document.body, {
                useCORS: true,       // 必须开启以加载图片
                allowTaint: true,    // 允许 Taint，确保图片不丢失
                logging: false,      
                scale: 1,            // 1倍缩放，速度最快
                backgroundColor: '#ffffff',
                windowHeight: document.body.scrollHeight,
                x: 0,
                y: 0,
                ignoreElements: (element) => {
                    if (element.id === 'uls-toast' || element.id === 'uls-modal') return true;
                    if (element.tagName === 'IFRAME') return true;
                    if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') return true;
                    return false;
                }
            });

            // 4. 恢复 UI
            fixedElements.forEach(item => {
                item.el.style.display = item.originalDisplay;
            });

            // 5. 直接展示结果 (不进行 clipboard 操作，极致速度)
            showToast('✨ 完成!', 1000);
            showCanvasModal(canvas);

        } catch (err) {
            console.error('Screenshot error:', err);
            showToast(`❌ 出错: ${err.message}`, 5000);
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand("📸 生成网页长图", handleCapture);

    console.log('Universal Long Shot: Ready');

})();