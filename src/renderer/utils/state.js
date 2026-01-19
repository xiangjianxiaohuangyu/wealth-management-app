// 全局状态管理 - 核心状态和持久化

// ========== 状态定义 ==========
// 初始状态
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

// ========== 持久化函数 ==========
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

// ========== 计算函数（跨页面共享）==========
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
