<script setup lang="ts">
import { Signal, Power, Cog, Sun, Moon } from 'lucide-vue-next';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  },
  isDarkMode: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['connect', 'disconnect', 'open-settings', 'toggle-theme']);
</script>

<template>
  <div class="px-6 py-5 flex items-center justify-between border-b border-[var(--border-main)] bg-card backdrop-blur-md transition-colors duration-500">
    <!-- Left: Identity & Status -->
    <div class="flex items-center gap-5">
      <!-- Animated Status Pulse -->
      <div class="relative flex items-center justify-center">
        <div :class="[
          'absolute w-5 h-5 rounded-full animate-ping opacity-20',
          state.isRegistered ? 'bg-accent' : 'bg-rose-500'
        ]"></div>
        <div :class="['w-2.5 h-2.5 rounded-full ring-4 ring-white/5 shadow-lg shadow-current', state.isRegistered ? 'bg-accent' : 'bg-rose-500']"></div>
      </div>
      
      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-3">
          <span class="text-[11px] font-black text-text tracking-wider">Line {{ config.extension }}</span>
          <div v-if="state.isRegistered" class="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
            <span class="text-[7px] font-black text-accent uppercase tracking-widest">Secure</span>
          </div>
        </div>
        <span class="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">
          {{ state.isRegistered ? 'Registered — Available' : state.isConnected ? 'Waiting Handshake' : 'System Offline' }}
        </span>
      </div>
    </div>

    <!-- Right: Controls -->
    <div class="flex items-center gap-5">
      <!-- Theme & Settings Group -->
      <div class="flex items-center gap-2 p-1 rounded-xl bg-background/40 border border-[var(--border-main)]">
        <button 
          @click="emit('toggle-theme')"
          class="p-2 rounded-lg text-text-muted hover:text-text hover:bg-[var(--bg-glass-hover)] transition-all"
          title="Toggle Theme"
        >
          <Sun v-if="!isDarkMode" class="w-3.5 h-3.5" />
          <Moon v-else class="w-3.5 h-3.5" />
        </button>

        <button 
          @click="emit('open-settings')"
          class="p-2 rounded-lg text-text-muted hover:text-text hover:bg-[var(--bg-glass-hover)] transition-all"
          title="Settings"
        >
          <Cog class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Voice Status -->
      <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-[var(--border-main)]">
        <Signal :class="['w-3 h-3', state.isConnected ? 'text-accent' : 'text-text-muted']" />
        <span class="text-[8px] font-black text-text-muted uppercase tracking-widest">HD Voice</span>
      </div>
      
      <!-- Power Control -->
      <button 
        @click="state.isConnected ? emit('disconnect') : emit('connect')"
        :class="[
          'p-3 rounded-2xl transition-all duration-300 relative group overflow-hidden',
          state.isConnected ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 shadow-lg shadow-rose-500/10' : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 animate-pulse-slow'
        ]"
      >
        <Power class="w-3.5 h-3.5 relative z-10 group-active:scale-90 transition-transform" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
</style>
