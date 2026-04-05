const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const emojiMap = {
  '🎓': '<span data-icon="logo"></span>',
  '🛡️': '<span data-icon="shield"></span>',
  '🌍': '<span data-icon="globe"></span>',
  '💼': '<span data-icon="briefcase"></span>',
  '💰': '<span data-icon="money"></span>',
  '🏦': '<span data-icon="bank"></span>',
  '🤝': '<span data-icon="handshake"></span>',
  '🟢': '<span data-icon="check"></span>',
  '📝': '<span data-icon="applicant"></span>',
  '✅': '<span data-icon="check"></span>',
  '⏳': '<span data-icon="clock"></span>',
  '❌': '<span data-icon="x"></span>',
  '⚠️': '<span data-icon="alert"></span>',
  '👥': '<span data-icon="users"></span>',
  '📄': '<span data-icon="document"></span>',
  '📋': '<span data-icon="list"></span>',
  '💬': '<span data-icon="chat"></span>',
  '🔒': '<span data-icon="lock"></span>',
  '⭐': '<span data-icon="star"></span>',
  '📭': '<span data-icon="inbox"></span>',
  '📧': '<span data-icon="mail"></span>',
  '🏫': '<span data-icon="building"></span>',
  '📅': '<span data-icon="calendar"></span>',
  '📎': '<span data-icon="paperclip"></span>',
  '👤': '<span data-icon="user"></span>',
  '✈️': '<span data-icon="airplane"></span>',
  '💳': '<span data-icon="creditcard"></span>'
};

files.forEach(file => {
  let content = fs.readFileSync(path.join(publicDir, file), 'utf8');
  
  // Inject script
  if (!content.includes('icons.js')) {
    content = content.replace('<script src="/js/api.js"></script>', '<script src="/js/icons.js"></script>\n  <script src="/js/api.js"></script>');
  }

  // Replace emojis in HTML
  for (const [emoji, span] of Object.entries(emojiMap)) {
    content = content.replace(new RegExp(emoji, 'g'), span);
  }

  // Fix template literals in scripts in HTML
  content = content.replace(/['`"](?:🌍|🇪🇬|🇩🇿|🇲🇦|🇮🇳|🇨🇳|🇹🇷|🇮🇶|🇸🇾|🇳🇬|🇻🇳|🇹🇳|🇯🇴|🇵🇰|🇧🇩|🇾🇪)['`"]/g, "getIcon('globe')");
  content = content.replace(/\$\{g.flag\}/g, "${getIcon(g.flag || 'globe', 40)}");
  content = content.replace(/\$\{s.emoji\}/g, "${getIcon(s.icon, 32)}");
  content = content.replace(/\$\{b.serviceEmoji\}/g, "${getIcon(b.serviceIcon, 24)}");
  content = content.replace(/\$\{group.flag\}/g, "${getIcon(group.flag || 'globe', 24)}");
  content = content.replace(/\$\{s.serviceEmoji\}/g, "${getIcon(s.serviceIcon, 24)}");

  fs.writeFileSync(path.join(publicDir, file), content);
});
console.log('HTML files updated.');
