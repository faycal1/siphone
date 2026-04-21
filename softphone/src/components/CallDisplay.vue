<script setup lang="ts">
import { 
  Mic, MicOff, PhoneOff, Phone, User, ShieldCheck, 
  LayoutGrid, X, Activity, Zap,
  ArrowRightLeft, Pause, Play, PhoneForwarded 
} from 'lucide-vue-next';
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps({
  currentCall: {
    type: Object,
    required: true
  },
  consultSession: {
    type: Object,
    default: null
  }
});

const emit = defineEmits([
  'hangup', 'answer', 'dtmf', 
  'hold', 'unhold', 'blind-transfer', 
  'attended-transfer', 'complete-transfer', 'cancel-transfer'
]);

const isKeypadOpen = ref(false);
const isTransferOpen = ref(false);
const transferTarget = ref('');
const dtmfSequence = ref('');
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
  if (newStatus === 'In Call' || newStatus?.includes('connected')) {
    if (!timerInterval) startTimer();
    dtmfSequence.value = '';
  } else if (!newStatus) {
    stopTimer();
  }
}, { immediate: true });

onUnmounted(() => stopTimer());

const toggleMute = () => {
  isMuted.value = !isMuted.value;
};

const handleBlind = () => {
  if (!transferTarget.value) return;
  emit('blind-transfer', transferTarget.value);
  isTransferOpen.value = false;
  transferTarget.value = '';
};

const handleAttended = () => {
  if (!transferTarget.value) return;
  emit('attended-transfer', transferTarget.value);
  isTransferOpen.value = false;
  transferTarget.value = '';
};

const handleForceAudio = () => {
  if (props.currentCall.remoteStream) {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.play().catch(e => console.error('Kickstart failed:', e));
    }
  }
};
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-10 py-10 h-full animate-in fade-in zoom-in duration-700 relative">
    
    <!-- Background Call Glow -->
    <div v-if="currentCall.status === 'In Call'" class="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 blur-[100px] rounded-full animate-pulse-slow"></div>
    <div v-else-if="currentCall.isIncoming" class="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse-slow"></div>
    <div v-else class="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse-slow"></div>

    <!-- Avatar Identity HUD -->
    <div class="relative z-10 group">
      <div :class="[
        'w-36 h-36 rounded-full border-[6px] border-[var(--border-main)] p-1 transition-all duration-500',
        currentCall.status === 'In Call' ? 'shadow-[0_0_50px_0_rgba(16,185,129,0.3)] bg-accent/10 border-accent/30 scale-105' : 'bg-primary/10 border-primary/30 scale-100'
      ]">
        <div class="w-full h-full rounded-full bg-card overflow-hidden flex flex-col items-center justify-center relative shadow-inner">
          <User :class="['w-16 h-16 transition-colors', currentCall.status === 'In Call' ? 'text-accent' : 'text-primary']" />
          <div class="mt-2 flex flex-col items-center gap-2">
            <!-- Current SIP Status -->
            <div class="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              {{ currentCall.status }}
            </div>

            <!-- Audio Status Pill -->
            <div class="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {{ currentCall.remoteStream ? 'Audio Sink Ready' : 'Negotiating Media...' }}
            </div>

            <!-- Manual Override Button -->
            <button 
              v-if="!currentCall.remoteStream || currentCall.status.includes('connected')"
              @click="handleForceAudio"
              class="mt-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Volume2 class="w-3 h-3" />
              Force Audio Start
            </button>

            <div v-if="currentCall.remoteStream" class="mt-1 text-[10px] text-text-muted">
              Tracks: {{ currentCall.remoteStream.getTracks().length }} | Active: {{ currentCall.remoteStream.active }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Security Badge Overlay -->
      <div class="absolute -top-1 -right-1 bg-background/80 backdrop-blur-md p-2 rounded-full border border-[var(--border-main)] shadow-lg">
        <ShieldCheck class="w-3.5 h-3.5 text-accent" />
      </div>

    <!-- Controls Layout -->
    <div v-if="currentCall.status !== 'Incoming'" class="absolute inset-x-0 bottom-[-35px] z-20 px-8 flex flex-col items-center gap-12">
      <!-- Ambient Dock Glow -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-primary/10 blur-[40px] rounded-full animate-pulse-slow"></div>
      
      <!-- Unified Command Dock (Extra Compact Size) -->
      <div class="relative flex items-center gap-3 px-4 py-2.5 rounded-[3rem] bg-card backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-6 duration-700">
        
        <!-- Left Wing: Media & Input -->
        <div class="flex gap-2">
          <!-- Mute Toggle -->
          <div 
            @click="toggleMute" 
            :class="[
              'p-2.5 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 group/btn',
              isMuted ? 'bg-rose-500/20 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-white/10 border-white/10 hover:bg-white/10'
            ]"
          >
            <Mic v-if="!isMuted" class="w-3.5 h-3.5 text-white/50 group-hover/btn:text-white transition-colors" />
            <MicOff v-else class="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          </div>

          <!-- Keypad Toggle -->
          <div 
            @click="isKeypadOpen = !isKeypadOpen" 
            :class="[
              'p-2.5 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 group/btn',
              isKeypadOpen ? 'bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' : 'bg-white/10 border-white/10 hover:bg-white/10'
            ]"
          >
            <LayoutGrid class="w-3.5 h-3.5 text-white/50 group-hover/btn:text-white transition-colors" />
          </div>
        </div>

        <!-- Center: Primary Action (Hangup) -->
        <button 
          @click="emit('hangup')"
          class="mx-0.5 bg-rose-500 p-3.5 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_0_35px_rgba(244,63,94,0.6)] hover:scale-110 active:scale-90 transition-all group/hangup"
        >
          <PhoneOff class="w-5 h-5 text-white rotate-[135deg] group-hover/hangup:scale-110 transition-transform" />
        </button>

        <!-- Right Wing: Call Management -->
        <div class="flex gap-2">
          <!-- Hold/Unhold -->
          <div 
            v-if="currentCall.status === 'In Call' || currentCall.status === 'On Hold'"
            @click="currentCall.status === 'On Hold' ? emit('unhold') : emit('hold')" 
            :class="[
              'p-2.5 rounded-full border transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 group/btn',
              currentCall.status === 'On Hold' ? 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/10 border-white/10 hover:bg-white/10'
            ]"
          >
            <Pause v-if="currentCall.status === 'In Call'" class="w-3.5 h-3.5 text-white/50 group-hover/btn:text-white transition-colors" />
            <Play v-else class="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>

          <!-- Transfer Dialog -->
          <div 
            v-if="currentCall.status === 'In Call'"
            @click="isTransferOpen = true" 
            class="bg-white/10 border border-white/10 p-2.5 rounded-full cursor-pointer hover:bg-white/10 hover:scale-110 active:scale-95 transition-all shadow-xl group/btn"
          >
            <ArrowRightLeft class="w-3.5 h-3.5 text-white/50 group-hover/btn:text-white transition-colors" />
          </div>
        </div>
      </div>
    </div>
    </div>
    
    <!-- Identity Info -->
    <div class="text-center w-full relative z-10 flex flex-col items-center">
      
      <!-- QoS / Network Health HUD -->
      <Transition name="fade">
        <div v-if="currentCall.status === 'In Call' && currentCall.qos" class="mb-6 flex flex-col items-center gap-2">
          <div :class="[
            'px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all duration-500 shadow-lg',
            currentCall.qos.health === 'excellent' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            currentCall.qos.health === 'good' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
            currentCall.qos.health === 'fair' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            'bg-rose-500/10 border-rose-500/20 text-rose-400'
          ]">
            <!-- Signal Bars (Wow Factor) -->
            <div class="flex items-end gap-0.5 h-3">
              <div v-for="i in 4" :key="i" :class="[
                'w-1 rounded-full transition-all duration-500',
                i === 1 ? 'h-1' : i === 2 ? 'h-1.5' : i === 3 ? 'h-2' : 'h-3',
                (
                  (currentCall.qos.health === 'excellent' && i <= 4) ||
                  (currentCall.qos.health === 'good' && i <= 3) ||
                  (currentCall.qos.health === 'fair' && i <= 2) ||
                  (currentCall.qos.health === 'poor' && i <= 1)
                ) ? 'bg-current shadow-[0_0_8px_currentColor]' : 'bg-white/10'
              ]"></div>
            </div>

            <!-- RTT / Latency -->
            <div class="flex items-center gap-2 px-3 border-x border-white/5">
              <Activity class="w-3 h-3 opacity-50" />
              <div class="flex flex-col items-start leading-none">
                <span class="text-[8px] uppercase tracking-widest opacity-50 font-bold text-white">Ping</span>
                <span class="text-xs font-mono font-bold">{{ currentCall.qos.latency }}<span class="text-[8px] ml-0.5 opacity-50">ms</span></span>
              </div>
            </div>

            <!-- Jitter -->
            <div class="flex items-center gap-2">
              <Zap class="w-3 h-3 opacity-50" />
              <div class="flex flex-col items-start leading-none">
                <span class="text-[8px] uppercase tracking-widest opacity-50 font-bold text-white">Jitter</span>
                <span class="text-xs font-mono font-bold">{{ currentCall.qos.jitter }}<span class="text-[8px] ml-0.5 opacity-50">ms</span></span>
              </div>
            </div>

            <!-- Health Badge -->
            <div :class="[
              'ml-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest',
              currentCall.qos.health === 'excellent' ? 'bg-emerald-500 text-black' :
              currentCall.qos.health === 'good' ? 'bg-blue-500 text-black' :
              currentCall.qos.health === 'fair' ? 'bg-amber-500 text-black' :
              'bg-rose-500 text-black'
            ]">
              {{ currentCall.qos.health }}
            </div>
          </div>
          
          <!-- Packet Loss Warning -->
          <div v-if="currentCall.qos.packetsLost > 0" class="flex items-center gap-1.5 animate-in slide-in-from-top-2 duration-300">
             <div class="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></div>
             <span class="text-[9px] font-bold text-rose-400 uppercase tracking-widest opacity-80">Lost Packets Detected: {{ currentCall.qos.packetsLost }}</span>
          </div>
        </div>
      </Transition>

      <h2 class="text-3xl font-light text-text tracking-tight truncate max-w-[320px] mx-auto transition-transform duration-500" :class="currentCall.status === 'In Call' ? 'scale-110 translate-y-2' : ''">
        {{ currentCall.remoteIdentity }}
      </h2>
      <div class="flex items-center justify-center gap-2 mt-4">
        <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
        <p class="text-[10px] font-black text-accent uppercase tracking-[0.3em] ml-1">{{ currentCall.status === 'In Call' ? 'Secure Stream' : currentCall.status }}</p>
      </div>
      <p class="text-5xl font-extralight text-text mt-10 tabular-nums tracking-tighter opacity-80">{{ formattedDuration }}</p>
    </div>

    <!-- Primary Controls -->
    <div class="mt-auto flex w-full justify-center gap-8 relative z-10 pb-4">

      <!-- Answer Button (incoming calls only) -->
      <div v-if="currentCall.isIncoming && currentCall.status !== 'In Call'" class="relative">
        <!-- Ripple rings -->
        <span class="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"></span>
        <span class="absolute inset-[-8px] rounded-full border border-emerald-500/20 animate-pulse"></span>
        <button
          id="btn-answer"
          @click="emit('answer')"
          class="relative w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_30px_0_rgba(16,185,129,0.5)] hover:shadow-[0_0_45px_0_rgba(16,185,129,0.7)] hover:scale-110 active:scale-95 transition-all duration-300 group"
        >
          <Phone class="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <!-- Hangup / Reject Button -->
      <button
        v-if="!consultSession"
        id="btn-hangup"
        @click="emit('hangup')"
        class="w-20 h-20 rounded-full bg-danger text-white flex items-center justify-center shadow-[0_0_30px_0_rgba(244,63,94,0.4)] hover:shadow-[0_0_40px_0_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 group"
      >
        <PhoneOff class="w-8 h-8 group-hover:scale-110 transition-transform" />
      </button>

      <!-- Consultation Hand-off Controls -->
      <div v-else class="flex flex-col items-center gap-6 animate-in slide-in-from-bottom duration-500 w-full max-w-[320px]">
        <div class="px-6 py-4 rounded-3xl bg-accent text-black w-full flex flex-col items-center shadow-2xl">
          <span class="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Consultation Active</span>
          <span class="text-lg font-bold">Extension {{ transferTarget || 'Transfer' }}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 w-full">
          <button 
            @click="emit('complete-transfer')"
            class="flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 text-[10px]"
          >
            <PhoneForwarded class="w-4 h-4" />
            Confirm
          </button>
          <button 
            @click="emit('cancel-transfer')"
            class="flex items-center justify-center gap-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-rose-500/20 text-[10px]"
          >
            <X class="w-4 h-4" />
            Abort
          </button>
        </div>
      </div>
    </div>

    <!-- Transfer Dialog Overlay -->
    <Transition name="overlay-fade">
      <div v-if="isTransferOpen" class="absolute inset-0 z-[60] bg-background/90 backdrop-blur-3xl flex flex-col items-center justify-center p-10 rounded-[48px]">
        <button @click="isTransferOpen = false" class="absolute top-10 right-10 p-4 text-text-muted hover:text-text transition-colors">
          <X class="w-8 h-8" />
        </button>

        <div class="text-center mb-10">
          <div class="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <ArrowRightLeft class="w-10 h-10 text-primary" />
          </div>
          <h3 class="text-lg font-black uppercase tracking-[0.4em] text-white">Call Transfer</h3>
          <p class="text-[10px] text-text-muted font-bold mt-2">DÉVIER CET APPEL VERS...</p>
        </div>

        <div class="w-full max-w-[280px] flex flex-col gap-8">
          <div class="relative group">
            <User class="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-text-muted group-focus-within:text-primary transition-colors" />
            <input 
              v-model="transferTarget"
              type="text" 
              placeholder="Extension"
              class="w-full bg-card border-none rounded-3xl py-6 pl-16 pr-8 text-2xl text-white font-light outline-none ring-1 ring-white/10 focus:ring-primary/50 transition-all placeholder:text-white/10"
              autofocus
              @keyup.enter="handleAttended"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <button 
              @click="handleBlind"
              class="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <MoveRight class="w-6 h-6 text-text-muted group-hover:text-amber-400 transition-colors" />
              <span class="text-[9px] font-black uppercase tracking-widest text-text-muted">Blind</span>
            </button>
            <button 
              @click="handleAttended"
              class="flex flex-col items-center gap-3 p-6 rounded-3xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group"
            >
              <MessageSquare class="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span class="text-[9px] font-black uppercase tracking-widest text-primary">Warm</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Keypad Overlay -->
    <Transition name="overlay-fade">
      <div v-if="isKeypadOpen" class="absolute inset-0 z-50 bg-background/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 rounded-[48px]">
        <button @click="isKeypadOpen = false" class="absolute top-10 right-10 p-4 text-text-muted hover:text-text transition-colors">
          <X class="w-8 h-8" />
        </button>
        
        <div class="text-center mb-12">
          <h3 class="text-xs font-black uppercase tracking-[0.4em] text-accent mb-2">Dial Pad</h3>
          <div class="h-10 flex items-center justify-center">
            <span class="text-3xl font-light text-text tracking-[0.2em] animate-in fade-in zoom-in duration-300">{{ dtmfSequence }}</span>
            <span v-if="!dtmfSequence" class="text-text-muted text-[10px] uppercase tracking-widest">Awaiting Input</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-x-8 gap-y-6 justify-items-center">
          <button v-for="num in ['1','2','3','4','5','6','7','8','9','*','0','#']" 
                  :key="num" 
                  @click="() => { dtmfSequence += num; emit('dtmf', num); }"
                  class="w-16 h-16 rounded-full flex items-center justify-center text-xl font-light bg-card border border-[var(--border-main)] shadow-inner transition-all duration-300 hover:bg-accent/20 hover:border-accent/40 active:scale-95 text-text"
          >
            {{ num }}
          </button>
          
          <!-- Special Action Keys in Grid -->
          <div class="w-16 h-16"></div> <!-- Spacer -->
          
          <button 
            @click="dtmfSequence = dtmfSequence.slice(0, -1)"
            v-if="dtmfSequence"
            class="w-16 h-16 rounded-full flex items-center justify-center bg-card border border-[var(--border-main)] shadow-inner transition-all duration-300 hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95 text-text-muted hover:text-rose-500 animate-in fade-in scale-in duration-300"
            title="Backspace"
          >
            <Delete class="w-6 h-6" />
          </button>
          
          <div v-else class="w-16 h-16"></div> <!-- Spacer if no sequence -->
          
          <div class="w-16 h-16"></div> <!-- Spacer -->
        </div>

        <!-- Secondary Clear Action -->
        <button v-if="dtmfSequence.length > 3" @click="dtmfSequence = ''" class="mt-8 text-[9px] font-black uppercase tracking-[0.3em] text-white/10 hover:text-rose-500 transition-colors">
          Reset All
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-pulse-slow {
  animation: pulse-slow 6s ease-in-out infinite;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
</style>
