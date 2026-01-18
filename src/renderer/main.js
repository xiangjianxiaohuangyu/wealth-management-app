// 主入口文件

// 导航设置
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const pageName = item.getAttribute('data-page');

      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(`page-${pageName}`).classList.add('active');

      if (pageName === 'planning') {
        setTimeout(() => drawAllCharts(), 100);
      }
    });
  });
}

// 初始化应用
function init() {
  loadState();
  setupNavigation();
  initOverview();
  initPlanning();
  initSettings();
  loadAppVersion();
  setupUpdateListeners();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
