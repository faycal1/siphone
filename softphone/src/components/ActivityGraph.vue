<script setup lang="ts">
import { computed, ref } from 'vue';
import { Phone, Calendar, Activity, ShieldCheck, Hash, Globe, User } from 'lucide-vue-next';

const props = defineProps<{
  history: { time: string; msg: string; type: string; date: string }[];
  globalHistory: { time: string; msg: string; type: string; date: string; sip: string }[];
  ariEndpoints: string[];
  onRefreshGlobal?: () => void;
}>();

const viewMode = ref<'personal' | 'global' | 'specific'>('personal');
const selectedSip = ref<string>('');

// Get unique SIPs from BOTH history and ARI endpoints
const availableSips = computed(() => {
  const fromHistory = props.globalHistory.map(h => h.sip);
  const sips = new Set([...fromHistory, ...props.ariEndpoints]);
  return Array.from(sips).filter(s => s && s !== 'unknown').sort();
});

const activeHistory = computed(() => {
  if (viewMode.value === 'personal') return props.history;
  if (viewMode.value === 'global') return props.globalHistory;
  if (viewMode.value === 'specific') {
    return props.globalHistory.filter(h => h.sip === selectedSip.value);
  }
  return [];
});

const toggleMode = (mode: 'personal' | 'global' | 'specific') => {
  viewMode.value = mode;
  if (mode !== 'personal' && props.onRefreshGlobal) {
    props.onRefreshGlobal();
  }
  // Auto-select first SIP if none selected
  if (mode === 'specific' && !selectedSip.value && availableSips.value.length > 0) {
    selectedSip.value = availableSips.value[0];
  }
};

// GitHub style heatmap logic
const days = 90; // Last 90 days
const heatmapData = computed(() => {
  const data: Record<string, number> = {};
  
  activeHistory.value.forEach(entry => {
    if (entry.date) {
      data[entry.date] = (data[entry.date] || 0) + 1;
    }
  });

  const cells = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    
    // Use local date format YYYY-MM-DD to match history
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const count = data[dateStr] || 0;
    
    // Intensity mapping with literal classes for Tailwind safety
    let color = 'bg-white/5';
    if (viewMode.value === 'personal') {
      if (count > 0) color = 'bg-emerald-500/20';
      if (count > 5) color = 'bg-emerald-500/40';
      if (count > 10) color = 'bg-emerald-500/70';
      if (count > 20) color = 'bg-emerald-500';
    } else if (viewMode.value === 'global') {
      if (count > 0) color = 'bg-indigo-500/20';
      if (count > 5) color = 'bg-indigo-500/40';
      if (count > 10) color = 'bg-indigo-500/70';
      if (count > 20) color = 'bg-indigo-500';
    } else {
      if (count > 0) color = 'bg-amber-500/20';
      if (count > 5) color = 'bg-amber-500/40';
      if (count > 10) color = 'bg-amber-500/70';
      if (count > 20) color = 'bg-amber-500';
    }

    cells.push({ date: dateStr, count, color });
  }
  return cells;
});

const stats = computed(() => {
  const calls = activeHistory.value.filter(h => h.type === 'call').length;
  const reg = activeHistory.value.filter(h => h.type === 'reg').length;
  const dtmf = activeHistory.value.filter(h => h.type === 'dtmf').length;
  return { calls, reg, dtmf };
});

const getIcon = (type: string) => {
  switch (type) {
    case 'call': return Phone;
    case 'reg': return ShieldCheck;
    case 'dtmf': return Hash;
    default: return Activity;
  }
};

const getColorClass = (type: string) => {
  switch (type) {
    case 'call': return 'text-indigo-400 bg-indigo-400/10';
    case 'reg': return 'text-emerald-400 bg-emerald-400/10';
    case 'dtmf': return 'text-amber-400 bg-amber-400/10';
    default: return 'text-primary bg-primary/10';
  }
};
</script>

<template>
  <div class="flex flex-col gap-8 h-full overflow-hidden animate-fade-in">
    
    <!-- Header & Stats -->
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-2">
          <Activity class="w-5 h-5 text-indigo-400" />
          <h2 class="text-lg font-bold text-text">Activity Intelligence</h2>
        </div>
        
        <!-- Triple Toggle Button -->
        <div class="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-[var(--border-main)]">
          <button 
            @click="toggleMode('personal')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300"
            :class="viewMode === 'personal' ? 'bg-emerald-500/20 text-emerald-300' : 'text-text-muted hover:bg-white/5'"
          >
            <User class="w-3 h-3" />
            Me
          </button>
          <button 
            @click="toggleMode('global')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300"
            :class="viewMode === 'global' ? 'bg-indigo-500/20 text-indigo-300' : 'text-text-muted hover:bg-white/5'"
          >
            <Globe class="w-3 h-3" />
            All
          </button>
          <button 
            @click="toggleMode('specific')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300"
            :class="viewMode === 'specific' ? 'bg-amber-500/20 text-amber-300' : 'text-text-muted hover:bg-white/5'"
          >
            <Hash class="w-3 h-3" />
            SIP
          </button>
        </div>
      </div>

      <!-- SIP Selector (Only in Specific mode) -->
      <div v-if="viewMode === 'specific'" class="flex items-center gap-3 px-2 animate-fade-in">
        <span class="text-[9px] font-black text-text-muted uppercase tracking-widest">Target Extension:</span>
        <select 
          v-model="selectedSip"
          class="bg-card border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-[10px] font-bold text-text outline-none focus:border-amber-500/50 transition-all cursor-pointer"
        >
          <option v-for="sip in availableSips" :key="sip" :value="sip">Extension {{ sip }}</option>
        </select>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="glass p-4 rounded-3xl border-[var(--border-main)] bg-card flex flex-col gap-1 transition-all hover:translate-y-[-2px]">
          <div class="flex items-center justify-between mb-1">
            <Phone class="w-4 h-4 text-indigo-400" />
            <span class="text-[8px] font-black text-text-muted uppercase tracking-widest">Calls</span>
          </div>
          <span class="text-[22px] font-black text-text tabular-nums">{{ stats.calls }}</span>
        </div>

        <div class="glass p-4 rounded-3xl border-[var(--border-main)] bg-card flex flex-col gap-1 transition-all hover:translate-y-[-2px]">
          <div class="flex items-center justify-between mb-1">
            <ShieldCheck class="w-4 h-4 text-emerald-400" />
            <span class="text-[8px] font-black text-text-muted uppercase tracking-widest">Regs</span>
          </div>
          <span class="text-[22px] font-black text-text tabular-nums">{{ stats.reg }}</span>
        </div>

        <div class="glass p-4 rounded-3xl border-[var(--border-main)] bg-card flex flex-col gap-1 transition-all hover:translate-y-[-2px]">
          <div class="flex items-center justify-between mb-1">
            <Hash class="w-4 h-4 text-amber-400" />
            <span class="text-[8px] font-black text-text-muted uppercase tracking-widest">DTMF</span>
          </div>
          <span class="text-[22px] font-black text-text tabular-nums">{{ stats.dtmf }}</span>
        </div>
      </div>
    </div>

    <!-- GitHub Style Heatmap -->
    <div class="glass p-6 rounded-[2.5rem] border-[var(--border-main)] bg-card flex flex-col gap-5">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-text">
            {{ viewMode === 'global' ? 'Global' : (viewMode === 'specific' ? `SIP ${selectedSip}` : 'Personal') }} Heatmap
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[8px] text-text-muted uppercase">Less</span>
          <div class="flex gap-1">
            <div class="w-2 h-2 rounded-sm bg-white/5"></div>
            <div :class="['w-2 h-2 rounded-sm opacity-20', viewMode === 'global' ? 'bg-indigo-500' : 'bg-emerald-500']"></div>
            <div :class="['w-2 h-2 rounded-sm opacity-50', viewMode === 'global' ? 'bg-indigo-500' : 'bg-emerald-500']"></div>
            <div :class="['w-2 h-2 rounded-sm', viewMode === 'global' ? 'bg-indigo-500' : 'bg-emerald-500']"></div>
          </div>
          <span class="text-[8px] text-text-muted uppercase">More</span>
        </div>
      </div>

      <!-- Heatmap Grid -->
      <div class="flex flex-wrap gap-1.5 justify-center">
        <div 
          v-for="cell in heatmapData" 
          :key="cell.date"
          class="w-3.5 h-3.5 rounded-[3px] transition-all duration-300 hover:scale-125 hover:z-10 cursor-help relative group/cell"
          :class="cell.color"
        >
          <!-- Tooltip -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[8px] rounded opacity-0 group-hover/cell:opacity-100 pointer-events-none whitespace-nowrap z-50">
            {{ cell.count }} events on {{ cell.date }}
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center mt-2 px-1 text-[8px] font-black uppercase tracking-widest text-text-muted opacity-50">
        <span>{{ new Date(new Date().setDate(new Date().getDate() - 90)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}</span>
        <span>Today</span>
      </div>
    </div>

    <!-- Activity Feed -->
    <div class="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
      <div class="flex items-center gap-2 px-2">
        <Activity class="w-3.5 h-3.5 text-primary" />
        <span class="text-[10px] font-black uppercase tracking-widest text-text">Timeline ({{ viewMode }})</span>
      </div>

      <div class="flex-1 overflow-y-auto scrollbar-none pr-1">
        <div v-if="activeHistory.length === 0" class="h-full flex flex-col items-center justify-center py-12 opacity-10 border border-dashed border-[var(--border-main)] rounded-3xl gap-4">
          <Activity class="w-12 h-12" />
          <span class="text-[10px] font-black uppercase tracking-[0.4em]">No activity found...</span>
        </div>

        <TransitionGroup name="feed-item" tag="div" class="flex flex-col gap-3">
          <div 
            v-for="(item, i) in activeHistory" 
            :key="i"
            class="group flex items-start gap-4 p-4 rounded-2xl bg-card border border-[var(--border-main)] hover:bg-[var(--bg-glass-hover)] transition-all relative overflow-hidden"
          >
            <div :class="['p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110', getColorClass(item.type)]">
              <component :is="getIcon(item.type)" class="w-4 h-4" />
            </div>
            
            <div class="flex flex-col gap-1 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black text-text uppercase tracking-widest">{{ item.type }}</span>
                <span class="text-[8px] font-mono text-text-muted tabular-nums">{{ item.time }}</span>
              </div>
              <p class="text-[11px] text-text-muted leading-tight font-medium">{{ item.msg }}</p>
              <div v-if="item.date !== new Date().toISOString().split('T')[0]" class="text-[8px] text-text-muted/40 mt-1 uppercase font-black">{{ item.date }}</div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-fade-in {
  animation: fade-in 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.feed-item-enter-active {
  transition: all 0.4s ease-out;
}
.feed-item-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
