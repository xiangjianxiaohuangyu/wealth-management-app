const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// 配置日志
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// 配置自动更新行为
autoUpdater.autoDownload = true;  // 自动下载更新（无需用户手动点击）
autoUpdater.autoInstallOnAppQuit = false;  // 不在退出时自动安装，而是提示用户
log.info('App starting...');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#f5f7fa',
    title: '财富管理 - Wealth Management',
    autoHideMenuBar: true
  });

  mainWindow = win;
  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 设置自动更新
  setupAutoUpdater();

  // 应用启动后自动检查更新（延迟1秒）
  setTimeout(() => {
    // 配置更新服务器地址
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'xiangjianxiaohuangyu',
      repo: 'wealth-management-app'
    });

    // 检查更新
    autoUpdater.checkForUpdates();
  }, 1000);
}

// 保存计划到本地文件
ipcMain.handle('save-plan-to-file', async (event, planName, planData) => {
  const plansDir = path.join(app.getPath('userData'), 'plans');

  // 确保目录存在
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }

  const fileName = `${planName}.json`;
  const filePath = path.join(plansDir, fileName);

  try {
    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['覆盖', '取消'],
        defaultId: 1,
        title: '文件已存在',
        message: `计划 "${planName}" 已存在，是否覆盖？`
      });

      if (result.response === 1) {
        return { success: false, cancelled: true };
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(planData, null, 2), 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取已保存的计划列表
ipcMain.handle('get-saved-plans', async () => {
  const plansDir = path.join(app.getPath('userData'), 'plans');

  if (!fs.existsSync(plansDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(plansDir).filter(file => file.endsWith('.json'));
    const plans = files.map(file => {
      const filePath = path.join(plansDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file.replace('.json', ''),
        path: filePath,
        modified: stats.mtime
      };
    });

    // 按修改时间排序（最新的在前）
    plans.sort((a, b) => b.modified - a.modified);

    return plans;
  } catch (error) {
    console.error('Error reading plans:', error);
    return [];
  }
});

// 加载指定计划
ipcMain.handle('load-plan-from-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取计划目录路径
ipcMain.handle('get-plans-directory', async () => {
  return path.join(app.getPath('userData'), 'plans');
});

// 删除计划文件
ipcMain.handle('delete-plan-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    } else {
      return { success: false, error: '文件不存在' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取应用版本号
ipcMain.handle('get-app-version', async () => {
  const packagePath = path.join(__dirname, '../../package.json');
  console.log('Reading package.json from:', packagePath);
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    console.log('Package version:', packageData.version);
    return packageData.version || '0.0.0';
  } catch (error) {
    console.error('Error reading package.json:', error);
    return '0.0.0';
  }
});

// ========== 自动更新功能 ==========

let mainWindow = null;

// 检查更新
ipcMain.handle('check-for-updates', async () => {
  try {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    log.error('Error checking for updates:', error);
    return { success: false, error: error.message };
  }
});

// 下载更新
ipcMain.handle('download-update', async () => {
  try {
    log.info('Downloading update...');
    autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    log.error('Error downloading update:', error);
    return { success: false, error: error.message };
  }
});

// 安装更新并重启
ipcMain.handle('install-update', async () => {
  try {
    log.info('Installing update...');
    // 使用静默安装模式，isSilent=true 表示不显示安装界面
    // isForceRunAfter=true 表示安装完成后自动运行应用
    autoUpdater.quitAndInstall(true, true);
    return { success: true };
  } catch (error) {
    log.error('Error installing update:', error);
    return { success: false, error: error.message };
  }
});

// 自动更新事件处理
function setupAutoUpdater() {
  // 当发现可用更新时
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        date: info.releaseDate
      });
    }
  });

  // 当没有可用更新时
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', {
        version: info.version
      });
    }
  });

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    log.info('Download progress:', progress);
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        speed: progress.bytesPerSecond
      });
    }
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    }
  });

  // 更新错误
  autoUpdater.on('error', (error) => {
    log.error('Update error:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', {
        message: error.message
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
