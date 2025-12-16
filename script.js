document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('imageUpload');
  const dropZone = document.getElementById('dropZone');
  const preview = document.getElementById('imagePreview');
  const defaultPreview = document.getElementById('defaultPreview');
  const loader = document.getElementById('loader');
  const notification = document.getElementById('notification');
  const previewSection = document.getElementById('previewSection');
  

  
  // 初始化Color Thief
  const colorThief = new ColorThief();
  
  // 文件选择处理
  uploadInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleImage(e.target.files[0]);
    }
  });

  // 上传
  dropZone.addEventListener('click', () => uploadInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
      handleImage(e.dataTransfer.files[0]);
    }
  });

  // 主处理函数
  function handleImage(file) {
    if (!file.type.match('image.*')) {
      alert('不支持该类型的文件');
      return;
    }

    // 显示加载动画
    loader.style.display = 'block';
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      preview.src = e.target.result;
      
      preview.onload = () => {
        // 检查图片尺寸（高度至少 10px）
        if (preview.naturalHeight < 10) {
          alert('图片高度太小，无法分区提取颜色');
          loader.style.display = 'none';
          return;
        }
        
        // 隐藏缺省图，显示预览
        defaultPreview.style.display = 'none';
        preview.style.display = 'block';
        
        // 提取主色
        try {
          // 提取整个图片的第一个颜色
          const dominantColors = [extractDominantColors(preview)[0]];
          
          // 只提取第一个颜色的十六进制值
          const [r, g, b] = dominantColors[0];
          const originalHex = rgbToHex(r, g, b);
          
          // 调用主色判断函数并显示结果
          displayMainColorJudgment(originalHex);
          
        } catch (error) {
          alert('颜色提取失败: ' + error.message);
        } finally {
          loader.style.display = 'none';
          previewSection.classList.remove('hidden');
        }
      };
    };
    
    reader.readAsDataURL(file);
  }

  // 安全提取主色调
  function extractDominantColors(img) {
    try {
      // 尝试使用 ColorThief 提取颜色
      const colors = colorThief.getPalette(img, 3) || [];
      
      // 如果成功提取到颜色，返回结果
      if (colors.length > 0) return colors;
      
      // 如果提取失败，获取图片左上角像素颜色作为单一颜色
      return getSingleColorFallback(img);
    } catch (error) {
      // 出错时使用备选方案
      return getSingleColorFallback(img);
    }
  }



  // 获取单一颜色作为备选方案
  function getSingleColorFallback(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 创建1x1像素的canvas
    canvas.width = 1;
    canvas.height = 1;
    
    // 绘制图片的左上角像素
    ctx.drawImage(img, 0, 0, 1, 1);
    
    // 获取像素颜色数据
    const pixelData = ctx.getImageData(0, 0, 1, 1).data;
    const color = [pixelData[0], pixelData[1], pixelData[2]];
    
    // 返回三个相同的颜色（为了保持UI一致性）
    return [color, color, color];
  }

  // RGB转HSL
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // 灰色
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h = (h * 60) % 360;
      if (h < 0) h += 360;
    }

    return [
      Math.round(h),
      Math.round(s * 100),
      Math.round(l * 100)
    ];
  }

  // HSL转RGB
  function hslToRgb(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // 灰色
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h/360 + 1/3);
      g = hue2rgb(p, q, h/360);
      b = hue2rgb(p, q, h/360 - 1/3);
    }
    
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    ];
  }







  // 创建隐藏的复制用 textarea
  const copyTextarea = document.createElement('textarea');
  copyTextarea.setAttribute('id', 'copyTextarea');
  copyTextarea.style.position = 'fixed';
  copyTextarea.style.top = '-1000px';
  copyTextarea.style.left = '-1000px';
  copyTextarea.style.opacity = '0';
  document.body.appendChild(copyTextarea);



  // 更健壮的复制到剪贴板函数
  async function copyToClipboard(text) {
    try {
      // 尝试使用现代 Clipboard API
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showNotification(`已复制代码`);
        return;
      }
      
      // 使用备用方法
      const textarea = document.getElementById('copyTextarea');
      textarea.value = text;
      textarea.select();
      
      // 尝试执行复制命令
      const result = document.execCommand('copy');
      
      if (result) {
        showNotification(`已复制代码`);
      } else {
        showNotification('复制失败，请手动复制代码', true);
      }
    } catch (err) {
      console.error('复制失败:', err);
      
      // 显示详细的错误信息
      let errorMsg = '复制失败';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = '复制被拒绝，请授予剪贴板权限';
      } else if (err.name === 'SecurityError') {
        errorMsg = '安全限制阻止了复制操作';
      } else if (err.name === 'TypeError') {
        errorMsg = '浏览器不支持剪贴板功能';
      }
      
      showNotification(`${errorMsg}: ${text}`, true);
    }
  }

  // RGB转HEX
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  // 命中区域判断函数
  function pointInRegion(sx, sy, currentHue) {
    // 定义椭圆参数
    const ellipse = {
      cx: 100,
      cy: 50,
      rx: 80,
      ry: 40
    };
    
    // 根据H值判断是否需要调整范围
    const useAdjustedRange = currentHue !== null && (currentHue >= 20 && currentHue < 94 || currentHue >= 241 && currentHue < 347);
    
    if (useAdjustedRange) {
      // 当H值在范围内时，使用更宽松的条件
      // 检查点是否在(10,10)-(100,90)的矩形内且在椭圆内
      if (sx >= 10 && sx <= 100 && sy >= 10 && sy <= 90) {
        const dx = sx - ellipse.cx;
        const dy = sy - ellipse.cy;
        const val = (dx * dx) / (ellipse.rx * ellipse.rx)
                  + (dy * dy) / (ellipse.ry * ellipse.ry);
      
        // 增加容差，使更多点被判断为在区域内
        return val <= 1.4 + 1e-9; // 增加容差到1.4
      }
      return false;
    } else {
      // 原始逻辑：必须在椭圆内且sx >= 20
      if (sx < 20 || sx > 100) return false;
    
      // 椭圆方程：(x-cx)^2/rx^2 + (y-cy)^2/ry^2 <= 1
      const dx = sx - ellipse.cx;
      const dy = sy - ellipse.cy;
      const val = (dx * dx) / (ellipse.rx * ellipse.rx)
                + (dy * dy) / (ellipse.ry * ellipse.ry);
    
      return val <= 1 + 1e-9; // 原始容差
    }
  }

  // 颜色映射表
  const colorMap = {
    red: { start: '#F42A4B', end: '#AF1313' },
    brown: { start: '#855547', end: '#40170B' },
    orange: { start: '#F57A00', end: '#CA5216' },
    yellow: { start: '#F5A300', end: '#B36D05' },
    green: { start: '#40BF40', end: '#188F00' },
    cyan: { start: '#3DB8B0', end: '#007A7A' },
    sky: { start: '#00AAFF', end: '#0074CC' },
    blue: { start: '#3C7AF5', end: '#1F3DD6' },
    indigo: { start: '#613FA7', end: '#0D004D' },
    purple: { start: '#914DB2', end: '#500674' },
    pink: { start: '#F651A3', end: '#A5125C' },
    grey: { start: '#8A9EA8', middle: '#415058', end: '#030D17' }
  };

  // 主色判断逻辑
  function judgeMainColor(hexColor) {
    // 解析HEX颜色为RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // 转换为HSL
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // 判断是否命中区域
    const inRegion = pointInRegion(s, l, h);
    
    // 根据H值和命中结果判断主色类别
    let colorCategory;
    let gradientType;
    
    // 情况1: H >= 20 && H < 94 或 H >= 241 && H < 347
    if ((h >= 20 && h < 94) || (h >= 241 && h < 347)) {
      if (inRegion) {
        // 根据H值映射对应的渐变色
        if (h >= 20 && h < 44) {
          colorCategory = 'orange';
          gradientType = 'orange-gradient';
        } else if (h >= 44 && h < 94) {
          colorCategory = 'yellow';
          gradientType = 'yellow-gradient';
        } else if (h >= 241 && h < 282) {
          colorCategory = 'indigo';
          gradientType = 'indigo-gradient';
        } else if (h >= 282 && h < 316) {
          colorCategory = 'purple';
          gradientType = 'purple-gradient';
        } else if (h >= 316 && h < 347) {
          colorCategory = 'pink';
          gradientType = 'pink-gradient';
        }
      } else {
        // 未命中区域，使用灰色渐变
        colorCategory = 'grey';
        gradientType = l >= 50 ? 'grey-shallow-gradient' : 'grey-deep-gradient';
      }
    } else {
      // 情况2: H值不符合情况1
      if (inRegion) {
        // 根据H值映射对应的渐变色
        if ((h >= 0 && h < 20) || (h >= 347 && h < 360)) {
          colorCategory = s >= 50 ? 'red' : 'brown';
          gradientType = colorCategory + '-gradient';
        } else if (h >= 94 && h < 163) {
          colorCategory = 'green';
          gradientType = 'green-gradient';
        } else if (h >= 163 && h < 188) {
          colorCategory = 'cyan';
          gradientType = 'cyan-gradient';
        } else if (h >= 188 && h < 213) {
          colorCategory = 'sky';
          gradientType = 'sky-gradient';
        } else if (h >= 213 && h < 241) {
          colorCategory = 'blue';
          gradientType = 'blue-gradient';
        }
      } else {
        // 未命中区域，使用灰色渐变
        colorCategory = 'grey';
        gradientType = l >= 50 ? 'grey-shallow-gradient' : 'grey-deep-gradient';
      }
    }
    
    return {
      colorCategory,
      gradientType,
      h, s, l,
      inRegion
    };
  }

  // 显示主色判断结果
  function displayMainColorJudgment(hexColor) {
    const judgmentResults = document.getElementById('judgmentResults');
    judgmentResults.innerHTML = '';
    
    const judgment = judgeMainColor(hexColor);
    const { colorCategory, gradientType, h, s, l, inRegion } = judgment;
    const colorInfo = colorMap[colorCategory];
    
    // 创建结果容器
    const resultContainer = document.createElement('div');
    resultContainer.className = 'judgment-container';
    
    // 添加HSL信息
    const hslInfo = document.createElement('div');
    hslInfo.className = 'hsl-info';
    hslInfo.innerHTML = `
      <div class="copyable-default">${hexColor}&nbsp;&nbsp;hsl(${h}, ${s}%, ${l}%)</div>
      <div class="copyable-line">命中区域: ${inRegion ? '是' : '否'}</div>
    `;
    resultContainer.appendChild(hslInfo);
    
    // 根据颜色类别和渐变类型显示相应的颜色代码
    if (colorCategory === 'grey') {
      // 灰色渐变处理
      if (gradientType === 'grey-shallow-gradient') {
        // 浅灰色渐变
        const shallowGradient = document.createElement('div');
        shallowGradient.className = 'gradient-info';
        shallowGradient.innerHTML = `
          <div class="copyable-line">
            <span>gery-start:&nbsp;</span>
            <span class="copyable-text">${colorInfo.start}</span>
          </div>
          <div class="copyable-line">
            <span>grey-middle:&nbsp;</span>
            <span class="copyable-text">${colorInfo.middle}</span>
          </div>
          <div class="copyable-line">
            <span>grey-shallow-gradient:&nbsp;</span>
            <span class="copyable-text">background: var(--grey-shallow-gradient, var(--gery-start, ${colorInfo.start}) 0%, var(--grey-middle, ${colorInfo.middle}) 100%);</span>
          </div>
        `;
        resultContainer.appendChild(shallowGradient);
      } else {
        // 深灰色渐变
        const deepGradient = document.createElement('div');
        deepGradient.className = 'gradient-info';
        deepGradient.innerHTML = `
          <div class="copyable-line">
            <span>gery-middle:&nbsp;</span>
            <span class="copyable-text">${colorInfo.middle}</span>
          </div>
          <div class="copyable-line">
            <span>grey-end:&nbsp;</span>
            <span class="copyable-text">${colorInfo.end}</span>
          </div>
          <div class="copyable-line">
            <span>grey-deep-gradient:&nbsp;</span>
            <span class="copyable-text">background: var(--grey-deep-gradient, var(--gery-middle, ${colorInfo.middle}) 0%, var(--grey-end, ${colorInfo.end}) 100%);</span>
          </div>
        `;
        resultContainer.appendChild(deepGradient);
      }
    } else {
      // 彩色渐变处理
      const gradientInfo = document.createElement('div');
      gradientInfo.className = 'gradient-info';
      
      // 根据颜色类别确定start和end的命名
      const startName = colorCategory + '-start';
      const endName = colorCategory + '-end';
      
      gradientInfo.innerHTML = `
        <div class="copyable-line">
          <span>${startName}:&nbsp;</span>
          <span class="copyable-text">${colorInfo.start}</span>
        </div>
        <div class="copyable-line">
          <span>${endName}:&nbsp;</span>
          <span class="copyable-text">${colorInfo.end}</span>
        </div>
        <div class="copyable-line">
          <span>${gradientType}:&nbsp;</span>
          <span class="copyable-text">background: var(--${gradientType}, var(--${startName}, ${colorInfo.start}) 0%, var(--${endName}, ${colorInfo.end}) 100%);</span>
        </div>
      `;
      resultContainer.appendChild(gradientInfo);
    }
    
    // 添加渐变色块显示
    const gradientBlock = document.createElement('div');
    gradientBlock.className = 'gradient-block';
    
    if (colorCategory === 'grey') {
      if (gradientType === 'grey-shallow-gradient') {
        gradientBlock.style.background = `linear-gradient(to right, ${colorInfo.start} 0%, ${colorInfo.middle} 100%)`;
      } else {
        gradientBlock.style.background = `linear-gradient(to right, ${colorInfo.middle} 0%, ${colorInfo.end} 100%)`;
      }
    } else {
      gradientBlock.style.background = `linear-gradient(to right, ${colorInfo.start} 0%, ${colorInfo.end} 100%)`;
    }
    
    resultContainer.appendChild(gradientBlock);
    
    // 将结果添加到页面
    judgmentResults.appendChild(resultContainer);
    
    // 添加点击复制功能
    addCopyFunctionality();
  }

  // 添加点击复制功能
  function addCopyFunctionality() {
    const copyableTexts = document.querySelectorAll('.copyable-text');
    copyableTexts.forEach(text => {
      text.addEventListener('click', () => {
        // 直接复制文本内容
        const copyText = text.textContent;
        copyToClipboard(copyText);
      });
    });
  }
  
  // 修改显示通知函数，支持错误样式
  function showNotification(message, isError = false) {
    notification.textContent = message || '颜色代码已复制到剪贴板！';
    
    // 设置通知样式
    if (isError) {
      notification.style.background = '#E5404E';
    } else {
      notification.style.background = '#007A7A';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

});