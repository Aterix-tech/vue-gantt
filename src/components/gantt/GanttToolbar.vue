<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task.store'
import type { ViewMode } from '@/utils/date.utils'

const props = defineProps<{
  viewMode: ViewMode
}>()

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode]
  'add-task': []
}>()

const taskStore = useTaskStore()
const activeMode = ref(props.viewMode)

const modes: Array<{ value: ViewMode; label: string }> = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]

function setViewMode(mode: ViewMode) {
  activeMode.value = mode
  emit('update:viewMode', mode)
}

function deleteSelected() {
  if (taskStore.selectedTaskId) {
    if (confirm('Are you sure you want to delete this task? Dependencies will be reconnected automatically.')) {
      taskStore.deleteTask(taskStore.selectedTaskId)
      taskStore.selectedTaskId = null
    }
  }
}
</script>

<template>
  <div 
    class="flex items-center justify-between px-6 py-3 border-b z-40 relative shadow-sm transition-colors duration-200"
    :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9]' : 'bg-white border-[#b4b4b4]'"
  >
    <!-- Left: Project name & Theme Toggle -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-sm border border-blue-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <h1 
          class="text-lg font-bold tracking-tight transition-colors duration-200"
          :class="taskStore.isDarkTheme ? 'text-gray-100' : 'text-gray-800'"
        >Vue Gantt</h1>
      </div>

      <!-- Theme Toggle -->
      <button 
        @click="taskStore.toggleTheme()"
        class="ml-2 p-1.5 rounded-md transition-colors"
        :class="taskStore.isDarkTheme ? 'bg-[#3a3a3a] text-yellow-400 hover:bg-[#4a4a4a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        :title="taskStore.isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <svg v-if="taskStore.isDarkTheme" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 4.22a1 1 0 011.415 0l.708.708a1 1 0 01-1.414 1.414l-.708-.708a1 1 0 010-1.415zm-9.855 0a1 1 0 010 1.415l-.708.708a1 1 0 11-1.414-1.414l.708-.708a1 1 0 011.415 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zm3 0a5 5 0 11-10 0 5 5 0 0110 0z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>
    </div>

    <!-- Center: View mode toggle -->
    <div 
      class="flex items-center rounded-lg p-1 border transition-colors duration-200"
      :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-gray-100 border-[#b4b4b4]'"
    >
      <button
        v-for="mode in modes"
        :key="mode.value"
        :class="[
          'px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200',
          activeMode === mode.value
            ? (taskStore.isDarkTheme ? 'bg-[#3a3a3a] text-blue-400 shadow-sm border border-[#A9A9A9]' : 'bg-white text-blue-600 shadow-sm border border-[#b4b4b4]')
            : (taskStore.isDarkTheme ? 'text-gray-400 hover:text-gray-200 hover:bg-[#333333] border border-transparent' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 border border-transparent')
        ]"
        @click="setViewMode(mode.value)"
      >
        {{ mode.label }}
      </button>
    </div>

    <!-- Right: Add/Delete actions -->
    <div class="flex items-center gap-3">
      <button
        v-if="taskStore.selectedTaskId"
        class="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500 rounded-lg transition-all duration-200"
        @click="deleteSelected"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        Delete Selected
      </button>

      <button
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-sm border border-blue-700"
        @click="emit('add-task')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Add Task
      </button>
    </div>
  </div>
</template>
