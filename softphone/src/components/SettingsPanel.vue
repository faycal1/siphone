<script setup lang="ts">
import { X, Settings, User, Lock, Globe, Eye, EyeOff } from 'lucide-vue-next';
import { ref, watch } from 'vue';

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

// Extract IP from wsUrl for easier editing
const serverIp = ref(localConfig.value.wsUrl.replace('ws://', '').replace(':8088/ws', ''));

watch(serverIp, (newIp) => {
  localConfig.value.wsUrl = `ws://${newIp}:8088/ws`;
});

const handleSave = () => {
  emit('update', { ...localConfig.value });
  emit('close');
};
</script>

<template>
  <div class="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm transition-all duration-500">
    <div class="glass w-full max-w-[340px] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-white/10 animate-fade-in-scale">
      
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

      <!-- Form Content -->
      <div class="p-8 flex flex-col gap-6">
        
        <!-- Extension Field -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Extension</label>
          <div class="relative group">
            <User class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
              v-model="localConfig.extension"
              type="text" 
              placeholder="e.g. 101"
              class="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-medium outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-white/10"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">SIP Password</label>
          <div class="relative group">
            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
              v-model="localConfig.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              class="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-sm text-white font-medium outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-white/10"
            />
            <button 
              @click="showPassword = !showPassword" 
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/80 transition-colors"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Server IP Field -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Asterisk IP</label>
          <div class="relative group">
            <Globe class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
              v-model="serverIp"
              type="text" 
              placeholder="e.g. 127.0.0.1"
              class="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-medium outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-white/10"
            />
          </div>
          <span class="text-[8px] text-white/20 uppercase tracking-tighter ml-1 font-mono">WS Port: 8088 | Endpoint: /ws</span>
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
