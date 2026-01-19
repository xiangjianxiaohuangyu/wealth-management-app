// 自动更新功能

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
          <button class="btn btn-confirm" id="btn-download-update">
            立即更新
          </button>
          <button class="btn btn-cancel" id="btn-later-update">
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
          <button class="btn btn-confirm" id="btn-install-update">
            立即重启
          </button>
          <button class="btn btn-cancel" id="btn-skip-update">
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
