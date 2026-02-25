<script setup lang="ts">
import { ref } from "vue";
import { JSONUIProvider, Renderer } from "@json-render/vue";
import { registry } from "~/lib/render/registry";
import { examples } from "~/lib/examples";

const selectedIndex = ref(0);
const selected = computed(() => examples[selectedIndex.value]!);
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Example selector -->
    <nav class="flex gap-1 p-3 overflow-x-auto border-b bg-white shrink-0">
      <button
        v-for="(ex, i) in examples"
        :key="ex.name"
        class="px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors"
        :class="
          i === selectedIndex
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-100 text-gray-700'
        "
        @click="selectedIndex = i"
      >
        {{ ex.name }}
      </button>
    </nav>

    <!-- Render area -->
    <div class="flex-1 flex items-start justify-center overflow-auto p-6">
      <div
        class="bg-white border rounded-lg shadow-sm w-full max-w-[960px] p-6"
      >
        <p class="text-xs text-gray-400 mb-4">
          {{ selected.description }}
        </p>
        <JSONUIProvider
          :key="selectedIndex"
          :registry="registry"
          :initial-state="selected.spec.state ?? {}"
        >
          <Renderer :spec="selected.spec" :registry="registry" />
        </JSONUIProvider>
      </div>
    </div>
  </div>
</template>
