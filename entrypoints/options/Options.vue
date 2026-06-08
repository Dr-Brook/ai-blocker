<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Category {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const categories = ref<Category[]>([]);
const whitelist = ref<string[]>([]);
const newDomain = ref('');
const loading = ref(true);

onMounted(async () => {
  const [cats, list] = await Promise.all([
    browser.runtime.sendMessage({ type: 'GET_CATEGORIES' }),
    browser.runtime.sendMessage({ type: 'GET_WHITELIST' }),
  ]);
  categories.value = cats;
  whitelist.value = list;
  loading.value = false;
});

async function toggleCategory(cat: Category) {
  const result = await browser.runtime.sendMessage({ type: 'TOGGLE_CATEGORY', categoryId: cat.id });
  if (result.success) {
    categories.value = result.categories;
  }
}

async function addWhitelistDomain() {
  const domain = newDomain.value.trim();
  if (!domain) return;
  const result = await browser.runtime.sendMessage({ type: 'ADD_WHITELIST', domain });
  if (result.success) {
    whitelist.value = result.whitelist;
    newDomain.value = '';
  }
}

async function removeWhitelistDomain(domain: string) {
  const result = await browser.runtime.sendMessage({ type: 'REMOVE_WHITELIST', domain });
  if (result.success) {
    whitelist.value = result.whitelist;
  }
}
</script>

<template>
  <div class="options">
    <header>
      <span class="shield">🛡️</span>
      <h1>AI Blocker Settings</h1>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <section class="section">
        <h2>Categories</h2>
        <p class="section-desc">Toggle which types of AI content to block.</p>
        <div class="category-list">
          <div v-for="cat in categories" :key="cat.id" class="category-row" @click="toggleCategory(cat)">
            <div class="category-info">
              <span class="category-label">{{ cat.label }}</span>
              <span class="category-desc">{{ cat.description }}</span>
            </div>
            <div class="toggle-mini" :class="{ active: cat.enabled }">
              <div class="toggle-thumb-mini" />
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Whitelist</h2>
        <p class="section-desc">Sites where AI Blocker is disabled.</p>
        <div class="whitelist-form">
          <input
            v-model="newDomain"
            type="text"
            placeholder="e.g. example.com"
            @keydown.enter="addWhitelistDomain"
          />
          <button @click="addWhitelistDomain">Add</button>
        </div>
        <div class="whitelist-entries" v-if="whitelist.length">
          <div v-for="domain in whitelist" :key="domain" class="whitelist-row">
            <span>{{ domain }}</span>
            <button class="btn-remove" @click="removeWhitelistDomain(domain)">✕</button>
          </div>
        </div>
        <p v-else class="empty">No whitelisted sites</p>
      </section>

      <section class="section">
        <h2>About</h2>
        <p class="section-desc">
          AI Blocker v1.0.0 — Community-driven filter lists for blocking AI content.
        </p>
        <p class="section-desc">
          <a href="https://github.com/Dr-Brook/ai-blocker" target="_blank">GitHub</a> ·
          Contribute filter lists via pull request.
        </p>
      </section>
    </template>
  </div>
</template>