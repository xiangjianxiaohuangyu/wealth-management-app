const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

  win.loadFile('index.html');
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
