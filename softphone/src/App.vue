<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useSIP } from './composables/useSIP';
import ConnectionPanel from './components/ConnectionPanel.vue';
import Dialer from './components/Dialer.vue';
import CallDisplay from './components/CallDisplay.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import AdminDashboard from './components/AdminDashboard.vue';
import { useAdmin } from './composables/useAdmin';
import { Terminal, ShieldCheck, Cpu, RefreshCw } from 'lucide-vue-next';

// Configuration State
const config = ref({
  wsUrl: 'ws://127.0.0.1:8088/ws',
  extension: '101',
  password: '101pass'
});

const isSettingsOpen = ref(false);

const { state, connect, disconnect, makeCall, terminateCall, answerCall, clearLogs } = useSIP();

// Derived State
const serverIp = computed(() => {
  try {
    const url = new URL(config.value.wsUrl);
    return url.hostname;
  } catch (e) {
    return '127.0.0.1';
  }
});

// Persistence Logic
onMounted(() => {
  const saved = localStorage.getItem('sip_config');
  if (saved) {
    try {
      config.value = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved SIP config', e);
    }
  }
});

const updateConfig = (newConfig: any) => {
  config.value = newConfig;
  localStorage.setItem('sip_config', JSON.stringify(newConfig));
};

// Lifecycle Handlers
// Admin Monitoring Logic
const { stats, startMonitoring, stopMonitoring } = useAdmin();

onMounted(() => {
  if (serverIp.value) {
    startMonitoring(serverIp.value);
  }
});

watch(serverIp, (newIp) => {
  if (newIp) {
    startMonitoring(newIp);
  } else {
    stopMonitoring();
  }
});

const handleCall = (target: string) => {
  makeCall(target);
};
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-[#0B0F19] overflow-hidden relative font-sans selection:bg-primary/30">
    
    <!-- Background Immersive Visuals -->
    <div class="absolute inset-0 z-0">
      <div class="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full animate-pulse-slow"></div>
      <div class="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-accent/15 blur-[150px] rounded-full animate-pulse-slow-reverse delay-2000"></div>
      <div class="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-indigo-500/10 blur-[180px] rounded-full animate-pulse-slow-reverse"></div>
    </div>

    <!-- Dashboard Layout Container -->
    <div class="flex flex-row items-stretch justify-center gap-6 relative z-10 max-w-[1400px] w-full px-4">
      
      <!-- Panel 1: Phone Frame (Left) -->
      <div class="w-full max-w-[420px] relative transition-all duration-500">
        <!-- Premium Glass Phone Frame -->
        <div class="glass w-full rounded-[48px] overflow-hidden flex flex-col h-[780px] transition-all duration-700 hover:shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] border-white/10 shrink-0">
          
          <!-- App HUD (Connections & Line Status) -->
          <ConnectionPanel 
            :config="config" 
            :state="state" 
            @connect="connect(config)" 
            @disconnect="disconnect" 
            @open-settings="isSettingsOpen = true"
          />

          <!-- Viewport Activity Area -->
          <main class="flex-1 px-8 py-4 flex flex-col overflow-hidden relative">
            
            <!-- View Transitions -->
            <Transition name="fade-slide" mode="out-in">
              <!-- Active Session Interface -->
              <CallDisplay 
                v-if="state.currentCall" 
                :currentCall="state.currentCall" 
                @hangup="terminateCall" 
                @answer="answerCall" 
              />

              <!-- Standard Dialer Interface -->
              <Dialer 
                v-else 
                :state="state" 
                @call="handleCall" 
              />
            </Transition>
          </main>
        </div>
      </div>

      <!-- Panel 2: Real-time Admin Dashboard (Center) -->
      <div class="flex-1 max-w-[480px] glass rounded-[3rem] h-[780px] flex flex-col overflow-hidden border-white/10 shrink-0 shadow-2xl relative">
        <div class="bg-black/30 border-b border-white/5 backdrop-blur-xl px-8 py-5">
           <div class="flex items-center gap-3">
              <RefreshCw class="w-4 h-4 text-accent" :class="{ 'animate-spin-slow': stats.isPushActive }" />
              <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-[0.4em] text-white">Live Monitoring</span>
                <span v-if="stats.isPushActive" class="text-[7px] font-bold text-accent uppercase tracking-widest mt-0.5 animate-pulse">Push Stream Active</span>
              </div>
            </div>
        </div>
        <div class="flex-1 px-8 py-8 overflow-hidden">
          <AdminDashboard :serverIp="serverIp" />
        </div>
      </div>

      <!-- Panel 3: Side Console Panel (Right) -->
      <div class="flex-1 max-w-[380px] glass rounded-[3rem] h-[780px] flex flex-col overflow-hidden border-white/10 shrink-0 shadow-2xl">
        <!-- Sidebar Header -->
        <div class="bg-black/30 border-b border-white/5 backdrop-blur-xl px-8 py-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Terminal class="w-4 h-4 text-primary" />
              <span class="text-[10px] font-black uppercase tracking-[0.4em] text-white">System Logs</span>
            </div>
            <button 
              @click="clearLogs"
              class="text-[9px] font-bold text-white/20 hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-2 group"
            >
              <span>Clear</span>
              <div class="w-1.5 h-1.5 rounded-full bg-rose-500/20 group-hover:bg-rose-500 transition-colors"></div>
            </button>
          </div>
        </div>

        <!-- Log Content Area (Always Visible) -->
        <div class="flex-1 px-8 py-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 overscroll-contain">
          <TransitionGroup name="log-item" tag="div" class="flex flex-col gap-3">
            <div 
              v-for="(log, i) in state.logs" 
              :key="i" 
              class="flex flex-col gap-1 text-[10px] font-mono leading-relaxed group/log p-3 rounded-lg hover:bg-white/5 transition-colors border-l-2 border-white/5 shadow-sm"
              :class="[
                log.type === 'error' ? 'border-rose-500/30' : 
                log.type === 'success' ? 'border-accent/30' : 
                'border-primary/20'
              ]"
            >
              <div class="flex justify-between items-center opacity-30 text-[8px] uppercase tracking-tighter mb-1 font-sans">
                <span class="font-bold">{{ log.type || 'system' }}</span>
                <span class="tabular-nums">{{ log.time }}</span>
              </div>
              <span :class="[
                log.type === 'error' ? 'text-rose-400' : 
                log.type === 'success' ? 'text-accent' : 
                'text-indigo-100/90'
              ]" class="font-medium tracking-tight break-words">{{ log.msg }}</span>
            </div>
          </TransitionGroup>

          <!-- Empty State -->
          <div v-if="state.logs.length === 0" class="h-full flex flex-col items-center justify-center opacity-10 gap-4">
            <Terminal class="w-12 h-12" />
            <span class="text-[10px] font-black uppercase tracking-[0.4em]">No Events Recorded</span>
          </div>
        </div>

        <div class="px-8 py-5 border-t border-white/5 bg-black/20">
           <div class="flex items-center justify-between text-[9px] font-black tracking-widest text-white/20 uppercase">
             <span>Engine Status</span>
             <span class="text-accent animate-pulse">Live 24/7</span>
           </div>
        </div>
      </div>
    </div>

    <!-- Settings Portal -->
    <Transition name="fade-slide">
      <SettingsPanel 
        v-if="isSettingsOpen" 
        :config="config" 
        @update="updateConfig"
        @close="isSettingsOpen = false"
      />
    </Transition>

    <!-- Infrastructure Indicator Overlays -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center gap-10 opacity-30 select-none hover:opacity-100 transition-opacity duration-700">
      <div class="flex items-center gap-2.5">
        <ShieldCheck class="w-4 h-4 text-accent" />
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">DTLS v1.3</span>
      </div>
      <div class="flex items-center gap-2.5">
        <Cpu class="w-4 h-4 text-primary" />
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">PJSIP Engine</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* View Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1.05);
}

/* Log Item Transitions */
.log-item-enter-active {
  transition: all 0.4s ease-out;
}
.log-item-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

/* Custom Background Animations */
@keyframes pulse-slow-reverse {
  0%, 100% { opacity: 0.2; transform: scale(1.2); }
  50% { opacity: 0.5; transform: scale(1); }
}

.animate-pulse-slow-reverse {
  animation: pulse-slow-reverse 12s ease-in-out infinite;
}

.glass {
  border-radius: 3rem;
}
</style>
