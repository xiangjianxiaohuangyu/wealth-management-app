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

    ipcRenderer.on('update-available', (event, info) => {
      showUpdateNotification(info);
    });

    ipcRenderer.on('update-not-available', (event, info) => {
      showNotification('当前已是最新版本', 'success');
    });

    ipcRenderer.on('update-download-progress', (event, progress) => {
      showDownloadProgress(progress);
    });

    ipcRenderer.on('update-downloaded', (event, info) => {
      showUpdateReadyNotification(info);
    });

    ipcRenderer.on('update-error', (event, error) => {
      showNotification(`更新失败: ${error.message}`, 'error');
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

// 显示更新就绪通知
function showUpdateReadyNotification(info) {
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

// 显示保存计划弹窗
async function showSavePlanModal() {
  const modal = document.getElementById('save-plan-modal');
  const saveLocation = document.getElementById('save-location');

  document.getElementById('plan-name').value = '';

  try {
    const plansDir = await window.electronInvoke('get-plans-directory');
    saveLocation.textContent = plansDir;
  } catch (error) {
    saveLocation.textContent = '无法获取保存位置';
  }

  modal.classList.add('active');

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
            <button class="btn btn-confirm btn-load-plan">加载</button>
            <button class="btn btn-delete btn-delete-plan">删除</button>
          </div>
        `;

        const loadBtn = item.querySelector('.btn-load-plan');
        loadBtn.addEventListener('click', () => loadPlan(plan.path, plan.name));

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
      Object.assign(appState, result.data);
      saveState();

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
