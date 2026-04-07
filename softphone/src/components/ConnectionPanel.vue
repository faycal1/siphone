<script setup lang="ts">
import { Signal, Power, Cog } from 'lucide-vue-next';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['connect', 'disconnect', 'open-settings']);
</script>

<template>
  <div class="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
    <div class="flex items-center gap-4">
      <!-- Animated Status Pulse -->
      <div class="relative flex items-center justify-center">
        <div :class="[
          'absolute w-4 h-4 rounded-full animate-ping opacity-20',
          state.isRegistered ? 'bg-accent' : 'bg-rose-500'
        ]"></div>
        <div :class="['w-2 h-2 rounded-full ring-4 ring-white/5 shadow-lg shadow-current', state.isRegistered ? 'bg-accent' : 'bg-rose-500']"></div>
      </div>
      
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span class="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Line {{ config.extension }}</span>
          <div v-if="state.isRegistered" class="px-1.5 py-0.5 rounded-[4px] bg-accent/10 border border-accent/20">
            <span class="text-[8px] font-bold text-accent uppercase">Secure</span>
          </div>
        </div>
        <span class="text-xs font-bold text-white/90 tracking-tight">
          {{ state.isRegistered ? 'Registered — Available' : state.isConnected ? 'Handshake — Waiting' : 'System Offline' }}
        </span>
      </div>
    </div>

    <!-- Top Actions -->
    <div class="flex items-center gap-3">
      <button 
        @click="emit('open-settings')"
        class="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-white/20 hover:text-white/80 hover:bg-white/[0.06] transition-all group"
      >
        <Cog class="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
      </button>

      <div class="w-px h-4 bg-white/10"></div>
      
      <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5">
        <Signal :class="['w-3.5 h-3.5 transition-colors', state.isConnected ? 'text-accent' : 'text-white/20']" />
        <span class="text-[9px] font-bold text-white/40 tracking-tighter">HD Voice</span>
      </div>
      
      <div class="w-px h-4 bg-white/10"></div>
      
      <button 
        @click="state.isConnected ? emit('disconnect') : emit('connect')"
        :class="[
          'p-2 rounded-xl transition-all duration-300 group relative overflow-hidden',
          state.isConnected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' : 'bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30 animate-pulse'
        ]"
      >
        <Power class="w-4 h-4 relative z-10 group-active:scale-90 transition-transform" />
        <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
</style>
