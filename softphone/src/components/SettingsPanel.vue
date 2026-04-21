<script setup lang="ts">
import { X, Settings, User, Lock, Globe, Eye, EyeOff } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps<{
  config: {
    wsUrl: string;
    extension: string;
    password: string;
  }
}>();

const emit = defineEmits(['update', 'close']);

const localConfig = ref({ ...props.config });
const showPassword = ref(false);

// Presets Definition
const presets = [
  {
    name: 'Local Dev',
    wsUrl: 'ws://127.0.0.1:8088/ws',
    extension: '101',
    password: '101pass'
  },
  {
    name: 'CSC360 Demo',
    wsUrl: import.meta.env.VITE_REMOTE_WS_URL || 'wss://demo.cscall360.com:8089/ws',
    extension: import.meta.env.VITE_REMOTE_EXTENSION || '100100',
    password: import.meta.env.VITE_REMOTE_PASSWORD || 'mlsdskys143shjdjh'
  }
];

const applyPreset = (preset: typeof presets[0]) => {
  localConfig.value = { ...preset };
};

const handleSave = () => {
  emit('update', { ...localConfig.value });
  emit('close');
};
</script>

<template>
  <div class="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm transition-all duration-500">
    <div class="glass w-full max-w-[380px] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-white/10 animate-fade-in-scale">
      
      <!-- Header -->
      <div class="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Settings class="w-4 h-4 text-primary" />
          </div>
          <span class="text-sm font-black uppercase tracking-[0.2em] text-white/90">SIP Config</span>
        </div>
        <button @click="emit('close')" class="p-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white/80 transition-all">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Presets Section -->
      <div class="px-8 pt-6">
        <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 mb-3 block">Quick Presets</label>
        <div class="grid grid-cols-2 gap-3">
          <button 
            v-for="preset in presets" 
            :key="preset.name"
            @click="applyPreset(preset)"
            class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
          >
            <span class="text-[10px] font-bold text-white/60 group-hover:text-white transition-colors">{{ preset.name }}</span>
            <span class="text-[7px] text-white/20 tracking-tighter truncate w-full text-center">{{ preset.wsUrl }}</span>
          </button>
        </div>
      </div>

      <!-- Form Content -->
      <div class="p-8 flex flex-col gap-6">
        
        <div class="grid grid-cols-2 gap-4">
          <!-- Extension Field -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Extension</label>
            <div class="relative group">
              <User class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <input 
                v-model="localConfig.extension"
                type="text" 
                placeholder="100"
                class="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-medium outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Secret</label>
            <div class="relative group">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <input 
                v-model="localConfig.password"
                :type="showPassword ? 'text' : 'password'" 
                placeholder="••••"
                class="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-sm text-white font-medium outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-white/10"
              />
              <button 
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- WebSocket URL Field -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">WebSocket URL</label>
          <div class="relative group">
            <Globe class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
              v-model="localConfig.wsUrl"
              type="text" 
              placeholder="ws://...:8088/ws"
              class="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-medium outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-white/10"
            />
          </div>
          <span class="text-[8px] text-white/20 uppercase tracking-tighter ml-1 font-mono">Full WS/WSS Endpoint Path</span>
        </div>

        <!-- Persuasion / Save Button -->
        <button 
          @click="handleSave"
          class="mt-4 w-full bg-primary text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
        >
          Apply Config
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-scale {
  animation: fade-in-scale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes fade-in-scale {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
