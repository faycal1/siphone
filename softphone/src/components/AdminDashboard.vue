<script setup lang="ts">
import { Activity, Users, Globe, RefreshCw, AlertCircle, Plus, ShieldCheck } from 'lucide-vue-next';
import { useAdmin } from '../composables/useAdmin';
import { onMounted, watch, ref } from 'vue';

const props = defineProps<{
  serverIp: string;
}>();

const { stats, startMonitoring, stopMonitoring } = useAdmin();

onMounted(() => {
  if (props.serverIp) {
    startMonitoring(props.serverIp);
  }
});

watch(() => props.serverIp, (newIp) => {
  if (newIp) {
    startMonitoring(newIp);
  } else {
    stopMonitoring();
  }
});

// PoC Extension Management
const newExt = ref('');
const newPass = ref('');
const newName = ref('');
const isSubmitting = ref(false);
const statusMsg = ref({ text: '', type: '' });

const handleAddExtension = async () => {
  if (!newExt.value || !newPass.value) return;
  
  isSubmitting.value = true;
  statusMsg.value = { text: 'Adding extension...', type: 'info' };

  try {
    const response = await fetch(`http://${props.serverIp}:5000/add-extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extension: newExt.value,
        password: newPass.value,
        name: newName.value || `Agent ${newExt.value}`
      })
    });

    const data = await response.json();
    if (response.ok) {
      statusMsg.value = { text: 'Success! Extension added.', type: 'success' };
      newExt.value = '';
      newPass.value = '';
      newName.value = '';
      // Refresh stats after a short delay
      setTimeout(() => {
        statusMsg.value = { text: '', type: '' };
      }, 3000);
    } else {
      statusMsg.value = { text: data.error || 'Failed to add extension', type: 'error' };
    }
  } catch (err: any) {
    statusMsg.value = { text: 'Connection failed', type: 'error' };
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 h-full overflow-hidden">
    
    <!-- Extension Management PoC -->
    <div class="glass p-5 rounded-3xl border-white/5 bg-white/[0.02] flex flex-col gap-4">
      <div class="flex items-center gap-2 px-1">
        <Plus class="w-4 h-4 text-accent" />
        <span class="text-[10px] font-black uppercase tracking-widest text-white/50">Add New Member</span>
      </div>
      
      <div class="grid grid-cols-3 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[8px] font-black uppercase tracking-widest text-white/20 px-1">Extension</label>
          <input 
            v-model="newExt" 
            placeholder="e.g. 103" 
            class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-accent/40 outline-none transition-all"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[8px] font-black uppercase tracking-widest text-white/20 px-1">Password</label>
          <input 
            v-model="newPass" 
            type="password"
            placeholder="••••••••" 
            class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-accent/40 outline-none transition-all"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[8px] font-black uppercase tracking-widest text-white/20 px-1">Full Name</label>
          <input 
            v-model="newName" 
            placeholder="John Doe" 
            class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-accent/40 outline-none transition-all"
          />
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div v-if="statusMsg.text" :class="[
          'text-[9px] font-bold px-3 py-1 rounded-full',
          statusMsg.type === 'success' ? 'text-accent bg-accent/10' : 
          statusMsg.type === 'error' ? 'text-rose-500 bg-rose-500/10' : 'text-white/40 bg-white/5'
        ]">
          {{ statusMsg.text }}
        </div>
        <div v-else></div>

        <button 
          @click="handleAddExtension"
          :disabled="isSubmitting || !newExt || !newPass"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20"
        >
          <Plus v-if="!isSubmitting" class="w-3.5 h-3.5 text-black" />
          <RefreshCw v-else class="w-3.5 h-3.5 text-black animate-spin" />
          <span class="text-[10px] font-black text-black uppercase tracking-tight">Provision</span>
        </button>
      </div>
    </div>

    <!-- Stats Overview Cards -->
    <div class="grid grid-cols-3 gap-4">
      <div class="glass p-4 rounded-3xl border-white/5 bg-white/[0.02] flex flex-col gap-1 transition-all hover:bg-white/[0.05]">
        <div class="flex items-center justify-between mb-1">
          <Activity class="w-4 h-4 text-accent" />
          <span v-if="stats.isOnline" class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
        </div>
        <span class="text-[20px] font-black text-white px-1">{{ stats.channels.length }}</span>
        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Active Calls</span>
      </div>

      <div class="glass p-4 rounded-3xl border-white/5 bg-white/[0.02] flex flex-col gap-1 transition-all hover:bg-white/[0.05]">
        <div class="flex items-center justify-between mb-1">
          <Users class="w-4 h-4 text-primary" />
        </div>
        <span class="text-[20px] font-black text-white px-1">{{ stats.endpoints.length }}</span>
        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Endpoints</span>
      </div>

      <div class="glass p-4 rounded-3xl border-white/5 bg-white/[0.02] flex flex-col gap-1 transition-all hover:bg-white/[0.05]">
        <div class="flex items-center justify-between mb-1">
          <Globe class="w-4 h-4 text-indigo-400" />
        </div>
        <span class="text-[20px] font-black text-white px-1">{{ stats.registrations.length }}</span>
        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Trunk Regs</span>
      </div>
    </div>

    <!-- Live Data Sections -->
    <div class="flex-1 flex flex-col gap-6 overflow-hidden min-h-0">
      
      <!-- Channels Monitor -->
      <div class="flex flex-col gap-3 min-h-0">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2">
            <Activity class="w-3.5 h-3.5 text-accent" />
            <span class="text-[10px] font-black uppercase tracking-widest text-white/50">Live Channels</span>
          </div>
          <RefreshCw class="w-3 h-3 text-white/20 animate-spin-slow" />
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-none pr-1">
          <div v-if="stats.channels.length === 0" class="flex flex-col items-center justify-center py-8 opacity-20 border border-dashed border-white/10 rounded-2xl gap-3">
            <Activity class="w-8 h-8" />
            <span class="text-[9px] font-black uppercase tracking-widest">No Active Traffic</span>
          </div>

          <div class="flex flex-col gap-2">
            <div 
              v-for="ch in stats.channels" 
              :key="ch.id"
              class="group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
            >
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
                  <Activity class="w-4 h-4 text-accent" />
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-white tracking-tight">{{ ch.caller.name || 'Unknown' }} ({{ ch.caller.number }})</span>
                  <span class="text-[9px] font-medium text-white/30 uppercase tracking-tighter">{{ ch.state }} — {{ ch.name }}</span>
                </div>
              </div>
              <div class="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
                 <span class="text-[8px] font-black text-accent uppercase tracking-tighter">{{ ch.accountcode || 'SIP' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Endpoint Status -->
      <div class="flex flex-col gap-3 min-h-0">
        <div class="flex items-center gap-2 px-2">
          <Users class="w-3.5 h-3.5 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-white/50">Endpoint Health</span>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-none pr-1">
          <div class="grid grid-cols-2 gap-2">
            <div 
              v-for="ep in stats.endpoints" 
              :key="ep.resource"
              class="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all"
            >
              <div class="flex items-center gap-3">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  ep.state === 'online' ? 'bg-accent shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                ]"></div>
                <span class="text-xs font-bold text-white/80 tracking-tight">{{ ep.resource }}</span>
              </div>
              <span class="text-[9px] font-black text-white/20 uppercase tracking-tighter">{{ ep.technology }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Status Banner -->
    <div v-if="stats.error" class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 animate-pulse">
      <AlertCircle class="w-4 h-4 text-rose-500 shrink-0" />
      <div class="flex flex-col">
        <span class="text-[10px] font-black uppercase tracking-widest text-white">API Connection Failed</span>
        <span class="text-[8px] font-medium text-rose-400 capitalize">{{ stats.error }}</span>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
