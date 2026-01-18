// 全局状态管理
const appState = {
  totalInvestment: 380000,
  assets: [
    {
      id: 1,
      name: '股票',
      mode: 'percentage',
      plannedValue: 40,
      actualValue: 150000
    },
    {
      id: 2,
      name: '债券',
      mode: 'percentage',
      plannedValue: 30,
      actualValue: 100000
    },
    {
      id: 3,
      name: '黄金',
      mode: 'percentage',
      plannedValue: 15,
      actualValue: 50000
    },
    {
      id: 4,
      name: '现金',
      mode: 'percentage',
      plannedValue: 15,
      actualValue: 80000
    }
  ],
  currency: 'CNY',
  deviationThreshold: 5,
  nextId: 5
};

// 从 localStorage 加载数据
function loadState() {
  const saved = localStorage.getItem('wealthManagementState');
  if (saved) {
    try {
      Object.assign(appState, JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }
}

// 保存数据到 localStorage
function saveState() {
  localStorage.setItem('wealthManagementState', JSON.stringify(appState));
}

// 计算总资产
function getTotalAssets() {
  return appState.totalInvestment || 0;
}

// 计算计划总金额
function getPlannedTotal() {
  let total = 0;
  appState.assets.forEach(asset => {
    if (asset.mode === 'percentage') {
      total += (asset.plannedValue / 100) * getTotalAssets();
    } else {
      total += asset.plannedValue;
    }
  });
  return total;
}

// 更新总投资金额
function updateTotalInvestment(value) {
  let numValue = parseFloat(value);

  if (isNaN(numValue) || numValue < 0) {
    return false;
  }

  appState.totalInvestment = numValue;
  saveState();
  return true;
}

// 添加资产
function addAsset() {
  let assetNumber = 1;
  let newName;
  let nameExists;

  do {
    newName = `新资产${assetNumber}`;
    nameExists = appState.assets.some(asset => asset.name === newName);
    if (nameExists) {
      assetNumber++;
    }
  } while (nameExists);

  const newAsset = {
    id: appState.nextId++,
    name: newName,
    mode: 'percentage',
    plannedValue: 0,
    actualValue: 0
  };

  appState.assets.push(newAsset);
  saveState();
  return newAsset;
}

// 删除资产
function deleteAsset(id) {
  appState.assets = appState.assets.filter(a => a.id !== id);
  saveState();
}

// 更新资产名称
function updateAssetName(id, name) {
  const asset = appState.assets.find(a => a.id === id);
  if (!asset) return false;

  const duplicate = appState.assets.find(a => a.id !== id && a.name === name);
  if (duplicate) return false;

  asset.name = name;
  saveState();
  return true;
}

// 更新资产模式
function updateAssetMode(id, mode) {
  const asset = appState.assets.find(a => a.id === id);
  if (!asset) return;

  const totalAssets = getTotalAssets();

  if (mode === 'amount' && asset.mode === 'percentage') {
    asset.plannedValue = (asset.plannedValue / 100) * totalAssets;
  } else if (mode === 'percentage' && asset.mode === 'amount') {
    asset.plannedValue = totalAssets > 0 ? (asset.plannedValue / totalAssets * 100) : 0;
  }

  asset.mode = mode;
  saveState();
}

// 更新计划值（百分比）
function updateAssetPlanned(id, value) {
  const asset = appState.assets.find(a => a.id === id);
  if (!asset || asset.mode !== 'percentage') return false;

  let numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0 || numValue > 100) return false;

  let otherPercentageTotal = 0;
  appState.assets.forEach(a => {
    if (a.id !== id && a.mode === 'percentage') {
      otherPercentageTotal += a.plannedValue;
    }
  });

  const maxAllowedPercentage = 100 - otherPercentageTotal;
  if (numValue > maxAllowedPercentage) {
    numValue = maxAllowedPercentage;
  }

  asset.plannedValue = numValue;
  saveState();
  return { success: true, adjusted: numValue !== parseFloat(value) };
}

// 更新计划金额（金额模式）
function updateAssetPlannedAmount(id, value) {
  const asset = appState.assets.find(a => a.id === id);
  if (!asset || asset.mode !== 'amount') return false;

  let numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0) return false;

  let otherAssetsTotal = 0;
  appState.assets.forEach(a => {
    if (a.id !== id) {
      if (a.mode === 'percentage') {
        otherAssetsTotal += (a.plannedValue / 100) * appState.totalInvestment;
      } else {
        otherAssetsTotal += a.plannedValue;
      }
    }
  });

  const maxAllowedAmount = appState.totalInvestment - otherAssetsTotal;
  if (numValue > maxAllowedAmount) {
    numValue = maxAllowedAmount;
  }

  asset.plannedValue = numValue;
  saveState();
  return { success: true, adjusted: numValue !== parseFloat(value) };
}

// 更新实际值
function updateAssetActual(id, value) {
  const asset = appState.assets.find(a => a.id === id);
  if (!asset) return false;

  let numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0) return false;

  asset.actualValue = numValue;
  saveState();
  return true;
}

// 获取资产
function getAsset(id) {
  return appState.assets.find(a => a.id === id);
}

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
