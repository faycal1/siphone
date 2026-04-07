<script setup lang="ts">
import { Mic, MicOff, PhoneOff, User, Volume2, ShieldCheck } from 'lucide-vue-next';
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps({
  currentCall: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['hangup', 'answer']);

const callDuration = ref(0);
const isMuted = ref(false);
let timerInterval: any = null;

const startTimer = () => {
  callDuration.value = 0;
  timerInterval = setInterval(() => {
    callDuration.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const formattedDuration = computed(() => {
  const m = Math.floor(callDuration.value / 60);
  const s = callDuration.value % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

watch(() => props.currentCall.status, (newStatus) => {
  if (newStatus === 'In Call') {
    startTimer();
  } else if (!newStatus) {
    stopTimer();
  }
}, { immediate: true });

onUnmounted(() => stopTimer());

const toggleMute = () => {
  isMuted.value = !isMuted.value;
};
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-10 py-10 h-full animate-in fade-in zoom-in duration-700 relative">
    
    <!-- Background Call Glow -->
    <div v-if="currentCall.status === 'In Call'" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 blur-[100px] rounded-full animate-pulse-slow"></div>
    <div v-else class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse-slow"></div>

    <!-- Avatar Identity HUD -->
    <div class="relative z-10 group">
      <div :class="[
        'w-36 h-36 rounded-full border-[6px] border-white/5 p-1 transition-all duration-500',
        currentCall.status === 'In Call' ? 'shadow-[0_0_50px_0_rgba(16,185,129,0.3)] bg-accent/10 border-accent/30 scale-105' : 'bg-primary/10 border-primary/30 scale-100'
      ]">
        <div class="w-full h-full rounded-full bg-card overflow-hidden flex items-center justify-center relative shadow-inner">
          <User :class="['w-16 h-16 transition-colors', currentCall.status === 'In Call' ? 'text-accent' : 'text-primary']" />
          <div v-if="currentCall.status === 'In Call'" class="absolute inset-0 bg-accent/5 animate-pulse"></div>
        </div>
      </div>
      
      <!-- Security Badge Overlay -->
      <div class="absolute -top-1 -right-1 bg-background/80 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
        <ShieldCheck class="w-3.5 h-3.5 text-accent" />
      </div>

      <!-- Action Indicator -->
      <div class="absolute -bottom-2 -right-2 flex gap-1">
        <div @click="toggleMute" class="bg-card/80 backdrop-blur-md p-2.5 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all hover:scale-110 shadow-xl group/btn">
          <Mic v-if="!isMuted" class="w-4 h-4 text-white/60 group-hover/btn:text-white" />
          <MicOff v-else class="w-4 h-4 text-rose-500" />
        </div>
        <div class="bg-card/80 backdrop-blur-md p-2.5 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all hover:scale-110 shadow-xl group/btn">
          <Volume2 class="w-4 h-4 text-white/60 group-hover/btn:text-white" />
        </div>
      </div>
    </div>
    
    <!-- Identity Info -->
    <div class="text-center w-full relative z-10">
      <h2 class="text-3xl font-light text-white tracking-tight truncate max-w-[320px] mx-auto transition-transform duration-500" :class="currentCall.status === 'In Call' ? 'scale-110 translate-y-2' : ''">
        {{ currentCall.remoteIdentity }}
      </h2>
      <div class="flex items-center justify-center gap-2 mt-4">
        <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
        <p class="text-[10px] font-black text-accent uppercase tracking-[0.3em] ml-1">{{ currentCall.status === 'In Call' ? 'Secure Stream' : currentCall.status }}</p>
      </div>
      <p class="text-5xl font-extralight text-white/90 mt-10 tabular-nums tracking-tighter opacity-80">{{ formattedDuration }}</p>
    </div>

    <!-- Primary Control -->
    <div class="mt-auto flex w-full justify-center relative z-10 pb-4">
      <button @click="emit('hangup')" 
              class="w-20 h-20 rounded-full bg-danger text-white flex items-center justify-center shadow-[0_0_30px_0_rgba(244,63,94,0.4)] hover:shadow-[0_0_40px_0_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 group"
      >
        <PhoneOff class="w-8 h-8 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-pulse-slow {
  animation: pulse-slow 6s ease-in-out infinite;
}
</style>
