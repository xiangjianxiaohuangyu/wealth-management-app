// 设置页面逻辑

// 导出数据
function handleExportData() {
  exportData();
  showNotification('数据导出成功', 'success');
}

// 导入数据
async function handleImportData() {
  try {
    await importData();
    renderAssetsList();
    updateOverview();
    drawAllCharts();

    const totalInvestmentInput = document.getElementById('total-investment');
    if (totalInvestmentInput) {
      totalInvestmentInput.value = formatNumberWithCommas(appState.totalInvestment);
    }

    showNotification('数据导入成功', 'success');
  } catch (err) {
    showNotification('导入失败：无效的文件格式', 'error');
  }
}

// 重置数据
function handleResetData() {
  showConfirm(
    '确定要重置所有数据吗？<br><br><small>此操作不可恢复！</small>',
    () => {
      resetData();

      const totalInvestmentInput = document.getElementById('total-investment');
      if (totalInvestmentInput) {
        totalInvestmentInput.value = formatNumberWithCommas(appState.totalInvestment);
      }

      renderAssetsList();
      updateOverview();
      drawAllCharts();
      showNotification('数据已重置', 'success');
    }
  );
}

// 初始化设置页面
function initSettings() {
  // 设置初始值
  document.getElementById('currency-select').value = appState.currency;
  document.getElementById('deviation-threshold').value = appState.deviationThreshold;

  // 货币设置变更
  document.getElementById('currency-select').addEventListener('change', (e) => {
    appState.currency = e.target.value;
    saveState();
    updateOverview();
    updateUnallocatedAmount();
  });

  // 偏离度阈值变更
  document.getElementById('deviation-threshold').addEventListener('change', (e) => {
    appState.deviationThreshold = parseFloat(e.target.value);
    saveState();
    renderAssetsList();
  });

  // 数据管理按钮
  document.getElementById('btn-export').addEventListener('click', handleExportData);
  document.getElementById('btn-import').addEventListener('click', handleImportData);
  document.getElementById('btn-reset').addEventListener('click', handleResetData);
}
