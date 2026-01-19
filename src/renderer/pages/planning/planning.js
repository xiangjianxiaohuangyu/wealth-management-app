// 计划编辑页面逻辑

// ========== 渲染和交互函数 ==========
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

  let suggestion = '';
  if (Math.abs(deviationPercent) <= 1) {
    suggestion = '<span class="action-suggestion balanced">✓ 平衡</span>';
  } else if (deviation > 0) {
    suggestion = `<span class="action-suggestion sell">需减持 ${formatCurrency(Math.abs(deviation))}</span>`;
  } else {
    suggestion = `<span class="action-suggestion buy">需补仓 ${formatCurrency(Math.abs(deviation))}</span>`;
  }

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
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });

  const nameCell = document.createElement('div');
  nameCell.className = 'row-cell';
  nameCell.style.flex = '1';
  nameCell.style.minWidth = '120px';
  nameCell.appendChild(nameInput);

  const modeToggle = document.createElement('div');
  modeToggle.className = 'mode-toggle';

  const percentageBtn = document.createElement('button');
  percentageBtn.textContent = '固定百分比';
  percentageBtn.className = asset.mode === 'percentage' ? 'active' : '';
  percentageBtn.addEventListener('click', () => {
    updateAssetMode(asset.id, 'percentage');
    renderAssetsList();
    drawPlannedChart();
    updateUnallocatedAmount();
  });

  const amountBtn = document.createElement('button');
  amountBtn.textContent = '固定金额';
  amountBtn.className = asset.mode === 'amount' ? 'active' : '';
  amountBtn.addEventListener('click', () => {
    updateAssetMode(asset.id, 'amount');
    renderAssetsList();
    drawPlannedChart();
    updateUnallocatedAmount();
  });

  modeToggle.appendChild(percentageBtn);
  modeToggle.appendChild(amountBtn);

  const modeCell = document.createElement('div');
  modeCell.className = 'row-cell';
  modeCell.style.flex = '1.5';
  modeCell.appendChild(modeToggle);

  const plannedInput = document.createElement('input');
  plannedInput.type = 'number';
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
  plannedInput.disabled = asset.mode !== 'percentage';
  
  plannedInput.addEventListener('input', (e) => {
    const result = updateAssetPlanned(asset.id, e.target.value);
    if (result && result.adjusted) {
      e.target.value = appState.assets.find(a => a.id === asset.id).plannedValue.toFixed(2);
      showNotification(
        `分配占比超过100%！<br>该资产最大可分配占比为 <strong>${e.target.value}%</strong><br>已自动设置为最大值`,
        'warning'
      );
    }
    updateAssetRowDisplay(asset);
    updateOverview();
    drawPlannedChart();
    updateUnallocatedAmount();
  });
  plannedInput.addEventListener('blur', (e) => {
    if (asset.mode === 'percentage') {
      e.target.value = asset.plannedValue.toFixed(2);
    }
  });
  plannedInput.addEventListener('keydown', (e) => {
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

  const percentLabel = document.createElement('span');
  percentLabel.textContent = '%';
  percentLabel.style.marginLeft = '4px';
  percentLabel.style.fontSize = '12px';
  percentLabel.style.color = 'var(--text-secondary)';
  plannedCell.appendChild(percentLabel);

  const plannedAmountWrapper = document.createElement('div');
  plannedAmountWrapper.style.display = 'flex';
  plannedAmountWrapper.style.alignItems = 'center';
  plannedAmountWrapper.style.gap = '4px';
  plannedAmountWrapper.style.flex = '1';

  const plannedAmountDisplay = document.createElement('input');
  plannedAmountDisplay.type = 'number';
  plannedAmountDisplay.value = plannedAmount.toFixed(2);
  plannedAmountDisplay.disabled = asset.mode !== 'amount';
  plannedAmountDisplay.style.flex = '1';
  plannedAmountDisplay.addEventListener('input', (e) => {
    const result = updateAssetPlannedAmount(asset.id, e.target.value);
    if (result && result.adjusted) {
      e.target.value = appState.assets.find(a => a.id === asset.id).plannedValue.toFixed(2);
      showNotification(
        `分配金额超过总投资！<br>该资产最大可分配金额为 <strong>¥ ${e.target.value}</strong><br>已自动设置为最大值`,
        'warning'
      );
    }
    updateAssetRowDisplay(asset);
    updateOverview();
    drawPlannedChart();
    updateUnallocatedAmount();
  });
  plannedAmountDisplay.addEventListener('keydown', (e) => {
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
    updateAssetRowDisplay(asset);
    updateOverview();
    drawActualChart();
  });
  actualValueDisplay.addEventListener('keydown', (e) => {
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

  const suggestionCell = document.createElement('div');
  suggestionCell.className = 'row-cell';
  suggestionCell.style.flex = '1.5';
  suggestionCell.innerHTML = suggestion;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', () => {
    showConfirm(
      '确定要删除这个资产吗？',
      () => {
        deleteAsset(asset.id);
        renderAssetsList();
        drawAllCharts();
        updateUnallocatedAmount();
      }
    );
  });

  const deleteCell = document.createElement('div');
  deleteCell.className = 'row-cell';
  deleteCell.style.flex = '1';
  deleteCell.appendChild(deleteBtn);

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

// 更新资产行的显示
function updateAssetRowDisplay(asset) {
  const row = document.querySelector(`.asset-row[data-id="${asset.id}"]`);
  if (!row) return;

  const totalAssets = getTotalAssets();
  let plannedAmount;
  let plannedPercent;

  if (asset.mode === 'percentage') {
    plannedAmount = (asset.plannedValue / 100) * totalAssets;
    plannedPercent = asset.plannedValue;

    const plannedAmountInput = row.querySelectorAll('.row-cell')[3].querySelector('input');
    if (plannedAmountInput) {
      plannedAmountInput.value = plannedAmount.toFixed(2);
      plannedAmountInput.disabled = true;
    }

    const plannedPercentInput = row.querySelectorAll('.row-cell')[2].querySelector('input');
    if (plannedPercentInput) {
      plannedPercentInput.disabled = false;
    }
  } else {
    plannedAmount = asset.plannedValue;
    plannedPercent = totalAssets > 0 ? (plannedAmount / totalAssets * 100) : 0;

    const plannedPercentInput = row.querySelectorAll('.row-cell')[2].querySelector('input');
    if (plannedPercentInput) {
      plannedPercentInput.value = plannedPercent.toFixed(2);
      plannedPercentInput.disabled = true;
    }

    const plannedAmountInput = row.querySelectorAll('.row-cell')[3].querySelector('input');
    if (plannedAmountInput) {
      plannedAmountInput.disabled = false;
    }
  }

  const deviation = asset.actualValue - plannedAmount;
  const deviationPercent = plannedAmount > 0 ? (deviation / plannedAmount * 100) : 0;

  const actualPercent = totalAssets > 0 ? (asset.actualValue / totalAssets * 100) : 0;

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

  const tolerance = 0.01;

  if (Math.abs(unallocated) < tolerance) {
    unallocatedLabel.parentElement.style.display = 'none';
    unallocatedElement.classList.remove('over-budget');
  } else if (unallocated < 0) {
    unallocatedLabel.parentElement.style.display = 'flex';
    unallocatedLabel.textContent = '分配超额:';
    unallocatedElement.textContent = `${symbol} ${Math.abs(unallocated).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    unallocatedElement.classList.add('over-budget');
  } else {
    unallocatedLabel.parentElement.style.display = 'flex';
    unallocatedLabel.textContent = '未分配:';
    unallocatedElement.textContent = `${symbol} ${unallocated.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    unallocatedElement.classList.remove('over-budget');
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

    if (Math.abs(deviation) > plannedAmount * 0.01) {
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

// 确认平衡
function confirmRebalance() {
  const totalAssets = getTotalAssets();

  appState.assets.forEach(asset => {
    let plannedAmount;
    if (asset.mode === 'percentage') {
      plannedAmount = (asset.plannedValue / 100) * totalAssets;
    } else {
      plannedAmount = asset.plannedValue;
    }

    asset.actualValue = plannedAmount;
  });

  saveState();

  renderAssetsList();
  updateOverview();
  drawAllCharts();

  closeModal();

  showNotification('已自动平衡，当前金额已调整为计划金额', 'success');
}

// 初始化计划编辑页面
function initPlanning() {
  renderAssetsList();

  const totalInvestmentInput = document.getElementById('total-investment');
  if (totalInvestmentInput) {
    totalInvestmentInput.value = formatNumberWithCommas(appState.totalInvestment);
  }

  updateUnallocatedAmount();
  drawAllCharts();

  // 总投资金额事件监听
  let isComposing = false;

  totalInvestmentInput.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  totalInvestmentInput.addEventListener('compositionend', (e) => {
    isComposing = false;
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
  });

  totalInvestmentInput.addEventListener('focus', (e) => {
    e.target.value = parseNumberWithCommas(e.target.value);
  });

  totalInvestmentInput.addEventListener('blur', (e) => {
    const value = parseNumberWithCommas(e.target.value);
    if (value && !isNaN(parseFloat(value))) {
      if (updateTotalInvestment(value)) {
        renderAssetsList();
        updateOverview();
        drawAllCharts();
        updateUnallocatedAmount();
      }
      e.target.value = formatNumberWithCommas(value);
    } else {
      e.target.value = formatNumberWithCommas(appState.totalInvestment);
    }
  });

  totalInvestmentInput.addEventListener('keydown', (e) => {
    if (isComposing) return;

    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
    ];

    if (allowedKeys.includes(e.key)) {
      if (e.key === 'Enter') {
        e.target.blur();
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) return;

    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  });

  totalInvestmentInput.addEventListener('input', (e) => {
    if (isComposing) return;

    let value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
  });

  // 按钮事件监听
  document.getElementById('btn-add-asset').addEventListener('click', () => {
    addAsset();
    renderAssetsList();
    drawAllCharts();
    updateUnallocatedAmount();
  });

  document.getElementById('btn-rebalance').addEventListener('click', showRebalanceModal);
  document.getElementById('btn-save').addEventListener('click', showSavePlanModal);
  document.getElementById('btn-import-plan').addEventListener('click', showImportPlanModal);

  // 模态框事件监听
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('confirm-rebalance-btn').addEventListener('click', confirmRebalance);

  document.getElementById('close-save-modal').addEventListener('click', closeSavePlanModal);
  document.getElementById('cancel-save-plan').addEventListener('click', closeSavePlanModal);
  document.getElementById('confirm-save-plan').addEventListener('click', savePlanToFile);

  document.getElementById('close-import-modal').addEventListener('click', closeImportPlanModal);
  document.getElementById('cancel-import-plan').addEventListener('click', closeImportPlanModal);
}


// ========== 资产管理函数 ==========
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
  if (isNaN(numValue) || numValue < 0) return false;

  // 如果超过 100，先限制为 100
  if (numValue > 100) {
    numValue = 100;
  }

  let otherPercentageTotal = 0;
  appState.assets.forEach(a => {
    if (a.id !== id && a.mode === 'percentage') {
      otherPercentageTotal += a.plannedValue;
    }
  });

  const maxAllowedPercentage = 100 - otherPercentageTotal;
  const originalInputValue = parseFloat(value);
  let wasAdjusted = false;

  // 如果超过最大允许值，调整为最大值
  if (numValue > maxAllowedPercentage) {
    numValue = maxAllowedPercentage;
    wasAdjusted = true;
  }

  // 检查是否被调整（包括超过100的情况）
  if (numValue !== originalInputValue) {
    wasAdjusted = true;
  }

  asset.plannedValue = numValue;
  saveState();
  return { success: true, adjusted: wasAdjusted };
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