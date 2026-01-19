// 显示通知（替代 alert）
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = message;

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

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 显示确认对话框（替代 confirm）
function showConfirm(message, onConfirm, onCancel) {
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
  cancelBtn.className = 'btn btn-delete';
  cancelBtn.style.cssText = `
    padding: 10px 20px;
    font-size: 14px;
  `;

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确定';
  confirmBtn.className = 'btn btn-confirm';
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

  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };

  confirmBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      if (onCancel) onCancel();
    }
  };
}
