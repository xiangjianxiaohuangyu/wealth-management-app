// 格式化货币
function formatCurrency(amount) {
  const symbols = { CNY: '¥', USD: '$', EUR: '€' };
  const symbol = symbols[appState.currency] || '¥';
  return `${symbol} ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 格式化数字为千分位
function formatNumberWithCommas(value) {
  const numValue = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(numValue)) {
    return '0';
  }

  const parts = numValue.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// 从带逗号的字符串解析数字
function parseNumberWithCommas(str) {
  return str.replace(/,/g, '');
}

// 格式化字节数
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
