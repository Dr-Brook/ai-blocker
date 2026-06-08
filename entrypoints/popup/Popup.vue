<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Category {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface Stats {
  networkBlocked: number;
  cosmeticHidden: number;
}

const enabled = ref(true);
const categories = ref<Category[]>([]);
const stats = ref<Stats>({ networkBlocked: 0, cosmeticHidden: 0 });
const loading = ref(true);

onMounted(async () => {
  const [isEnabled, cats, s] = await Promise.all([
    browser.runtime.sendMessage({ type: 'GET_ENABLED' }),
    browser.runtime.sendMessage({ type: 'GET_CATEGORIES' }),
    browser.runtime.sendMessage({ type: 'GET_STATS' }),
  ]);
  enabled.value = isEnabled;
  categories.value = cats;
  stats.value = s;
  loading.value = false;
});

async function toggleEnabled() {
  const result = await browser.runtime.sendMessage({ type: 'TOGGLE_ENABLED' });
  if (result.success) {
    enabled.value = result.enabled;
  }
}

async function toggleCategory(cat: Category) {
  const result = await browser.runtime.sendMessage({ type: 'TOGGLE_CATEGORY', categoryId: cat.id });
  if (result.success) {
    categories.value = result.categories;
  }
}

async function resetStats() {
  await browser.runtime.sendMessage({ type: 'RESET_STATS' });
  stats.value = { networkBlocked: 0, cosmeticHidden: 0 };
}

function openOptions() {
  browser.runtime.openOptionsPage();
}

const totalBlocked = () => stats.value.networkBlocked + stats.value.cosmeticHidden;
</script>

<template>
  <div class="popup">
    <header class="header">
      <div class="logo">
        <span class="shield">🛡️</span>
        <h1>AI Blocker</h1>
      </div>
      <div class="master-toggle" @click="toggleEnabled">
        <div class="toggle-track" :class="{ active: enabled }">
          <div class="toggle-thumb" />
        </div>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-number">{{ totalBlocked() }}</span>
          <span class="stat-label">Blocked</span>
        </div>
        <div class="stat">
          <span class="stat-number">{{ stats.networkBlocked }}</span>
          <span class="stat-label">Network</span>
        </div>
        <div class="stat">
          <span class="stat-number">{{ stats.cosmeticHidden }}</span>
          <span class="stat-label">Hidden</span>
        </div>
      </div>

      <div class="categories" v-if="enabled">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="category-row"
          @click="toggleCategory(cat)"
        >
          <div class="category-info">
            <span class="category-label">{{ cat.label }}</span>
            <span class="category-desc">{{ cat.description }}</span>
          </div>
          <div class="toggle-mini" :class="{ active: cat.enabled }">
            <div class="toggle-thumb-mini" />
          </div>
        </div>
      </div>

      <div class="disabled-overlay" v-if="!enabled">
        <p>AI Blocker is paused</p>
        <button class="btn-enable" @click="toggleEnabled">Enable</button>
      </div>

      <footer class="footer">
        <button class="footer-btn" @click="resetStats">Reset Stats</button>
        <button class="footer-btn" @click="openOptions">Settings</button>
      </footer>
    </template>
  </div>
</template>