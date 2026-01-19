// 更新日志页面逻辑

// 简单的 Markdown 转 HTML 解析器
function parseMarkdown(markdown) {
  if (!markdown) return '<p class="empty-state">暂无内容</p>';

  let html = markdown;

  // 处理代码块 ```code```
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="${lang || ''}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 处理行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 处理标题 # ## ### ####
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 处理粗体 **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 处理斜体 *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 处理链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 处理引用 > text
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // 处理无序列表 - item 或 * item
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // 处理有序列表 1. item
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // 处理水平线 --- 或 ***
  html = html.replace(/^[\-\*]{3,}$/gm, '<hr>');

  // 处理段落
  html = html.replace(/^(?!<[h|u|o|p|b|h])(.+)$/gm, '<p>$1</p>');

  // 清理空标签
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ol>)/g, '$1');
  html = html.replace(/(<\/ol>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');

  return html;
}

// HTML 转义函数
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 解析卡片式功能列表
function parseFeatureCards(markdown) {
  if (!markdown) return '<p class="empty-state">暂无后续更新安排</p>';

  // 分割成不同的功能块
  const sections = markdown.split(/(?=^###\s+)/m).filter(s => s.trim());

  if (sections.length === 0) {
    return '<p class="empty-state">暂无后续更新安排</p>';
  }

  const cards = sections.map(section => {
    // 提取标题 (### 开头)
    const titleMatch = section.match(/^###\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '未命名功能';

    // 提取所有以 - 开头的行
    const lines = section.split('\n').filter(line => line.trim().startsWith('-'));

    let description = '暂无描述';
    let statusText = '计划中';
    let statusClass = 'planned';

    // 第一行是描述
    if (lines.length >= 1) {
      description = lines[0].replace(/^-\s+/, '').trim();
    }

    // 第二行是状态
    if (lines.length >= 2) {
      statusText = lines[1].replace(/^-\s+/, '').trim();

      // 根据状态文本设置样式类
      if (statusText.includes('完成') || statusText.toLowerCase().includes('completed')) {
        statusClass = 'completed';
      } else if (statusText.includes('即将推出') || statusText.toLowerCase().includes('coming soon')) {
        statusClass = 'coming-soon';
      } else {
        statusClass = 'planned';
      }
    }

    return `
      <div class="feature-card">
        <h3 class="feature-card-title">${escapeHtml(title)}</h3>
        <p class="feature-card-description">${escapeHtml(description)}</p>
        <span class="feature-card-status ${statusClass}">${escapeHtml(statusText)}</span>
      </div>
    `;
  }).join('');

  return `<div class="feature-cards-container">${cards}</div>`;
}

// 加载后续更新安排
async function loadUpcomingFeatures() {
  const container = document.getElementById('upcoming-features');

  try {
    const content = await window.electron.readFile('changelog_upcoming.md');
    container.innerHTML = parseFeatureCards(content);
  } catch (error) {
    console.error('加载后续更新安排失败:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>暂无后续更新安排</p>
        <p style="font-size: 14px; margin-top: 8px;">请在项目目录下的 changelog_upcoming.md 文件中添加内容</p>
      </div>
    `;
  }
}

// 加载更新日志
async function loadChangelog() {
  const container = document.getElementById('changelog-list');

  try {
    const content = await window.electron.readFile('changelog.md');
    container.innerHTML = parseMarkdown(content);
  } catch (error) {
    console.error('加载更新日志失败:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>暂无更新日志</p>
        <p style="font-size: 14px; margin-top: 8px;">请在项目目录下的 changelog.md 文件中添加内容</p>
      </div>
    `;
  }
}

// 设置折叠功能
function setupToggle() {
  const headers = document.querySelectorAll('.section-header[data-toggle]');

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const sectionId = header.getAttribute('data-toggle');
      const section = document.getElementById(sectionId);
      const toggleIcon = header.querySelector('.toggle-icon');

      if (section && toggleIcon) {
        section.classList.toggle('collapsed');
        toggleIcon.classList.toggle('collapsed');
      }
    });
  });
}

// 初始化更新日志页面
function initChangelog() {
  loadUpcomingFeatures();
  loadChangelog();
  setupToggle();
}
