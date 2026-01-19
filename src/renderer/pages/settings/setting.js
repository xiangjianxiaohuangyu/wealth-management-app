// 设置页面逻辑

// ========== 数据管理函数 ==========

// 导出数据
function exportData() {
  const dataStr = JSON.stringify(appState, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wealth-management-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入数据
async function importData() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          Object.assign(appState, imported);
          saveState();
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

// 重置数据
function resetData() {
  const totalInvestment = 380000;
  Object.assign(appState, {
    totalInvestment: totalInvestment,
    assets: [
      { id: 1, name: '股票', mode: 'percentage', plannedValue: 40, actualValue: 152000 },
      { id: 2, name: '债券', mode: 'percentage', plannedValue: 30, actualValue: 114000 },
      { id: 3, name: '黄金', mode: 'percentage', plannedValue: 15, actualValue: 57000 },
      { id: 4, name: '现金', mode: 'percentage', plannedValue: 15, actualValue: 57000 }
    ],
    currency: 'CNY',
    deviationThreshold: 5,
    nextId: 5
  });
  saveState();
}

// ========== 事件处理函数 ==========

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
