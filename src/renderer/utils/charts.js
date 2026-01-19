// 图表交互状态
const chartState = {};

// 辅助函数：归一化角度到 [0, 2π]
function normalizeAngle(angle) {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return normalized;
}

// 缓动函数 - easeOutCubic
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// 缓动函数 - easeInOutCubic
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 绘制环形图
function drawDonutChart(canvasId, data, colors, forceUpdate = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const width = 500;
  const height = 500;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = '450px';
  canvas.style.height = '450px';

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) - 60;
  const innerRadius = baseRadius * 0.6;

  // 初始化图表状态
  if (!chartState[canvasId]) {
    chartState[canvasId] = {
      hoveredIndex: -1,
      targetHoveredIndex: -1,
      animationProgress: 0,
      isAnimating: false,
      slices: [],
      // 初始加载动画状态
      initialLoadComplete: false,
      initialLoadStartTime: null,
      valueAnimationStartTime: null

    };
  }

  const state = chartState[canvasId];

  // 如果是强制更新且已经完成初始加载，则播放快速过渡动画
  if (forceUpdate && state.initialLoadComplete) {
    state.skipInitialAnimation = true;
    state.quickTransition = true;
  } else if (!forceUpdate) {
    // 如果不是强制更新，确保不跳过动画
    state.skipInitialAnimation = false;
    state.quickTransition = false;
  }

  // 清除之前的动画
  if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
  }

  // 清除之前的鼠标事件监听器
  canvas.onmousemove = null;
  canvas.onmouseleave = null;

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = baseRadius - innerRadius;
    ctx.stroke();

    ctx.fillStyle = '#bdc3c7';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', centerX, centerY);
    return;
  }

  // 计算扇形数据
  let startAngle = -Math.PI / 2;
  const slices = [];

  data.forEach((item, index) => {
    if (item.value === 0) return;

    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    slices.push({
      index,
      name: item.name,
      percent: ((item.value / total) * 100).toFixed(2),
      value: item.value,
      baseStartAngle: startAngle,
      baseEndAngle: endAngle,
      midAngle,
      sliceAngle,
      color: colors[index % colors.length],
      currentRadius: baseRadius,
      currentStartAngle: startAngle,
      currentEndAngle: endAngle
    });

    startAngle = endAngle;
  });

  state.slices = slices;

  // 动画绘制函数
  function animate() {
    const now = performance.now();

    // 如果需要跳过初始动画，直接标记为完成
    if (state.skipInitialAnimation && !state.initialLoadComplete) {
      state.initialLoadComplete = true;
      state.skipInitialAnimation = false;
    }

    // 快速过渡动画（数据更新时）
    if (state.quickTransition && state.initialLoadComplete) {
      if (!state.quickTransitionStartTime) {
        state.quickTransitionStartTime = now;
      }

      const quickTransitionDuration = 300; // 300ms 快速过渡
      const quickElapsed = now - state.quickTransitionStartTime;
      const quickProgress = Math.min(quickElapsed / quickTransitionDuration, 1);
      const easedQuickProgress = easeOutCubic(quickProgress);

      ctx.clearRect(0, 0, width, height);

      // 绘制所有扇形（使用展开动画）
      let currentAngle = -Math.PI / 2;
      const maxAngle = -Math.PI / 2 + (2 * Math.PI * easedQuickProgress);

      slices.forEach((slice) => {
        if (slice.value === 0) return;

        const sliceAngle = slice.baseEndAngle - slice.baseStartAngle;
        const visibleSliceAngle = Math.min(sliceAngle, maxAngle - currentAngle);

        if (visibleSliceAngle > 0) {
          const drawStartAngle = currentAngle;
          const drawEndAngle = currentAngle + visibleSliceAngle;

          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius, drawStartAngle, drawEndAngle);
          ctx.arc(centerX, centerY, innerRadius, drawEndAngle, drawStartAngle, true);
          ctx.closePath();

          ctx.fillStyle = slice.color;
          ctx.fill();

          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 绘制文字标签
          if (quickProgress > 0.5) {
            const midAngle = drawStartAngle + visibleSliceAngle / 2;
            const labelRadius = (baseRadius + innerRadius) / 2;
            const labelX = centerX + Math.cos(midAngle) * labelRadius;
            const labelY = centerY + Math.sin(midAngle) * labelRadius;

            const percentValue = parseFloat(slice.percent);
            const textOpacity = (quickProgress - 0.5) * 2;

            ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const padding = 50;
            const mightOverflow = labelX < padding || labelX > width - padding ||
                                 labelY < padding || labelY > height - padding;

            if (percentValue < 5 || mightOverflow) {
              const lineStartRadius = baseRadius + 5;
              const lineEndRadius = baseRadius + 60;

              let lineEndX = centerX + Math.cos(midAngle) * lineEndRadius;
              let lineEndY = centerY + Math.sin(midAngle) * lineEndRadius;

              const safePadding = 70;
              if (lineEndX < safePadding) lineEndX = safePadding;
              if (lineEndX > width - safePadding) lineEndX = width - safePadding;
              if (lineEndY < safePadding) lineEndY = safePadding;
              if (lineEndY > height - safePadding) lineEndY = height - safePadding;

              const lineStartX = centerX + Math.cos(midAngle) * lineStartRadius;
              const lineStartY = centerY + Math.sin(midAngle) * lineStartRadius;

              ctx.beginPath();
              ctx.moveTo(lineStartX, lineStartY);
              ctx.lineTo(lineEndX, lineEndY);
              ctx.strokeStyle = `rgba(255, 255, 255, ${textOpacity * 0.6})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(lineStartX, lineStartY, 4, 0, 2 * Math.PI);
              ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity * 0.8})`;
              ctx.fill();

              const textX = lineEndX + (lineEndX > centerX ? 15 : -15);
              const textY = lineEndY;
              ctx.textAlign = lineEndX > centerX ? 'left' : 'right';
              ctx.font = `bold 16px Arial`;
              ctx.fillText(`${slice.name} ${slice.percent}%`, textX, textY);
            } else {
              ctx.font = `normal 17px Arial`;
              ctx.fillText(slice.name, labelX, labelY - 9);
              ctx.font = `15px Arial`;
              ctx.fillText(`${slice.percent}%`, labelX, labelY + 9);
            }
          }
        }

        currentAngle += sliceAngle;
        if (currentAngle >= maxAngle) return;
      });

      // 绘制中心文字
      const textOpacity = easedQuickProgress;
      ctx.fillStyle = `rgba(236, 240, 241, ${textOpacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px Arial';

      // 根据图表类型显示不同的标题
      let centerTitle = '总计';
      if (canvasId.includes('planned')) {
        centerTitle = '分配规划';
      } else if (canvasId.includes('actual')) {
        centerTitle = '实际持有';
      }

      ctx.fillText(centerTitle, centerX, centerY - 12);

      // 数字动画
      const animatedTotal = total * easedQuickProgress;
      ctx.font = '26px Arial';
      ctx.fillText(formatCurrency(animatedTotal), centerX, centerY + 26);

      // 继续或结束快速过渡动画
      if (quickProgress < 1) {
        state.animationFrame = requestAnimationFrame(animate);
      } else {
        state.quickTransition = false;
        state.quickTransitionStartTime = null;
      }
      return;
    }

    // 初始加载动画
    if (!state.initialLoadComplete && !state.skipInitialAnimation) {
      if (!state.initialLoadStartTime) {
        state.initialLoadStartTime = now;
        state.valueAnimationStartTime = now;
      }

      const initialLoadDuration = 1000; // 1秒展开动画
      const valueAnimationDuration = 2000; // 2秒数字递增动画
      const initialElapsed = now - state.initialLoadStartTime;
      const valueElapsed = now - state.valueAnimationStartTime;
      const initialProgress = Math.min(initialElapsed / initialLoadDuration, 1);
      const valueProgress = Math.min(valueElapsed / valueAnimationDuration, 1);
      const easedInitialProgress = easeInOutCubic(initialProgress);
      const easedValueProgress = easeInOutCubic(valueProgress);

      ctx.clearRect(0, 0, width, height);

      // 绘制展开的环形图
      let currentAngle = -Math.PI / 2;
      const maxAngle = -Math.PI / 2 + (2 * Math.PI * easedInitialProgress);

      slices.forEach((slice) => {
        if (slice.value === 0) return;

        const sliceAngle = slice.baseEndAngle - slice.baseStartAngle;
        const visibleSliceAngle = Math.min(sliceAngle, maxAngle - currentAngle);

        if (visibleSliceAngle > 0) {
          const drawStartAngle = currentAngle;
          const drawEndAngle = currentAngle + visibleSliceAngle;

          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius, drawStartAngle, drawEndAngle);
          ctx.arc(centerX, centerY, innerRadius, drawEndAngle, drawStartAngle, true);
          ctx.closePath();

          ctx.fillStyle = slice.color;
          ctx.fill();

          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 计算该扇形的文字显示进度（基于扇形展开程度）
          const sliceProgress = visibleSliceAngle / sliceAngle;
          // 只在扇形完全展开后开始淡入文字
          const textFadeProgress = Math.max(0, Math.min(1, (sliceProgress - 0.8) * 5)); // 最后20%展开时开始淡入

          // 绘制该扇形的文字标签
          if (textFadeProgress > 0) {
            const midAngle = drawStartAngle + visibleSliceAngle / 2;
            const labelRadius = (baseRadius + innerRadius) / 2;
            const labelX = centerX + Math.cos(midAngle) * labelRadius;
            const labelY = centerY + Math.sin(midAngle) * labelRadius;

            const percentValue = parseFloat(slice.percent);
            const textOpacity = textFadeProgress;

            ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const padding = 50;
            const mightOverflow = labelX < padding || labelX > width - padding ||
                                 labelY < padding || labelY > height - padding;

            if (percentValue < 5 || mightOverflow) {
              const lineStartRadius = baseRadius + 5;
              const lineEndRadius = baseRadius + 60;

              let lineEndX = centerX + Math.cos(midAngle) * lineEndRadius;
              let lineEndY = centerY + Math.sin(midAngle) * lineEndRadius;

              const safePadding = 70;
              if (lineEndX < safePadding) lineEndX = safePadding;
              if (lineEndX > width - safePadding) lineEndX = width - safePadding;
              if (lineEndY < safePadding) lineEndY = safePadding;
              if (lineEndY > height - safePadding) lineEndY = height - safePadding;

              const lineStartX = centerX + Math.cos(midAngle) * lineStartRadius;
              const lineStartY = centerY + Math.sin(midAngle) * lineStartRadius;

              ctx.beginPath();
              ctx.moveTo(lineStartX, lineStartY);
              ctx.lineTo(lineEndX, lineEndY);
              ctx.strokeStyle = `rgba(255, 255, 255, ${textOpacity * 0.6})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(lineStartX, lineStartY, 4, 0, 2 * Math.PI);
              ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity * 0.8})`;
              ctx.fill();

              const textX = lineEndX + (lineEndX > centerX ? 15 : -15);
              const textY = lineEndY;
              ctx.textAlign = lineEndX > centerX ? 'left' : 'right';
              ctx.font = `bold 16px Arial`;
              ctx.fillText(`${slice.name} ${slice.percent}%`, textX, textY);
            } else {
              ctx.font = `normal 17px Arial`;
              ctx.fillText(slice.name, labelX, labelY - 9);
              ctx.font = `15px Arial`;
              ctx.fillText(`${slice.percent}%`, labelX, labelY + 9);
            }
          }
        }

        currentAngle += sliceAngle;
        if (currentAngle >= maxAngle) return;
      });

      // 绘制中心文字（淡入效果）
      const textOpacity = easedInitialProgress;
      ctx.fillStyle = `rgba(236, 240, 241, ${textOpacity})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px Arial';

      // 根据图表类型显示不同的标题
      let centerTitle = '总计';
      if (canvasId.includes('planned')) {
        centerTitle = '分配规划';
      } else if (canvasId.includes('actual')) {
        centerTitle = '实际持有';
      }

      ctx.fillText(centerTitle, centerX, centerY - 12);

      // 数字递增动画
      const animatedTotal = total * easedValueProgress;
      ctx.font = '26px Arial';
      ctx.fillText(formatCurrency(animatedTotal), centerX, centerY + 26);

      // 继续初始动画
      if (initialProgress < 1 || valueProgress < 1) {
        state.animationFrame = requestAnimationFrame(animate);
      } else {
        state.initialLoadComplete = true;
      }

      return;
    }

    // 正常的悬停动画（环形图展开完成后）
    const animationDuration = 1000; // 动画持续时间（毫秒）

    if (!state.startTime) {
      state.startTime = now;
    }

    const elapsed = now - state.startTime;
    const rawProgress = Math.min(elapsed / animationDuration, 1);
    const progress = easeInOutCubic(rawProgress);

    // 更新动画进度
    state.animationProgress = progress;

    ctx.clearRect(0, 0, width, height);

    const hoveredIndex = state.targetHoveredIndex;
    const isAnimating = hoveredIndex !== state.hoveredIndex;

    // 如果动画完成，更新当前悬停索引
    if (rawProgress >= 1) {
      state.hoveredIndex = hoveredIndex;
      state.isAnimating = false;
    } else {
      state.isAnimating = true;
    }

    // ========== 在循环外预先计算所有扇形的目标角度 ==========
    const targetAngles = [];

    if (hoveredIndex !== -1) {
      const hoveredSlice = slices[hoveredIndex];
      const hoveredOriginalAngle = hoveredSlice.baseEndAngle - hoveredSlice.baseStartAngle;
      const hoveredNewAngle = hoveredOriginalAngle * 1.4;

      // 计算缩放因子
      const otherTotalAngle = 2 * Math.PI - hoveredOriginalAngle;
      const newOtherTotalAngle = 2 * Math.PI - hoveredNewAngle;
      const shrinkFactor = newOtherTotalAngle / otherTotalAngle;

      // 计算全局偏移量
      const hoveredCenterAngle = (hoveredSlice.baseStartAngle + hoveredSlice.baseEndAngle) / 2;
      const hoveredNewStart = hoveredCenterAngle - hoveredNewAngle / 2;
      const globalOffset = hoveredNewStart - hoveredSlice.baseStartAngle;

      // 从固定起始点开始，顺序计算每个扇形的新角度
      let currentAngle = -Math.PI / 2 + globalOffset;

      for (let i = 0; i < slices.length; i++) {
        const newAngle = (i === hoveredIndex) ? hoveredNewAngle : (slices[i].baseEndAngle - slices[i].baseStartAngle) * shrinkFactor;
        targetAngles[i] = {
          start: currentAngle,
          end: currentAngle + newAngle
        };
        currentAngle += newAngle;
      }
    } else {
      // 没有悬停时，使用原始角度
      for (let i = 0; i < slices.length; i++) {
        targetAngles[i] = {
          start: slices[i].baseStartAngle,
          end: slices[i].baseEndAngle
        };
      }
    }
    // ===============================================================

    // 计算每个扇形的动画状态
    slices.forEach((slice, index) => {
      const isTargetHovered = index === hoveredIndex;
      const wasHovered = index === state.hoveredIndex;

      // 目标半径
      const targetRadius = isTargetHovered ? baseRadius * 1.1 :
                          (hoveredIndex !== -1 ? baseRadius * 0.95 : baseRadius);

      // 当前半径（插值）
      if (isAnimating) {
        const startRadius = slice.currentRadius;
        slice.currentRadius = startRadius + (targetRadius - startRadius) * progress;
      } else {
        slice.currentRadius = targetRadius;
      }

      // 使用预先计算的目标角度
      const targetStartAngle = targetAngles[index].start;
      const targetEndAngle = targetAngles[index].end;

      // 角度插值
      if (isAnimating) {
        slice.currentStartAngle = slice.currentStartAngle + (targetStartAngle - slice.currentStartAngle) * progress;
        slice.currentEndAngle = slice.currentEndAngle + (targetEndAngle - slice.currentEndAngle) * progress;
      } else {
        slice.currentStartAngle = targetStartAngle;
        slice.currentEndAngle = targetEndAngle;
      }

      const radius = slice.currentRadius;
      const drawStartAngle = slice.currentStartAngle;
      const drawEndAngle = slice.currentEndAngle;

      // 绘制扇形
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, drawStartAngle, drawEndAngle);
      ctx.arc(centerX, centerY, innerRadius, drawEndAngle, drawStartAngle, true);
      ctx.closePath();

      // 添加阴影效果
      if (isTargetHovered || (isAnimating && wasHovered)) {
        const shadowIntensity = isTargetHovered ? progress : (1 - progress);
        ctx.shadowColor = `rgba(0, 0, 0, ${0.4 * shadowIntensity})`;
        ctx.shadowBlur = 15 * shadowIntensity;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = slice.color;
      ctx.fill();

      // 重置阴影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = (isTargetHovered || (isAnimating && wasHovered)) ? 2 + progress : 2;
      ctx.stroke();
    });

    // 绘制文字标签
    slices.forEach((slice, index) => {
      const isTargetHovered = index === hoveredIndex;
      const wasHovered = index === state.hoveredIndex;
      const percentValue = parseFloat(slice.percent);

        // 计算当前扇形的中心角度（使用动态的 currentStartAngle 和 currentEndAngle）
        const currentMidAngle = (slice.currentStartAngle + slice.currentEndAngle) / 2;

        // 计算文字动画状态 - 使用 rawProgress 确保动画完成时状态稳定
        let textProgress;
        if (isAnimating) {
          // 动画进行中
          if (isTargetHovered) {
            // 当前扇形被悬停，文字应该放大
            textProgress = rawProgress;
          } else if (wasHovered) {
            // 之前被悬停，现在取消悬停，文字应该缩小
            textProgress = 1 - rawProgress;
          } else {
            // 其他扇形，保持原样
            textProgress = 0;
          }
        } else {
          // 动画完成，使用最终状态
          textProgress = isTargetHovered ? 1 : 0;
        }

        // 计算文字半径（悬停时向外移动）- 使用动画插值
        const baseExpansionFactor = 1.0;
        const targetExpansionFactor = 1.03;
        const expansionFactor = baseExpansionFactor + (targetExpansionFactor - baseExpansionFactor) * textProgress;
        const labelRadius = ((baseRadius + innerRadius) / 2) * expansionFactor;
        const labelX = centerX + Math.cos(currentMidAngle) * labelRadius;
        const labelY = centerY + Math.sin(currentMidAngle) * labelRadius;

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 悬停时放大文字 - 使用动画插值
        const baseFontSize = 17;
        const targetFontSize = 21;
        const fontSize = baseFontSize + (targetFontSize - baseFontSize) * textProgress;

        const baseSubFontSize = 15;
        const targetSubFontSize = 18;
        const subFontSize = baseSubFontSize + (targetSubFontSize - baseSubFontSize) * textProgress;

        // 字体粗细在进度超过0.5时变为粗体
        const fontBold = textProgress > 0.5 ? 'bold' : 'normal';

        const padding = 50;
        const mightOverflow = labelX < padding || labelX > width - padding ||
                             labelY < padding || labelY > height - padding;

        if (percentValue < 5 || mightOverflow) {
          const lineStartRadius = baseRadius + 5;
          const lineEndRadius = baseRadius + 60;

          let lineEndX = centerX + Math.cos(currentMidAngle) * lineEndRadius;
          let lineEndY = centerY + Math.sin(currentMidAngle) * lineEndRadius;

          const safePadding = 70;
          if (lineEndX < safePadding) lineEndX = safePadding;
          if (lineEndX > width - safePadding) lineEndX = width - safePadding;
          if (lineEndY < safePadding) lineEndY = safePadding;
          if (lineEndY > height - safePadding) lineEndY = height - safePadding;

          const lineStartX = centerX + Math.cos(currentMidAngle) * lineStartRadius;
          const lineStartY = centerY + Math.sin(currentMidAngle) * lineStartRadius;

          ctx.beginPath();
          ctx.moveTo(lineStartX, lineStartY);
          ctx.lineTo(lineEndX, lineEndY);
          ctx.strokeStyle = textProgress > 0.5 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1.5 + textProgress * 0.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(lineStartX, lineStartY, 4 + textProgress, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();

          const textX = lineEndX + (lineEndX > centerX ? 15 : -15);
          const textY = lineEndY;
          ctx.textAlign = lineEndX > centerX ? 'left' : 'right';
          ctx.font = `bold ${16 + textProgress}px Arial`;
          ctx.fillText(`${slice.name} ${slice.percent}%`, textX, textY);
        } else {
          ctx.font = `${fontBold} ${fontSize}px Arial`;
          ctx.fillText(slice.name, labelX, labelY - (9 + textProgress * 2));
          ctx.font = `${subFontSize}px Arial`;
          ctx.fillText(`${slice.percent}%`, labelX, labelY + (9 + textProgress * 2));
        }
      });

    // 绘制中心文字
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Arial';

    // 根据图表类型显示不同的标题
    let centerTitle = '总计';
    if (canvasId.includes('planned')) {
      centerTitle = '分配规划';
    } else if (canvasId.includes('actual')) {
      centerTitle = '实际持有';
    }

    ctx.fillText(centerTitle, centerX, centerY - 12);
    ctx.font = '26px Arial';
    ctx.fillText(formatCurrency(total), centerX, centerY + 26);

    // 继续动画或停止
    if (rawProgress < 1) {
      state.animationFrame = requestAnimationFrame(animate);
    } else {
      state.startTime = null;
    }
  }

  // 开始动画
  animate();

  // 添加鼠标移动事件
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 检查鼠标是否在环形区域内
    if (distance >= innerRadius && distance <= baseRadius * 1.1) {
      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) angle += 2 * Math.PI;
      if (angle < -Math.PI / 2) angle += 2 * Math.PI;

      // 归一化角度到 [0, 2π]
      let normalizedAngle = angle + Math.PI / 2;
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

      // 查找悬停的扇形
      let foundIndex = -1;
      for (let i = 0; i < slices.length; i++) {
        let start = slices[i].baseStartAngle + Math.PI / 2;
        let end = slices[i].baseEndAngle + Math.PI / 2;
        if (normalizedAngle >= start && normalizedAngle < end) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== state.targetHoveredIndex) {
        state.targetHoveredIndex = foundIndex;
        state.startTime = null; // 重置动画时间
        canvas.style.cursor = foundIndex !== -1 ? 'pointer' : 'default';
        animate();
      }
    } else {
      if (state.targetHoveredIndex !== -1) {
        state.targetHoveredIndex = -1;
        state.startTime = null;
        canvas.style.cursor = 'default';
        animate();
      }
    }
  };

  // 鼠标离开时重置
  canvas.onmouseleave = () => {
    if (state.targetHoveredIndex !== -1) {
      state.targetHoveredIndex = -1;
      state.startTime = null;
      canvas.style.cursor = 'default';
      animate();
    }
  };
}

// 绘制分配规划图表
function drawPlannedChart(resetAnimation = false) {
  // 如果需要重置动画，则重置图表状态
  if (resetAnimation) {
    ['planned-chart', 'planned-chart-edit'].forEach(canvasId => {
      if (chartState[canvasId]) {
        chartState[canvasId].initialLoadComplete = false;
        chartState[canvasId].initialLoadStartTime = null;
        chartState[canvasId].valueAnimationStartTime = null;
      }
    });
  }

  const totalAssets = getTotalAssets();
  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#f44336', '#9C27B0', '#00BCD4', '#795548'];

  const plannedData = [];
  let totalPlannedPercentage = 0;

  appState.assets.forEach(asset => {
    let value;
    let percentage;
    if (asset.mode === 'percentage') {
      percentage = asset.plannedValue;
      value = (asset.plannedValue / 100) * totalAssets;
    } else {
      value = asset.plannedValue;
      percentage = totalAssets > 0 ? (asset.plannedValue / totalAssets * 100) : 0;
    }
    totalPlannedPercentage += percentage;
    plannedData.push({ name: asset.name, value: Math.max(0, value), percentage });
  });

  if (totalPlannedPercentage < 100 && totalPlannedPercentage > 0) {
    const unallocatedPercentage = 100 - totalPlannedPercentage;
    const unallocatedValue = (unallocatedPercentage / 100) * totalAssets;
    plannedData.push({
      name: '未分配',
      value: unallocatedValue,
      percentage: unallocatedPercentage
    });
  }

  const plannedColors = [...colors, '#95a5a6'];

  setTimeout(() => {
    drawDonutChart('planned-chart', plannedData, plannedColors, !resetAnimation);
    drawDonutChart('planned-chart-edit', plannedData, plannedColors, !resetAnimation);
  }, 50);
}

// 绘制实际持有图表
function drawActualChart(resetAnimation = false) {
  // 如果需要重置动画，则重置图表状态
  if (resetAnimation) {
    ['actual-chart', 'actual-chart-edit'].forEach(canvasId => {
      if (chartState[canvasId]) {
        chartState[canvasId].initialLoadComplete = false;
        chartState[canvasId].initialLoadStartTime = null;
        chartState[canvasId].valueAnimationStartTime = null;
      }
    });
  }

  const colors = ['#2196F3', '#4CAF50', '#FF9800', '#f44336', '#9C27B0', '#00BCD4', '#795548'];

  const actualData = appState.assets.map(asset => ({
    name: asset.name,
    value: Math.max(0, asset.actualValue)
  }));

  setTimeout(() => {
    drawDonutChart('actual-chart', actualData, colors, !resetAnimation);
    drawDonutChart('actual-chart-edit', actualData, colors, !resetAnimation);
  }, 50);
}

// 绘制所有图表
function drawAllCharts() {
  drawPlannedChart(true);
  drawActualChart(true);
}
