<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useSIP } from './composables/useSIP';
import ConnectionPanel from './components/ConnectionPanel.vue';
import Dialer from './components/Dialer.vue';
import CallDisplay from './components/CallDisplay.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import AdminDashboard from './components/AdminDashboard.vue';
import { useAdmin } from './composables/useAdmin';
import { Terminal, ShieldCheck, Cpu, RefreshCw, Activity, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const showStats = ref(false);
const showLogs = ref(false);
const isDarkMode = ref(true);

// Theme Toggle Logic
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light');
};

const updateBodyClass = () => {
  const el = document.documentElement;
  if (isDarkMode.value) {
    el.classList.remove('light-mode');
    el.classList.remove('dark');
    el.classList.add('dark');
  } else {
    el.classList.add('light-mode');
    el.classList.remove('dark');
  }
};

watch(isDarkMode, () => {
  updateBodyClass();
}, { immediate: true });

// Configuration State
const config = ref({
  wsUrl: import.meta.env.VITE_REMOTE_WS_URL || 'ws://127.0.0.1:8088/ws',
  extension: import.meta.env.VITE_REMOTE_EXTENSION || '101',
  password: import.meta.env.VITE_REMOTE_PASSWORD || '101pass',
  name: import.meta.env.VITE_REMOTE_WS_URL ? 'Production' : 'Local Dev'
});

const isSettingsOpen = ref(false);

const { state, connect, disconnect, makeCall, terminateCall, answerCall, sendDTMF, clearLogs } = useSIP();

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
  // Load SIP Config
  const saved = localStorage.getItem('sip_config');
  if (saved) {
    try {
      config.value = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved SIP config', e);
    }
  }

  // Load Theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    isDarkMode.value = false;
  }
  updateBodyClass();
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
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-background overflow-hidden relative font-sans selection:bg-primary/30 transition-colors duration-500">
    
    <!-- Background Immersive Visuals -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div :class="['absolute top-[-10%] left-[-5%] w-[60%] h-[60%] blur-[150px] rounded-full animate-pulse-slow transition-all duration-1000', isDarkMode ? 'bg-primary/20' : 'bg-primary/10']"></div>
      <div :class="['absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] blur-[150px] rounded-full animate-pulse-slow-reverse delay-2000 transition-all duration-1000', isDarkMode ? 'bg-accent/15' : 'bg-accent/5']"></div>
      <div :class="['absolute top-[30%] right-[10%] w-[30%] h-[30%] blur-[180px] rounded-full animate-pulse-slow-reverse transition-all duration-1000', isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-500/5']"></div>
    </div>

    <!-- Dashboard Layout Container -->
    <div class="relative z-10 w-full h-[780px] flex items-center justify-center">
      
      <!-- Panel 2: Monitoring (Left of Phone) -->
      <Transition name="panel-slide-left">
        <div v-if="showStats" class="absolute right-[50%] mr-[230px] w-full max-w-[480px] glass rounded-[3rem] h-[780px] flex flex-col overflow-hidden border-[var(--border-main)] shrink-0 shadow-2xl">
          <div class="bg-card border-b border-[var(--border-main)] backdrop-blur-xl px-8 py-5">
            <div class="flex items-center gap-3">
                <RefreshCw class="w-4 h-4 text-accent" :class="{ 'animate-spin-slow': stats.isPushActive }" />
                <div class="flex flex-col">
                  <span class="text-[10px] font-black uppercase tracking-[0.4em] text-text">Live Monitoring</span>
                  <span v-if="stats.isPushActive" class="text-[7px] font-bold text-accent uppercase tracking-widest mt-0.5 animate-pulse">Push Stream Active</span>
                </div>
              </div>
          </div>
          <div class="flex-1 px-8 py-8 overflow-hidden">
            <AdminDashboard :serverIp="serverIp" />
          </div>
        </div>
      </Transition>

      <!-- Panel 1: Phone Frame (The Anchor) -->
      <div class="w-full max-w-[420px] relative transition-all duration-500 shrink-0 z-20">
        <!-- Physical Toggle Buttons -->
        <!-- Left: Monitoring -->
        <button 
          @click="showStats = !showStats"
          class="physical-btn btn-left group"
          :class="{ 'active': showStats }"
          title="Toggle Monitoring"
        >
          <div class="btn-texture"></div>
          <Activity v-if="!showStats" class="w-4 h-4 transition-transform group-hover:scale-110" />
          <ChevronRight v-else class="w-4 h-4 transition-transform group-hover:scale-110" />
          <div class="status-led" :class="{ 'led-on': showStats, 'led-off': !showStats }"></div>
        </button>

        <!-- Right: Logs -->
        <button 
          @click="showLogs = !showLogs"
          class="physical-btn btn-right group"
          :class="{ 'active': showLogs }"
          title="Toggle System Logs"
        >
          <div class="btn-texture"></div>
          <Terminal v-if="!showLogs" class="w-4 h-4 transition-transform group-hover:scale-110" />
          <ChevronLeft v-else class="w-4 h-4 transition-transform group-hover:scale-110" />
          <div class="status-led" :class="{ 'led-on': showLogs, 'led-off': !showLogs }"></div>
        </button>

        <!-- Premium Glass Phone Frame -->
        <div class="glass w-full rounded-[48px] overflow-hidden flex flex-col h-[780px] transition-all duration-700 hover:shadow-[0_20px_80px_-20px_var(--shadow-color)] border-[var(--border-main)] shrink-0">
          
          <!-- App HUD (Connections & Line Status) -->
          <ConnectionPanel 
            :config="config" 
            :state="state" 
            :isDarkMode="isDarkMode"
            @connect="connect(config)" 
            @disconnect="disconnect" 
            @open-settings="isSettingsOpen = true"
            @toggle-theme="toggleTheme"
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
                @dtmf="sendDTMF"
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

      <!-- Panel 3: Side Console Panel (Right of Phone) -->
      <Transition name="panel-slide-right">
        <div v-if="showLogs" class="absolute left-[50%] ml-[230px] w-full max-w-[380px] glass rounded-[3rem] h-[780px] flex flex-col overflow-hidden border-[var(--border-main)] shrink-0 shadow-2xl">
          <!-- Sidebar Header -->
          <div class="bg-card border-b border-[var(--border-main)] backdrop-blur-xl px-8 py-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Terminal class="w-4 h-4 text-primary" />
                <span class="text-[10px] font-black uppercase tracking-[0.4em] text-text">System Logs</span>
              </div>
              <button 
                @click="clearLogs"
                class="text-[9px] font-bold text-text-muted hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-2 group"
              >
                <span>Clear</span>
                <div class="w-1.5 h-1.5 rounded-full bg-rose-500/20 group-hover:bg-rose-500 transition-colors"></div>
              </button>
            </div>
          </div>

          <!-- Log Content Area -->
          <div class="flex-1 px-8 py-8 overflow-hidden scrollbar-none overscroll-contain flex flex-col justify-end">
            <TransitionGroup name="log-item" tag="div" class="flex flex-col gap-3">
              <div 
                v-for="(log, i) in state.logs" 
                :key="i" 
                class="flex flex-col gap-1 text-[10px] font-mono leading-relaxed group/log p-3 rounded-lg hover:bg-card transition-all duration-500 border-l-2 border-[var(--border-main)] shadow-sm"
                :class="[
                  log.type === 'error' ? 'border-rose-500/30' : 
                  log.type === 'success' ? 'border-accent/30' : 
                  'border-primary/20',
                  i === state.logs.length - 1 ? 'p-5 bg-primary/5 border-l-4 border-primary/50 shadow-lg scale-[1.02] origin-bottom' : ''
                ]"
              >
                <div class="flex justify-between items-center opacity-30 text-[8px] uppercase tracking-tighter mb-1 font-sans">
                  <span class="font-bold text-text">{{ log.type || 'system' }}</span>
                  <span class="tabular-nums text-text">{{ log.time }}</span>
                </div>
                <span :class="[
                  log.type === 'error' ? 'text-rose-400' : 
                  log.type === 'success' ? 'text-accent' : 
                  'text-text',
                  i === state.logs.length - 1 ? 'font-black text-[13px] tracking-normal' : 'font-medium opacity-60'
                ]" class="tracking-tight break-words transition-all duration-300">{{ log.msg }}</span>
              </div>
            </TransitionGroup>

            <!-- Empty State -->
            <div v-if="state.logs.length === 0" class="h-full flex flex-col items-center justify-center opacity-10 gap-4">
              <Terminal class="w-12 h-12" />
              <span class="text-[10px] font-black uppercase tracking-[0.4em]">No Events Recorded</span>
            </div>
          </div>

          <div class="px-8 py-5 border-t border-[var(--border-main)] bg-card">
            <div class="flex items-center justify-between text-[9px] font-black tracking-widest text-text-muted uppercase">
              <span>Engine Status</span>
              <span class="text-accent animate-pulse">Live 24/7</span>
            </div>
          </div>
        </div>
      </Transition>
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
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">DTLS v1.3</span>
      </div>
      <div class="flex items-center gap-2.5">
        <Cpu class="w-4 h-4 text-primary" />
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">PJSIP Engine</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

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

/* Physical Side Buttons */
.physical-btn {
  position: absolute;
  top: 180px; /* Offset from top */
  width: 14px;
  height: 90px;
  background: var(--bg-card);
  @apply backdrop-blur-md;
  border: 1px solid var(--border-main);
  box-shadow: 
    inset 1px 0 2px rgba(255,255,255,0.05),
    inset -1px 0 2px rgba(0,0,0,0.2),
    4px 0 10px var(--shadow-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 5;
  cursor: pointer;
  overflow: hidden;
}

.physical-btn:hover {
  color: var(--text-main);
  background: var(--bg-glass-hover);
}

.physical-btn:active {
  transform: scaleY(0.95) translateY(2px);
}

.btn-left {
  left: -12px;
  border-radius: 6px 0 0 6px;
}

.btn-right {
  right: -12px;
  border-radius: 0 6px 6px 0;
  top: 290px; /* Volume-button style offset */
}

/* Texture on button */
.btn-texture {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.03) 2px,
    rgba(255, 255, 255, 0.03) 4px
  );
  pointer-events: none;
}

/* LED Indicator */
.status-led {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  margin-top: 10px;
  transition: all 0.3s ease;
}

.led-on {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.led-off {
  background: var(--border-main);
}

/* Panel Transitions */
.panel-slide-left-enter-active,
.panel-slide-left-leave-active,
.panel-slide-right-enter-active,
.panel-slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
}

.panel-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
  filter: blur(10px);
}

.panel-slide-right-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
  filter: blur(10px);
}

.panel-slide-left-leave-to,
.panel-slide-right-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
  filter: blur(10px);
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
