// 资产总览页面逻辑

// 更新资产总览
function updateOverview() {
  const totalAssets = getTotalAssets();
  const plannedTotal = getPlannedTotal();
  const deviation = totalAssets > 0 ? ((totalAssets - plannedTotal) / plannedTotal * 100) : 0;

  document.getElementById('total-assets').textContent = formatCurrency(totalAssets);
  document.getElementById('planned-assets').textContent = formatCurrency(plannedTotal);
  document.getElementById('deviation').textContent = `${deviation.toFixed(2)}%`;

  const deviationElement = document.getElementById('deviation');
  if (Math.abs(deviation) > appState.deviationThreshold) {
    deviationElement.style.color = 'var(--danger-color)';
  } else {
    deviationElement.style.color = 'var(--success-color)';
  }
}

// 初始化资产总览页面
function initOverview() {
  updateOverview();
}
