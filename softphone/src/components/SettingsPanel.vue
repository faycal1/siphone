<script setup lang="ts">
import { X, Settings, User, Lock, Globe, Eye, EyeOff } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps<{
  config: {
    wsUrl: string;
    extension: string;
    password: string;
    turnUrl?: string;
    turnUser?: string;
    turnPass?: string;
  }
}>();

const emit = defineEmits(['update', 'close']);

const localConfig = ref({ 
  turnUrl: '',
  turnUser: '',
  turnPass: '',
  ...props.config 
});
const showPassword = ref(false);
const showAdvanced = ref(false);

// Presets Definition
const presets = [
  {
    name: 'Local Dev',
    wsUrl: 'ws://127.0.0.1:8088/ws',
    extension: '101',
    password: '101pass',
    turnUrl: '',
    turnUser: '',
    turnPass: ''
  },
  {
    name: 'CSC360 Demo',
    wsUrl: import.meta.env.VITE_REMOTE_WS_URL ,
    extension: import.meta.env.VITE_REMOTE_EXTENSION ,
    password: import.meta.env.VITE_REMOTE_PASSWORD,
    turnUrl: '',
    turnUser: '',
    turnPass: ''
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
  <div class="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-[2px] transition-all duration-500">
    <div class="glass w-full max-w-[380px] rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-[var(--border-main)] animate-fade-in-scale bg-[var(--bg-main)]">
      
      <!-- Header -->
      <div class="px-8 py-6 border-b border-[var(--border-main)] bg-[var(--bg-card)] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Settings class="w-4 h-4 text-primary" />
          </div>
          <span class="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-main)]">SIP Config</span>
        </div>
        <button @click="emit('close')" class="p-2 rounded-full hover:bg-[var(--bg-glass-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Presets Section -->
      <div class="px-8 pt-6">
        <label class="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 mb-3 block">Quick Presets</label>
        <div class="grid grid-cols-2 gap-3">
          <button 
            v-for="preset in presets" 
            :key="preset.name"
            @click="applyPreset(preset)"
            class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-glass-hover)] transition-all group"
          >
            <span class="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{{ preset.name }}</span>
            <span class="text-[7px] text-[var(--text-muted)] tracking-tighter truncate w-full text-center">{{ preset.wsUrl }}</span>
          </button>
        </div>
      </div>

      <!-- Form Content -->
      <div class="p-8 flex flex-col gap-6">
        
        <div class="grid grid-cols-2 gap-4">
          <!-- Extension Field -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Extension</label>
            <div class="relative group">
              <User class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" />
              <input 
                v-model="localConfig.extension"
                type="text" 
                placeholder="100"
                class="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3.5 pl-12 pr-4 text-sm text-[var(--text-main)] font-medium outline-none focus:border-primary/50 focus:bg-[var(--bg-glass-hover)] transition-all placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Secret</label>
            <div class="relative group">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" />
              <input 
                v-model="localConfig.password"
                :type="showPassword ? 'text' : 'password'" 
                placeholder="••••"
                class="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3.5 pl-12 pr-12 text-sm text-[var(--text-main)] font-medium outline-none focus:border-primary/50 focus:bg-[var(--bg-glass-hover)] transition-all placeholder:text-[var(--text-muted)]"
              />
              <button 
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- WebSocket URL Field -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">WebSocket URL</label>
          <div class="relative group">
            <Globe class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" />
            <input 
              v-model="localConfig.wsUrl"
              type="text" 
              placeholder="ws://...:8088/ws"
              class="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3.5 pl-12 pr-4 text-sm text-[var(--text-main)] font-medium outline-none focus:border-primary/50 focus:bg-[var(--bg-glass-hover)] transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
          <span class="text-[8px] text-[var(--text-muted)] uppercase tracking-tighter ml-1 font-mono">Full WS/WSS Endpoint Path</span>
        </div>

        <!-- Advanced Toggle -->
        <div class="flex flex-col gap-4">
          <button 
            @click="showAdvanced = !showAdvanced"
            class="flex items-center justify-between px-1 py-1 group"
          >
            <span class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-primary transition-colors">Advanced Settings</span>
            <div class="h-[1px] flex-1 mx-4 bg-[var(--border-main)] opacity-50"></div>
            <Settings class="w-3 h-3 text-[var(--text-muted)] group-hover:rotate-45 transition-all" />
          </button>

          <div v-if="showAdvanced" class="flex flex-col gap-5 animate-fade-in">
            <!-- TURN URL -->
            <div class="flex flex-col gap-2">
              <label class="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">TURN Relay (Optional)</label>
              <input 
                v-model="localConfig.turnUrl"
                type="text" 
                placeholder="turn:your-server.com:3478"
                class="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-xs text-[var(--text-main)] outline-none focus:border-primary/50 transition-all font-mono"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- TURN User -->
              <div class="flex flex-col gap-2">
                <label class="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Relay User</label>
                <input 
                  v-model="localConfig.turnUser"
                  type="text" 
                  placeholder="user"
                  class="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-xs text-[var(--text-main)] outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <!-- TURN Password -->
              <div class="flex flex-col gap-2">
                <label class="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Relay Key</label>
                <input 
                  v-model="localConfig.turnPass"
                  type="password" 
                  placeholder="••••"
                  class="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl py-3 px-4 text-xs text-[var(--text-main)] outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <span class="text-[8px] text-[var(--text-muted)] italic leading-relaxed px-1">Use TURN if calls connect but have no audio on remote networks.</span>
          </div>
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
