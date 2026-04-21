<script setup lang="ts">
import { Delete, PhoneCall, History } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
});

const dialTarget = ref('');
const emit = defineEmits(['call']);

const handleKeypadPress = (val: string) => {
  dialTarget.value += val;
};

const backspace = () => {
  dialTarget.value = dialTarget.value.slice(0, -1);
};
</script>

<template>
  <div class="flex flex-col h-full relative overflow-hidden py-2">
    <!-- Dial Display Section -->
    <div class="flex flex-col items-center justify-center min-h-[140px] relative z-0">
      <div class="w-full text-center">
        <input 
          v-model="dialTarget"
          type="text" 
          placeholder="Enter Number" 
          autofocus
          class="w-full bg-transparent border-none text-center text-4xl font-light tracking-tight placeholder:text-text-muted focus:ring-0 focus:outline-none outline-none text-text transition-all duration-300"
          :class="{ 'scale-75 opacity-50': !dialTarget }"
        />
      </div>
      
      <!-- Secondary Controls: Absolute to prevent shifting -->
      <div class="flex gap-4 mt-4 transition-all duration-300 h-10 items-center" :class="{ 'opacity-0 pointer-events-none scale-90': !dialTarget }">
        <button 
          @click="backspace" 
          class="p-2.5 rounded-full bg-card hover:bg-[var(--bg-glass-hover)] text-text-muted hover:text-text transition-colors"
          title="Clear"
        >
          <Delete class="w-4 h-4" />
        </button>
        <button class="p-2.5 rounded-full bg-card text-text-muted hover:text-text hover:bg-[var(--bg-glass-hover)] transition-colors">
          <History class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Keypad Grid - Premium Neumorphic Glass -->
    <div class="grid grid-cols-3 gap-x-12 gap-y-6 px-4 justify-items-center relative z-20 mt-4">
      <button v-for="num in ['1','2','3','4','5','6','7','8','9','*','0','#']" 
              :key="num" 
              @click="handleKeypadPress(num)"
              class="dialer-btn bg-card text-text group hover:border-primary/30 hover:text-primary hover:scale-105"
      >
        <span class="relative z-10 group-active:scale-125 transition-transform pointer-events-none">{{ num }}</span>
        <div class="absolute inset-0 rounded-full bg-[var(--bg-glass-hover)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </button>
    </div>

    <!-- Primary Action: Call Button with Pulsing Glow -->
    <div class="mt-auto flex justify-center pb-6">
      <button 
        @click="emit('call', dialTarget)" 
        :disabled="!state.isRegistered || !dialTarget"
        class="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_0_30px_0_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_0_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 group"
      >
        <PhoneCall class="w-8 h-8 group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.dialer-btn {
  @apply relative w-[72px] h-[72px] rounded-full flex items-center justify-center text-3xl font-light
         border border-[var(--border-main)] backdrop-blur-md shadow-lg shadow-black/10
         transition-all duration-300 overflow-hidden active:scale-95;
}

.dialer-btn:hover {
  @apply bg-[var(--bg-glass-hover)];
}

.dialer-btn span {
  @apply relative z-10 transition-transform duration-300;
}

.dialer-btn:active span {
  @apply scale-125;
}
</style>
