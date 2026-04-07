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
  <div class="flex flex-col gap-10 py-4 h-full relative overflow-hidden">
    <!-- Dial Display Section -->
    <div class="flex flex-col items-center gap-2 relative z-10">
      <div class="flex items-center gap-2 transition-all duration-300 transform scale-110 active:scale-105">
        <input 
          v-model="dialTarget"
          type="text" 
          placeholder="Enter Number" 
          autofocus
          class="w-full bg-transparent border-none text-center text-5xl font-light tracking-tight placeholder:text-white/10 focus:ring-0 text-white selection:bg-primary/20"
        />
      </div>
      <div v-if="dialTarget.length > 0" class="flex gap-4">
        <button 
          @click="backspace" 
          class="p-2.5 rounded-full bg-white/[0.05] hover:bg-white/10 text-white/40 transition-colors"
          title="Clear"
        >
          <Delete class="w-4 h-4" />
        </button>
        <button class="p-2.5 rounded-full bg-white/[0.03] text-white/20 hover:text-white/40 transition-colors">
          <History class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Keypad Grid - Premium Neumorphic Glass -->
    <div class="grid grid-cols-3 gap-x-12 gap-y-8 px-4 justify-items-center">
      <button v-for="num in ['1','2','3','4','5','6','7','8','9','*','0','#']" 
              :key="num" 
              @click="handleKeypadPress(num)"
              class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light bg-white/[0.03] border border-white/5 shadow-inner transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:bg-primary/20 focus:outline-none focus:ring-0 relative group"
      >
        <span class="relative z-10 group-active:scale-125 transition-transform">{{ num }}</span>
        <div class="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
</style>
