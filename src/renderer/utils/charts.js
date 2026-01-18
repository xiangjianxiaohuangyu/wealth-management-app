// 图表交互状态
const chartState = {};

// 绘制环形图
function drawDonutChart(canvasId, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = 500;
  const height = 500;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = '400px';
  canvas.style.height = '400px';

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 50;
  const innerRadius = radius * 0.6;

  ctx.clearRect(0, 0, width, height);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = radius - innerRadius;
    ctx.stroke();

    ctx.fillStyle = '#bdc3c7';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', centerX, centerY);
    return;
  }

  let startAngle = -Math.PI / 2;
  const slices = [];

  data.forEach((item, index) => {
    if (item.value === 0) return;

    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    slices.push({
      name: item.name,
      percent: ((item.value / total) * 100).toFixed(2),
      startAngle,
      endAngle,
      midAngle,
      color: colors[index % colors.length]
    });

    startAngle = endAngle;
  });

  slices.forEach((slice) => {
    const percentValue = parseFloat(slice.percent);
    const labelRadius = (radius + innerRadius) / 2;
    const labelX = centerX + Math.cos(slice.midAngle) * labelRadius;
    const labelY = centerY + Math.sin(slice.midAngle) * labelRadius;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const padding = 50;
    const mightOverflow = labelX < padding || labelX > width - padding ||
                         labelY < padding || labelY > height - padding;

    if (percentValue < 5 || mightOverflow) {
      const lineStartRadius = radius + 5;
      const lineEndRadius = radius + 60;

      let lineEndX = centerX + Math.cos(slice.midAngle) * lineEndRadius;
      let lineEndY = centerY + Math.sin(slice.midAngle) * lineEndRadius;

      const safePadding = 70;
      if (lineEndX < safePadding) lineEndX = safePadding;
      if (lineEndX > width - safePadding) lineEndX = width - safePadding;
      if (lineEndY < safePadding) lineEndY = safePadding;
      if (lineEndY > height - safePadding) lineEndY = height - safePadding;

      const lineStartX = centerX + Math.cos(slice.midAngle) * lineStartRadius;
      const lineStartY = centerY + Math.sin(slice.midAngle) * lineStartRadius;

      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lineStartX, lineStartY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      const textX = lineEndX + (lineEndX > centerX ? 15 : -15);
      const textY = lineEndY;
      ctx.textAlign = lineEndX > centerX ? 'left' : 'right';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${slice.name} ${slice.percent}%`, textX, textY);
    } else {
      ctx.font = 'bold 16px Arial';
      ctx.fillText(slice.name, labelX, labelY - 9);
      ctx.font = '15px Arial';
      ctx.fillText(`${slice.percent}%`, labelX, labelY + 9);
    }
  });

  ctx.fillStyle = '#ecf0f1';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('总计', centerX, centerY - 10);
  ctx.font = '22px Arial';
  ctx.fillText(formatCurrency(total), centerX, centerY + 22);
}

// 绘制所有图表
function drawAllCharts() {
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

  const actualData = appState.assets.map(asset => ({
    name: asset.name,
    value: Math.max(0, asset.actualValue)
  }));

  const plannedColors = [...colors, '#95a5a6'];

  setTimeout(() => {
    drawDonutChart('planned-chart', plannedData, plannedColors);
    drawDonutChart('actual-chart', actualData, colors);
    drawDonutChart('planned-chart-edit', plannedData, plannedColors);
    drawDonutChart('actual-chart-edit', actualData, colors);
  }, 50);
}
