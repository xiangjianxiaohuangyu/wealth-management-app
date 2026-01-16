// 全局状态管理
let appState = {
  totalInvestment: 380000, // 总投资金额
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

// 图表交互状态
const chartState = {};

// 从 localStorage 加载数据
function loadState() {
  const saved = localStorage.getItem('wealthManagementState');
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }
}

// 保存数据到 localStorage
function saveState() {
  localStorage.setItem('wealthManagementState', JSON.stringify(appState));
}

// 加载应用版本号
async function loadAppVersion() {
  try {
    const version = await window.electronInvoke('get-app-version');
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      versionElement.textContent = version;
    }
  } catch (error) {
    console.error('Error loading app version:', error);
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      versionElement.textContent = '0.0.0';
    }
  }
}

// ========== 自动更新功能 ==========

// 设置更新监听器
function setupUpdateListeners() {
  if (window.require) {
    const { ipcRenderer } = window.require('electron');

    // 发现新版本
    ipcRenderer.on('update-available', (event, info) => {
      showUpdateNotification(info);
    });

    // 没有新版本
    ipcRenderer.on('update-not-available', (event, info) => {
      showNotification('当前已是最新版本', 'success');
    });

    // 下载进度
    ipcRenderer.on('update-download-progress', (event, progress) => {
      showDownloadProgress(progress);
    });

    // 更新下载完成
    ipcRenderer.on('update-downloaded', (event, info) => {
      showUpdateReadyNotification(info);
    });

    // 更新错误
    ipcRenderer.on('update-error', (event, error) => {
      // 如果是 GitHub 上没有发布版本，显示为已是最新版本
      if (error.message && error.message.includes('No published version on GitHub')) {
        showNotification('已是最新版本', 'success');
      } else {
        showNotification(`更新失败: ${error.message}`, 'error');
      }
    });
  }
}

// 显示更新通知
function showUpdateNotification(info) {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <div class="update-header">
        <span class="update-icon">🎉</span>
        <h3>发现新版本 v${info.version}</h3>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="update-body">
        <p class="update-message">新版本已发布，点击下方按钮立即更新</p>
        <div class="update-actions">
          <button class="btn btn-primary" id="btn-download-update">
            <span>⬇️</span> 立即更新
          </button>
          <button class="btn btn-secondary" id="btn-later-update">
            稍后提醒
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // 绑定按钮事件
  document.getElementById('btn-download-update').addEventListener('click', async () => {
    notification.remove();
    try {
      await window.electronInvoke('download-update');
      showNotification('开始下载更新...', 'info');
    } catch (error) {
      showNotification('下载更新失败', 'error');
    }
  });

  document.getElementById('btn-later-update').addEventListener('click', () => {
    notification.remove();
  });
}

// 显示下载进度
function showDownloadProgress(progress) {
  let progressNotification = document.querySelector('.download-progress-notification');

  if (!progressNotification) {
    progressNotification = document.createElement('div');
    progressNotification.className = 'notification download-progress-notification';
    document.body.appendChild(progressNotification);
  }

  progressNotification.innerHTML = `
    <div class="progress-content">
      <div class="progress-header">
        <span class="progress-icon">⬇️</span>
        <h4>正在下载更新...</h4>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${progress.percent}%"></div>
      </div>
      <div class="progress-info">
        <span>${Math.floor(progress.percent)}%</span>
        <span>${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}</span>
        <span>${formatBytes(progress.speed)}/s</span>
      </div>
    </div>
  `;
}

// 格式化字节数
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// 显示更新就绪通知
function showUpdateReadyNotification(info) {
  // 移除下载进度通知
  const progressNotification = document.querySelector('.download-progress-notification');
  if (progressNotification) {
    progressNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <div class="update-header">
        <span class="update-icon">✅</span>
        <h3>更新已下载完成</h3>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="update-body">
        <p class="update-message">版本 v${info.version} 已下载完毕，应用将重启以安装更新</p>
        <div class="update-actions">
          <button class="btn btn-success" id="btn-install-update">
            <span>🔄</span> 立即重启
          </button>
          <button class="btn btn-secondary" id="btn-skip-update">
            稍后重启
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // 绑定按钮事件
  document.getElementById('btn-install-update').addEventListener('click', async () => {
    notification.remove();
    try {
      await window.electronInvoke('install-update');
    } catch (error) {
      showNotification('安装更新失败', 'error');
    }
  });

  document.getElementById('btn-skip-update').addEventListener('click', () => {
    notification.remove();
  });
}

// 初始化应用
function init() {
  loadState();
  setupNavigation();
  renderAssetsList();
  updateOverview();
  setupEventListeners();

  // 设置总投资金额的初始值（带千分位）
  const totalInvestmentInput = document.getElementById('total-investment');
  if (totalInvestmentInput) {
    totalInvestmentInput.value = formatNumberWithCommas(appState.totalInvestment);
  }

  // 初始化未分配金额显示
  updateUnallocatedAmount();

  drawAllCharts();

  // 加载版本号
  loadAppVersion();

  // 设置自动更新监听
  setupUpdateListeners();
}

// 导航设置
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageName = item.getAttribute('data-page');

      // 更新导航状态
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // 切换页面
      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(`page-${pageName}`).classList.add('active');

      // 重新绘制图表（如果切换到计划编辑页面）
      if (pageName === 'planning') {
        setTimeout(() => drawAllCharts(), 100);
      }
    });
  });
}

// 设置事件监听器
function setupEventListeners() {
  // 添加资产
  document.getElementById('btn-add-asset').addEventListener('click', addAsset);

  // 一键平衡
  document.getElementById('btn-rebalance').addEventListener('click', showRebalanceModal);

  // 保存计划
  document.getElementById('btn-save').addEventListener('click', showSavePlanModal);

  // 导入计划
  document.getElementById('btn-import-plan').addEventListener('click', showImportPlanModal);

  // 总投资金额变更
  const totalInvestmentInput = document.getElementById('total-investment');

  // 标记是否正在使用中文输入法
  let isComposing = false;

  // compositionstart：开始使用输入法
  totalInvestmentInput.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  // compositionend：结束使用输入法
  totalInvestmentInput.addEventListener('compositionend', (e) => {
    isComposing = false;
    // 输入法结束后，清空所有非数字内容
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
  });

  // 获得焦点时移除逗号，显示纯数字
  totalInvestmentInput.addEventListener('focus', (e) => {
    e.target.value = parseNumberWithCommas(e.target.value);
  });

  // 失去焦点时添加逗号并保存
  totalInvestmentInput.addEventListener('blur', (e) => {
    const value = parseNumberWithCommas(e.target.value);
    if (value && !isNaN(parseFloat(value))) {
      updateTotalInvestment(value);
      e.target.value = formatNumberWithCommas(value);
    } else {
      // 如果为空或无效，恢复为原值
      e.target.value = formatNumberWithCommas(appState.totalInvestment);
    }
  });

  // keydown事件：阻止非数字字符的输入（但在输入法时不阻止）
  totalInvestmentInput.addEventListener('keydown', (e) => {
    // 如果正在使用输入法，不阻止任何按键
    if (isComposing) {
      return;
    }

    // 允许的特殊按键
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
    ];

    // 如果是允许的特殊按键，不阻止
    if (allowedKeys.includes(e.key)) {
      if (e.key === 'Enter') {
        e.target.blur();
      }
      return;
    }

    // 如果是Ctrl/Cmd组合键（复制、粘贴、剪切等），不阻止
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // 只允许数字0-9
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  });

  // 输入事件：只在非输入法状态下处理
  totalInvestmentInput.addEventListener('input', (e) => {
    // 如果正在使用输入法，不处理
    if (isComposing) {
      return;
    }

    // 移除所有非数字字符
    let value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
  });

  // 关闭平衡模态框
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('confirm-rebalance-btn').addEventListener('click', confirmRebalance);

  // 保存计划模态框
  document.getElementById('close-save-modal').addEventListener('click', closeSavePlanModal);
  document.getElementById('cancel-save-plan').addEventListener('click', closeSavePlanModal);
  document.getElementById('confirm-save-plan').addEventListener('click', savePlanToFile);

  // 导入计划模态框
  document.getElementById('close-import-modal').addEventListener('click', closeImportPlanModal);
  document.getElementById('cancel-import-plan').addEventListener('click', closeImportPlanModal);

  // 设置页面按钮
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('btn-reset').addEventListener('click', resetData);

  // 设置变更
  document.getElementById('currency-select').addEventListener('change', (e) => {
    appState.currency = e.target.value;
    saveState();
    updateOverview();
    updateUnallocatedAmount();
  });

  document.getElementById('deviation-threshold').addEventListener('change', (e) => {
    appState.deviationThreshold = parseFloat(e.target.value);
    saveState();
    renderAssetsList();
  });
}

// 计算总资产
function getTotalAssets() {
  return appState.totalInvestment || 0;
}

// 更新总投资金额
function updateTotalInvestment(value) {
  let numValue = parseFloat(value);

  // 验证是否为有效数字
  if (isNaN(numValue) || numValue < 0) {
    return; // 不更新，维持当前值
  }

  appState.totalInvestment = numValue;
  saveState();
  // 更新显示
  renderAssetsList();
  updateOverview();
  drawAllCharts();
  updateUnallocatedAmount();
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

// 更新未分配金额显示
function updateUnallocatedAmount() {
  const totalInvestment = appState.totalInvestment;
  const totalPlanned = getPlannedTotal();
  const unallocated = totalInvestment - totalPlanned;

  const unallocatedElement = document.getElementById('unallocated-amount');
  const unallocatedLabel = document.querySelector('.unallocated-label');

  if (!unallocatedElement || !unallocatedLabel) {
    return;
  }

  const symbols = { CNY: '¥', USD: '$', EUR: '€' };
  const symbol = symbols[appState.currency] || '¥';

  // 使用小的容差值来判断是否为0（避免浮点数精度问题）
  const tolerance = 0.01;

  if (Math.abs(unallocated) < tolerance) {
    // 未分配金额为0，隐藏整个区域
    unallocatedLabel.parentElement.style.display = 'none';
    unallocatedElement.classList.remove('over-budget');
  } else if (unallocated < 0) {
    // 分配超额，显示"分配超额"
    unallocatedLabel.parentElement.style.display = 'flex';
    unallocatedLabel.textContent = '分配超额:';
    unallocatedElement.textContent = `${symbol} ${Math.abs(unallocated).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    unallocatedElement.classList.add('over-budget');
  } else {
    // 未分配，显示"未分配"
    unallocatedLabel.parentElement.style.display = 'flex';
    unallocatedLabel.textContent = '未分配:';
    unallocatedElement.textContent = `${symbol} ${unallocated.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    unallocatedElement.classList.remove('over-budget');
  }
}

// 格式化货币
function formatCurrency(amount) {
  const symbols = { CNY: '¥', USD: '$', EUR: '€' };
  const symbol = symbols[appState.currency] || '¥';
  return `${symbol} ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 格式化数字为千分位
function formatNumberWithCommas(value) {
  // 确保值是数字类型
  const numValue = typeof value === 'number' ? value : parseFloat(value);

  // 如果是 NaN 或无效数字，返回 '0'
  if (isNaN(numValue)) {
    return '0';
  }

  // 转换为字符串并使用正则表达式添加千分位逗号
  const parts = numValue.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// 从带逗号的字符串解析数字
function parseNumberWithCommas(str) {
  return str.replace(/,/g, '');
}

// 更新资产总览
function updateOverview() {
  const totalAssets = getTotalAssets();
  const plannedTotal = getPlannedTotal();
  const deviation = totalAssets > 0 ? ((totalAssets - plannedTotal) / plannedTotal * 100) : 0;

  document.getElementById('total-assets').textContent = formatCurrency(totalAssets);
  document.getElementById('planned-assets').textContent = formatCurrency(plannedTotal);
  document.getElementById('deviation').textContent = `${deviation.toFixed(2)}%`;

  // 更新偏离度颜色
  const deviationElement = document.getElementById('deviation');
  if (Math.abs(deviation) > appState.deviationThreshold) {
    deviationElement.style.color = 'var(--danger-color)';
  } else {
    deviationElement.style.color = 'var(--success-color)';
  }
}

// 渲染资产列表
function renderAssetsList() {
  const container = document.getElementById('assets-list');
  container.innerHTML = '';

  appState.assets.forEach(asset => {
    const row = createAssetRow(asset);
    container.appendChild(row);
  });

  updateOverview();
}

// 创建资产行
function createAssetRow(asset) {
  const row = document.createElement('div');
  row.className = 'asset-row';
  row.dataset.id = asset.id;

  const totalInvestment = appState.totalInvestment || 0;

  // 计算计划金额
  let plannedAmount;
  if (asset.mode === 'percentage') {
    plannedAmount = (asset.plannedValue / 100) * totalInvestment;
  } else {
    plannedAmount = asset.plannedValue;
  }

  const deviation = asset.actualValue - plannedAmount;
  const deviationPercent = plannedAmount > 0 ? (deviation / plannedAmount * 100) : 0;

  const actualPercent = totalInvestment > 0 ? (asset.actualValue / totalInvestment * 100) : 0;
  const plannedPercent = totalInvestment > 0 ? (plannedAmount / totalInvestment * 100) : 0;

  // 生成操作建议
  let suggestion = '';
  if (Math.abs(deviationPercent) <= 1) {
    suggestion = '<span class="action-suggestion balanced">✓ 平衡</span>';
  } else if (deviation > 0) {
    suggestion = `<span class="action-suggestion sell">需减持 ${formatCurrency(Math.abs(deviation))}</span>`;
  } else {
    suggestion = `<span class="action-suggestion buy">需补仓 ${formatCurrency(Math.abs(deviation))}</span>`;
  }

  // 创建资产名称输入框
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = asset.name;
  nameInput.style.fontSize = '16px';
  nameInput.style.padding = '4px 6px';
  nameInput.style.width = '70px';
  nameInput.style.maxWidth = '150px';


  nameInput.addEventListener('input', (e) => {
    updateAssetName(asset.id, e.target.value);
  });
  nameInput.addEventListener('keydown', (e) => {
    // 回车键确认并失去焦点
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });

  const nameCell = document.createElement('div');
  nameCell.className = 'row-cell';
  nameCell.style.flex = '1';
  nameCell.style.minWidth = '120px';
  nameCell.appendChild(nameInput);

  // 创建模式切换
  const modeToggle = document.createElement('div');
  modeToggle.className = 'mode-toggle';

  const percentageBtn = document.createElement('button');
  percentageBtn.textContent = '固定百分比';
  percentageBtn.className = asset.mode === 'percentage' ? 'active' : '';
  percentageBtn.addEventListener('click', () => updateAssetMode(asset.id, 'percentage'));

  const amountBtn = document.createElement('button');
  amountBtn.textContent = '固定金额';
  amountBtn.className = asset.mode === 'amount' ? 'active' : '';
  amountBtn.addEventListener('click', () => updateAssetMode(asset.id, 'amount'));

  modeToggle.appendChild(percentageBtn);
  modeToggle.appendChild(amountBtn);

  const modeCell = document.createElement('div');
  modeCell.className = 'row-cell';
  modeCell.style.flex = '1.5';
  modeCell.appendChild(modeToggle);

  // 创建计划占比输入框
  const plannedInput = document.createElement('input');
  plannedInput.type = 'number';
  // 根据模式计算显示的百分比
  const displayPercentage = asset.mode === 'percentage'
    ? asset.plannedValue
    : (totalInvestment > 0 ? (asset.plannedValue / totalInvestment * 100) : 0);
  plannedInput.value = displayPercentage.toFixed(2);
  plannedInput.step = '0.01';
  plannedInput.style.flex = '0';
  plannedInput.style.width = '70px';
  plannedInput.style.minWidth = '80px';
  plannedInput.style.fontSize = '13px';
  plannedInput.style.padding = '6px 10px';
  plannedInput.disabled = asset.mode !== 'percentage'; // 百分比模式可编辑
  plannedInput.addEventListener('input', (e) => {
    updateAssetPlanned(asset.id, e.target.value);
  });
  plannedInput.addEventListener('blur', (e) => {
    // 失去焦点时格式化为两位小数
    if (asset.mode === 'percentage') {
      e.target.value = asset.plannedValue.toFixed(2);
    }
  });
  plannedInput.addEventListener('keydown', (e) => {
    // 回车键确认并失去焦点
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });

  const plannedCell = document.createElement('div');
  plannedCell.className = 'row-cell';
  plannedCell.style.flex = '1.5';
  plannedCell.style.display = 'flex';
  plannedCell.style.alignItems = 'center';
  plannedCell.appendChild(plannedInput);

  // 始终显示 % 符号
  const percentLabel = document.createElement('span');
  percentLabel.textContent = '%';
  percentLabel.style.marginLeft = '4px';
  percentLabel.style.fontSize = '12px';
  percentLabel.style.color = 'var(--text-secondary)';
  plannedCell.appendChild(percentLabel);

  // 创建计划金额显示（带人民币符号）
  const plannedAmountWrapper = document.createElement('div');
  plannedAmountWrapper.style.display = 'flex';
  plannedAmountWrapper.style.alignItems = 'center';
  plannedAmountWrapper.style.gap = '4px';
  plannedAmountWrapper.style.flex = '1';

  const plannedAmountDisplay = document.createElement('input');
  plannedAmountDisplay.type = 'number';
  plannedAmountDisplay.value = plannedAmount.toFixed(2);
  plannedAmountDisplay.disabled = asset.mode !== 'amount'; // 金额模式可编辑
  plannedAmountDisplay.style.flex = '1';
  plannedAmountDisplay.addEventListener('input', (e) => {
    updateAssetPlannedAmount(asset.id, e.target.value);
  });
  plannedAmountDisplay.addEventListener('keydown', (e) => {
    // 回车键确认并失去焦点
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });

  const yuanSymbol1 = document.createElement('span');
  yuanSymbol1.textContent = '¥';
  yuanSymbol1.style.fontSize = '12px';
  yuanSymbol1.style.color = 'var(--text-secondary)';

  plannedAmountWrapper.appendChild(plannedAmountDisplay);
  plannedAmountWrapper.appendChild(yuanSymbol1);

  const plannedAmountCell = document.createElement('div');
  plannedAmountCell.className = 'row-cell';
  plannedAmountCell.style.flex = '1.5';
  plannedAmountCell.appendChild(plannedAmountWrapper);

  // 创建当前金额显示（可编辑，带人民币符号）
  const actualValueWrapper = document.createElement('div');
  actualValueWrapper.style.display = 'flex';
  actualValueWrapper.style.alignItems = 'center';
  actualValueWrapper.style.gap = '4px';
  actualValueWrapper.style.flex = '1';

  const actualValueDisplay = document.createElement('input');
  actualValueDisplay.type = 'number';
  actualValueDisplay.value = asset.actualValue.toFixed(2);
  actualValueDisplay.style.flex = '1';
  actualValueDisplay.addEventListener('input', (e) => {
    updateAssetActual(asset.id, e.target.value);
  });
  actualValueDisplay.addEventListener('keydown', (e) => {
    // 回车键确认并失去焦点
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });

  const yuanSymbol2 = document.createElement('span');
  yuanSymbol2.textContent = '¥';
  yuanSymbol2.style.fontSize = '12px';
  yuanSymbol2.style.color = 'var(--text-secondary)';

  actualValueWrapper.appendChild(actualValueDisplay);
  actualValueWrapper.appendChild(yuanSymbol2);

  const actualCell = document.createElement('div');
  actualCell.className = 'row-cell';
  actualCell.style.flex = '1.5';
  actualCell.appendChild(actualValueWrapper);

  // 创建占比情况显示
  const ratioDisplay = document.createElement('div');
  ratioDisplay.className = 'ratio-display';
  ratioDisplay.innerHTML = `
    <div class="ratio-info">
      <span class="ratio-label">计划:</span>
      <span class="ratio-value">${plannedPercent.toFixed(2)}%</span>
    </div>
    <div class="ratio-info">
      <span class="ratio-label">当前:</span>
      <span class="ratio-value ${actualPercent > plannedPercent * 1.05 ? 'high' : actualPercent < plannedPercent * 0.95 ? 'low' : ''}">${actualPercent.toFixed(2)}%</span>
    </div>
  `;

  const ratioCell = document.createElement('div');
  ratioCell.className = 'row-cell';
  ratioCell.style.flex = '2';
  ratioCell.appendChild(ratioDisplay);

  // 创建建议标签
  const suggestionCell = document.createElement('div');
  suggestionCell.className = 'row-cell';
  suggestionCell.style.flex = '1.5';
  suggestionCell.innerHTML = suggestion;

  // 创建删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', () => deleteAsset(asset.id));

  const deleteCell = document.createElement('div');
  deleteCell.className = 'row-cell';
  deleteCell.style.flex = '1';
  deleteCell.appendChild(deleteBtn);

  // 组装所有单元格
  row.appendChild(nameCell);
  row.appendChild(modeCell);
  row.appendChild(plannedCell);
  row.appendChild(plannedAmountCell);
  row.appendChild(actualCell);
  row.appendChild(ratioCell);
  row.appendChild(suggestionCell);
  row.appendChild(deleteCell);

  return row;
}

// 添加资产
function addAsset() {
  // 生成新的资产名称（带有序数字）
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
  renderAssetsList();
  drawAllCharts();
  updateUnallocatedAmount();
}

// 删除资产
function deleteAsset(id) {
  showConfirm(
    '确定要删除这个资产吗？',
    () => {
      appState.assets = appState.assets.filter(a => a.id !== id);
      saveState();
      renderAssetsList();
      drawAllCharts();
      updateUnallocatedAmount();
    }
  );
}

// 更新资产名称
function updateAssetName(id, name) {
  const asset = appState.assets.find(a => a.id === id);
  if (asset) {
    // 检查是否有重复的资产名称（排除自己）
    const duplicate = appState.assets.find(a => a.id !== id && a.name === name);
    if (duplicate) {
      showNotification(`资产名称 "${name}" 已存在，请使用不同的名称`, 'error');
      // 恢复原名称
      const row = document.querySelector(`.asset-row[data-id="${id}"]`);
      if (row) {
        const nameInput = row.querySelector('input[type="text"]');
        if (nameInput) {
          nameInput.value = asset.name;
        }
      }
      return;
    }

    asset.name = name;
    saveState();
    drawAllCharts();
  }
}

// 更新资产模式
function updateAssetMode(id, mode) {
  const asset = appState.assets.find(a => a.id === id);
  if (asset) {
    const totalAssets = getTotalAssets();

    // 如果切换到金额模式，将当前百分比转换为金额
    if (mode === 'amount' && asset.mode === 'percentage') {
      asset.plannedValue = (asset.plannedValue / 100) * totalAssets;
    }
    // 如果切换到百分比模式，将当前金额转换为百分比
    else if (mode === 'percentage' && asset.mode === 'amount') {
      asset.plannedValue = totalAssets > 0 ? (asset.plannedValue / totalAssets * 100) : 0;
    }

    asset.mode = mode;
    saveState();
    renderAssetsList();
    drawAllCharts();
    updateUnallocatedAmount();
  }
}

// 更新计划值（百分比）
function updateAssetPlanned(id, value) {
  const asset = appState.assets.find(a => a.id === id);
  if (asset && asset.mode === 'percentage') {
    let numValue = parseFloat(value);

    // 验证是否为有效数字
    if (isNaN(numValue)) {
      return; // 不更新，维持当前值
    }

    // 百分比必须在 0-100 之间
    if (numValue < 0 || numValue > 100) {
      showNotification('百分比必须在 0-100% 之间', 'error');
      return; // 不更新，维持当前值
    }

    // 计算除了当前资产外的所有其他百分比模式资产的总和
    let otherPercentageTotal = 0;
    appState.assets.forEach(a => {
      if (a.id !== id && a.mode === 'percentage') {
        otherPercentageTotal += a.plannedValue;
      }
    });

    // 计算当前资产可分配的最大百分比
    const maxAllowedPercentage = 100 - otherPercentageTotal;

    // 如果当前输入值超过最大可分配百分比
    if (numValue > maxAllowedPercentage) {
      // 显示警告弹窗
      const maxPercentFormatted = maxAllowedPercentage.toFixed(2);

      showNotification(
        `分配占比超过100%！<br>该资产最大可分配占比为 <strong>${maxPercentFormatted}%</strong><br>已自动设置为最大值`,
        'warning'
      );

      // 自动设置为最大允许值
      numValue = maxAllowedPercentage;

      // 更新输入框显示
      const row = document.querySelector(`.asset-row[data-id="${id}"]`);
      if (row) {
        const plannedPercentInput = row.querySelectorAll('.row-cell')[2].querySelector('input');
        if (plannedPercentInput) {
          plannedPercentInput.value = numValue.toFixed(2);
        }
      }
    }

    asset.plannedValue = numValue;
    saveState();
    // 更新计划金额显示
    updateAssetRowDisplay(asset);
    updateOverview();
    drawAllCharts();
    updateUnallocatedAmount();
  }
}

// 更新计划金额（金额模式）
function updateAssetPlannedAmount(id, value) {
  const asset = appState.assets.find(a => a.id === id);
  if (asset && asset.mode === 'amount') {
    let numValue = parseFloat(value);

    // 验证是否为有效数字
    if (isNaN(numValue)) {
      return; // 不更新，维持当前值
    }

    // 金额不能为负
    if (numValue < 0) {
      showNotification('金额不能为负数', 'error');
      return; // 不更新，维持当前值
    }

    // 计算除了当前资产外的所有其他资产的计划金额总和
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

    // 计算当前资产可分配的最大金额
    const maxAllowedAmount = appState.totalInvestment - otherAssetsTotal;

    // 如果当前输入值超过最大可分配金额
    if (numValue > maxAllowedAmount) {
      // 显示警告弹窗
      const symbols = { CNY: '¥', USD: '$', EUR: '€' };
      const symbol = symbols[appState.currency] || '¥';
      const maxAmountFormatted = maxAllowedAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      showNotification(
        `分配金额超过总投资！<br>该资产最大可分配金额为 <strong>${symbol} ${maxAmountFormatted}</strong><br>已自动设置为最大值`,
        'warning'
      );

      // 自动设置为最大允许值
      numValue = maxAllowedAmount;

      // 更新输入框显示
      const row = document.querySelector(`.asset-row[data-id="${id}"]`);
      if (row) {
        const plannedAmountInput = row.querySelectorAll('.row-cell')[3].querySelector('input');
        if (plannedAmountInput) {
          plannedAmountInput.value = numValue.toFixed(2);
        }
      }
    }

    asset.plannedValue = numValue;
    saveState();
    // 更新计划占比显示
    updateAssetRowDisplay(asset);
    updateOverview();
    drawAllCharts();
    updateUnallocatedAmount();
  }
}

// 更新实际值（当前金额）
function updateAssetActual(id, value) {
  const asset = appState.assets.find(a => a.id === id);
  if (asset) {
    let numValue = parseFloat(value);

    // 验证是否为有效数字
    if (isNaN(numValue)) {
      return; // 不更新，维持当前值
    }

    // 实际金额不能为负
    if (numValue < 0) {
      showNotification('当前金额不能为负数', 'error');
      return; // 不更新，维持当前值
    }

    asset.actualValue = numValue;
    saveState();
    // 不重新渲染整个列表，只更新相关元素
    updateAssetRowDisplay(asset);
    updateOverview();
    drawAllCharts();
  }
}

// 更新资产行的显示（进度条、建议等）
function updateAssetRowDisplay(asset) {
  const row = document.querySelector(`.asset-row[data-id="${asset.id}"]`);
  if (!row) return;

  const totalAssets = getTotalAssets();
  let plannedAmount;
  let plannedPercent;

  if (asset.mode === 'percentage') {
    plannedAmount = (asset.plannedValue / 100) * totalAssets;
    plannedPercent = asset.plannedValue;

    // 更新计划金额显示
    const plannedAmountInput = row.querySelectorAll('.row-cell')[3].querySelector('input');
    if (plannedAmountInput) {
      plannedAmountInput.value = plannedAmount.toFixed(2);
      plannedAmountInput.disabled = false;
    }
  } else {
    plannedAmount = asset.plannedValue;
    plannedPercent = totalAssets > 0 ? (plannedAmount / totalAssets * 100) : 0;

    // 更新计划占比显示
    const plannedPercentInput = row.querySelectorAll('.row-cell')[2].querySelector('input');
    if (plannedPercentInput) {
      plannedPercentInput.value = plannedPercent.toFixed(2);
      plannedPercentInput.disabled = true;
    }
  }

  const deviation = asset.actualValue - plannedAmount;
  const deviationPercent = plannedAmount > 0 ? (deviation / plannedAmount * 100) : 0;

  const actualPercent = totalAssets > 0 ? (asset.actualValue / totalAssets * 100) : 0;

  // 更新占比情况
  const ratioDisplay = row.querySelector('.ratio-display');
  if (ratioDisplay) {
    const actualPercentClass = actualPercent > plannedPercent * 1.05 ? 'high' : actualPercent < plannedPercent * 0.95 ? 'low' : '';
    ratioDisplay.innerHTML = `
      <div class="ratio-info">
        <span class="ratio-label">计划:</span>
        <span class="ratio-value">${plannedPercent.toFixed(2)}%</span>
      </div>
      <div class="ratio-info">
        <span class="ratio-label">当前:</span>
        <span class="ratio-value ${actualPercentClass}">${actualPercent.toFixed(2)}%</span>
      </div>
    `;
  }

  // 更新操作建议
  let suggestion = '';
  if (Math.abs(deviationPercent) <= 1) {
    suggestion = '<span class="action-suggestion balanced">✓ 平衡</span>';
  } else if (deviation > 0) {
    suggestion = `<span class="action-suggestion sell">需减持 ${formatCurrency(Math.abs(deviation))}</span>`;
  } else {
    suggestion = `<span class="action-suggestion buy">需补仓 ${formatCurrency(Math.abs(deviation))}</span>`;
  }

  const suggestionCell = row.querySelectorAll('.row-cell')[6];
  if (suggestionCell) {
    suggestionCell.innerHTML = suggestion;
  }
}

// 显示一键平衡模态框
function showRebalanceModal() {
  const modal = document.getElementById('rebalance-modal');
  const suggestionsContainer = document.getElementById('rebalance-suggestions');

  const totalAssets = getTotalAssets();
  const suggestions = [];

  appState.assets.forEach(asset => {
    let plannedAmount;
    if (asset.mode === 'percentage') {
      plannedAmount = (asset.plannedValue / 100) * totalAssets;
    } else {
      plannedAmount = asset.plannedValue;
    }

    const deviation = asset.actualValue - plannedAmount;

    if (Math.abs(deviation) > plannedAmount * 0.01) { // 超过1%才显示建议
      suggestions.push({
        name: asset.name,
        action: deviation > 0 ? 'sell' : 'buy',
        amount: Math.abs(deviation)
      });
    }
  });

  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = '<p style="text-align: center; color: var(--success-color); font-size: 16px; padding: 20px;">✓ 您的投资组合已经平衡，无需调整！</p>';
  } else {
    suggestionsContainer.innerHTML = suggestions.map(s => `
      <div class="rebalance-item">
        <div class="rebalance-asset">${s.name}</div>
        <div class="rebalance-action ${s.action}">
          <span>${s.action === 'buy' ? '📈 买入' : '📉 卖出'}</span>
          <span class="rebalance-amount">${formatCurrency(s.amount)}</span>
        </div>
      </div>
    `).join('');
  }

  modal.classList.add('active');
}

// 关闭模态框
function closeModal() {
  document.getElementById('rebalance-modal').classList.remove('active');
}

// 确认平衡：将当前金额自动调整为计划金额
function confirmRebalance() {
  const totalAssets = getTotalAssets();

  appState.assets.forEach(asset => {
    let plannedAmount;
    if (asset.mode === 'percentage') {
      plannedAmount = (asset.plannedValue / 100) * totalAssets;
    } else {
      plannedAmount = asset.plannedValue;
    }

    // 将当前金额设置为计划金额
    asset.actualValue = plannedAmount;
  });

  // 保存状态
  saveState();

  // 更新UI
  renderAssetsList();
  updateOverview();
  drawAllCharts();

  // 关闭弹窗
  closeModal();

  // 显示成功通知
  showNotification('已自动平衡，当前金额已调整为计划金额', 'success');
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
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (confirm('导入将覆盖当前数据，确定继续吗？')) {
          appState = imported;
          saveState();
          renderAssetsList();
          updateOverview();
          drawAllCharts();
          alert('数据导入成功！');
        }
      } catch (err) {
        alert('导入失败：无效的文件格式');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// 重置数据
function resetData() {
  showConfirm(
    '确定要重置所有数据吗？<br><br><small>此操作不可恢复！</small>',
    () => {
      const totalInvestment = 380000;
      appState = {
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
      };
      saveState();

      // 更新总投资金额显示（带千分位）
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
    // 绘制空状态
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

  // 第一遍：绘制扇形
  data.forEach((item, index) => {
    if (item.value === 0) return;

    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    // 绘制扇形
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();

    // 绘制边框
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

  // 第二遍：绘制标签
  slices.forEach((slice) => {
    const percentValue = parseFloat(slice.percent);
    const labelRadius = (radius + innerRadius) / 2;
    const labelX = centerX + Math.cos(slice.midAngle) * labelRadius;
    const labelY = centerY + Math.sin(slice.midAngle) * labelRadius;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 如果比例太小（小于5%）或者文字可能超出画布，使用引导线在外面显示
    const padding = 50;
    const mightOverflow = labelX < padding || labelX > width - padding ||
                         labelY < padding || labelY > height - padding;

    if (percentValue < 5 || mightOverflow) {
      const lineStartRadius = radius + 5;
      const lineEndRadius = radius + 60;

      // 计算引导线终点
      let lineEndX = centerX + Math.cos(slice.midAngle) * lineEndRadius;
      let lineEndY = centerY + Math.sin(slice.midAngle) * lineEndRadius;

      // 确保引导线终点在画布内
      const safePadding = 70;
      if (lineEndX < safePadding) lineEndX = safePadding;
      if (lineEndX > width - safePadding) lineEndX = width - safePadding;
      if (lineEndY < safePadding) lineEndY = safePadding;
      if (lineEndY > height - safePadding) lineEndY = height - safePadding;

      const lineStartX = centerX + Math.cos(slice.midAngle) * lineStartRadius;
      const lineStartY = centerY + Math.sin(slice.midAngle) * lineStartRadius;

      // 绘制引导线
      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 绘制小圆点
      ctx.beginPath();
      ctx.arc(lineStartX, lineStartY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      // 绘制文字
      const textX = lineEndX + (lineEndX > centerX ? 15 : -15);
      const textY = lineEndY;
      ctx.textAlign = lineEndX > centerX ? 'left' : 'right';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${slice.name} ${slice.percent}%`, textX, textY);
    } else {
      // 在扇形中间显示文字
      // 显示名称
      ctx.font = 'bold 16px Arial';
      ctx.fillText(slice.name, labelX, labelY - 9);
      // 显示百分比
      ctx.font = '15px Arial';
      ctx.fillText(`${slice.percent}%`, labelX, labelY + 9);
    }
  });

  // 中心文字
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

  // 准备计划分配数据
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

  // 如果总占比小于100%，添加"未分配"区域
  if (totalPlannedPercentage < 100 && totalPlannedPercentage > 0) {
    const unallocatedPercentage = 100 - totalPlannedPercentage;
    const unallocatedValue = (unallocatedPercentage / 100) * totalAssets;
    plannedData.push({
      name: '未分配',
      value: unallocatedValue,
      percentage: unallocatedPercentage
    });
  }

  // 准备实际持有数据
  const actualData = appState.assets.map(asset => ({
    name: asset.name,
    value: Math.max(0, asset.actualValue)
  }));

  // 为"未分配"区域添加灰色
  const plannedColors = [...colors, '#95a5a6'];

  // 绘制四个图表
  setTimeout(() => {
    drawDonutChart('planned-chart', plannedData, plannedColors);
    drawDonutChart('actual-chart', actualData, colors);
    drawDonutChart('planned-chart-edit', plannedData, plannedColors);
    drawDonutChart('actual-chart-edit', actualData, colors);
  }, 50);
}

// 保存计划到文件
async function savePlanToFile() {
  const planNameInput = document.getElementById('plan-name');
  const planName = planNameInput.value.trim();

  if (!planName) {
    showNotification('请输入计划名称', 'error');
    planNameInput.focus();
    return;
  }

  try {
    const result = await window.electronInvoke('save-plan-to-file', planName, appState);

    if (result.success) {
      showNotification(`计划 "${planName}" 已保存！`, 'success');
      closeSavePlanModal();
    } else if (!result.cancelled) {
      showNotification(`保存失败：${result.error}`, 'error');
    }
  } catch (error) {
    console.error('保存计划失败:', error);
    showNotification('保存计划时发生错误', 'error');
  }
}

// 显示通知（替代 alert）
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = message; // 改为 innerHTML 以支持 HTML 标签

  // 根据类型设置背景色
  let backgroundColor;
  if (type === 'success') {
    backgroundColor = 'rgba(76, 175, 80, 0.9)';
  } else if (type === 'error') {
    backgroundColor = 'rgba(244, 67, 54, 0.9)';
  } else if (type === 'warning') {
    backgroundColor = 'rgba(255, 152, 0, 0.9)';
  } else {
    backgroundColor = 'rgba(33, 150, 243, 0.9)';
  }

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    background-color: ${backgroundColor};
    color: white;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    line-height: 1.5;
  `;

  document.body.appendChild(notification);

  // 3秒后自动消失
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 显示确认对话框（替代 confirm）
function showConfirm(message, onConfirm, onCancel) {
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 10000;
    animation: fadeIn 0.2s ease-out;
  `;

  // 创建对话框
  const modal = document.createElement('div');
  modal.className = 'confirm-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--card-bg);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 10001;
    min-width: 400px;
    animation: scaleIn 0.2s ease-out;
  `;

  const content = document.createElement('div');
  content.className = 'confirm-content';
  content.innerHTML = `
    <p style="font-size: 15px; color: var(--text-primary); line-height: 1.6;">${message}</p>
  `;

  const buttons = document.createElement('div');
  buttons.className = 'confirm-buttons';
  buttons.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.style.cssText = `
    padding: 10px 20px;
    font-size: 14px;
  `;

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确定';
  confirmBtn.className = 'btn btn-danger';
  confirmBtn.style.cssText = `
    padding: 10px 20px;
    font-size: 14px;
  `;

  buttons.appendChild(cancelBtn);
  buttons.appendChild(confirmBtn);

  modal.appendChild(content);
  modal.appendChild(buttons);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 取消按钮
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };

  // 确定按钮
  confirmBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };

  // 点击遮罩关闭
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      if (onCancel) onCancel();
    }
  };
}

// 显示保存计划弹窗
async function showSavePlanModal() {
  const modal = document.getElementById('save-plan-modal');
  const saveLocation = document.getElementById('save-location');

  // 清空输入框
  document.getElementById('plan-name').value = '';

  // 获取并显示保存位置
  try {
    const plansDir = await window.electronInvoke('get-plans-directory');
    saveLocation.textContent = plansDir;
  } catch (error) {
    saveLocation.textContent = '无法获取保存位置';
  }

  modal.classList.add('active');

  // 自动聚焦到输入框
  setTimeout(() => {
    document.getElementById('plan-name').focus();
  }, 100);
}

// 关闭保存计划弹窗
function closeSavePlanModal() {
  document.getElementById('save-plan-modal').classList.remove('active');
}

// 显示导入计划弹窗
async function showImportPlanModal() {
  const modal = document.getElementById('import-plan-modal');
  const plansList = document.getElementById('saved-plans-list');

  plansList.innerHTML = '<p class="loading">加载中...</p>';
  modal.classList.add('active');

  try {
    const plans = await window.electronInvoke('get-saved-plans');

    if (plans.length === 0) {
      plansList.innerHTML = `
        <div class="no-plans">
          <div class="no-plans-icon">📂</div>
          <p>还没有保存的计划</p>
          <p style="font-size: 13px; margin-top: 8px;">点击"保存计划"按钮创建您的第一个计划</p>
        </div>
      `;
    } else {
      const container = document.createElement('div');
      container.className = 'saved-plans-container';

      plans.forEach(plan => {
        const date = new Date(plan.modified);
        const dateStr = date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        const item = document.createElement('div');
        item.className = 'plan-item';
        item.dataset.planPath = plan.path;
        item.dataset.planName = plan.name;
        item.innerHTML = `
          <div class="plan-info">
            <div class="plan-name">${escapeHtml(plan.name)}</div>
            <div class="plan-date">保存于: ${dateStr}</div>
          </div>
          <div class="plan-actions">
            <button class="btn btn-primary btn-load-plan">加载</button>
            <button class="btn btn-danger btn-delete-plan">删除</button>
          </div>
        `;

        // 添加加载按钮事件
        const loadBtn = item.querySelector('.btn-load-plan');
        loadBtn.addEventListener('click', () => loadPlan(plan.path, plan.name));

        // 添加删除按钮事件
        const deleteBtn = item.querySelector('.btn-delete-plan');
        deleteBtn.addEventListener('click', () => deletePlan(plan.path, plan.name));

        container.appendChild(item);
      });

      plansList.innerHTML = '';
      plansList.appendChild(container);
    }
  } catch (error) {
    console.error('加载计划列表失败:', error);
    plansList.innerHTML = `
      <div class="no-plans">
        <p>加载失败</p>
        <p style="font-size: 13px; margin-top: 8px;">无法读取已保存的计划</p>
      </div>
    `;
  }
}

// 关闭导入计划弹窗
function closeImportPlanModal() {
  document.getElementById('import-plan-modal').classList.remove('active');
}

// 加载指定计划
async function loadPlan(filePath, planName) {
  try {
    const result = await window.electronInvoke('load-plan-from-file', filePath);

    if (result.success) {
      appState = result.data;
      saveState();

      // 更新总投资金额显示（带千分位）
      const totalInvestmentInput = document.getElementById('total-investment');
      if (totalInvestmentInput) {
        totalInvestmentInput.value = formatNumberWithCommas(appState.totalInvestment);
      }

      renderAssetsList();
      updateOverview();
      drawAllCharts();
      closeImportPlanModal();
      showNotification(`计划 "${planName}" 已成功加载！`, 'success');
    } else {
      showNotification(`加载失败：${result.error}`, 'error');
    }
  } catch (error) {
    console.error('加载计划失败:', error);
    showNotification('加载计划时发生错误', 'error');
  }
}

// 删除计划
async function deletePlan(filePath, planName) {
  showConfirm(
    `确定要删除计划 "${planName}" 吗？<br><br><small>此操作不可恢复</small>`,
    async () => {
      try {
        const result = await window.electronInvoke('delete-plan-file', filePath);

        if (result.success) {
          showNotification(`计划 "${planName}" 已删除`, 'success');
          showImportPlanModal();
        } else {
          showNotification(`删除失败：${result.error}`, 'error');
        }
      } catch (error) {
        console.error('删除计划失败:', error);
        showNotification('删除计划时发生错误', 'error');
      }
    }
  );
}

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Electron IPC 调用包装函数
window.electronInvoke = function(channel, ...args) {
  return new Promise((resolve, reject) => {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke(channel, ...args).then(resolve).catch(reject);
    } else {
      reject(new Error('Not running in Electron'));
    }
  });
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
