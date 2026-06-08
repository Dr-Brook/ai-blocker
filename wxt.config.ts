import { defineConfig } from 'wxt';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  vite: () => ({
    plugins: [vue()],
  }),
  manifest: {
    name: 'AI Blocker',
    description: 'Block AI content across the web — chat widgets, AI summaries, tracking scripts, and overlays.',
    version: '1.0.0',
    permissions: ['declarativeNetRequest', 'declarativeNetRequestFeedback', 'storage', 'activeTab', 'tabs'],
    host_permissions: ['<all_urls>'],
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '96': 'icon/96.png',
      '128': 'icon/128.png',
    },
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png',
      },
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    declarative_net_request: {
      rule_resources: [
        { id: 'rules_chat-widgets', enabled: true, path: 'rules/chat-widgets.json' },
        { id: 'rules_search-ai', enabled: true, path: 'rules/search-ai.json' },
        { id: 'rules_content-ai', enabled: true, path: 'rules/content-ai.json' },
        { id: 'rules_social-ai', enabled: true, path: 'rules/social-ai.json' },
        { id: 'rules_tracking', enabled: true, path: 'rules/tracking.json' },
        { id: 'rules_overlays', enabled: true, path: 'rules/overlays.json' },
      ],
    },
  },
});