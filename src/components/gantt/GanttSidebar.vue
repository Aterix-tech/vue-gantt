<script setup lang="ts">
import { useTaskStore, getTaskTimingResult } from '@/stores/task.store'
import type { Task } from '@/stores/task.store'

defineProps<{
  scrollTop: number
  width?: number
}>()

const emit = defineEmits<{
  'edit-task': [task: Task]
}>()

const taskStore = useTaskStore()

/** Row height must match timeline row height */
const ROW_HEIGHT = 52

const TIMING_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  finished_early: 'Finished Early',
  finished_on_time: 'Finished On Time',
  finished_late: 'Finished Late',
  late_not_finished: 'Late'
}

function getStatusColor(timingResult: string): string {
  if (timingResult === 'not_started') return '#94a3b8' // slate-400
  if (timingResult === 'in_progress') return '#3b82f6' // blue-500
  if (timingResult === 'finished_early') return '#10b981' // emerald-500
  if (timingResult === 'finished_on_time') return '#22c55e' // green-500
  if (timingResult === 'finished_late') return '#eab308' // yellow-500
  return '#ef4444' // red-500
}

function selectTask(task: Task) {
  taskStore.selectedTaskId = task.id
  taskStore.taskToScrollTo = task.id
}
</script>

<template>
  <div 
    class="border-r flex flex-col z-30 transition-colors duration-200 shrink-0"
    :style="width ? { width: width + 'px' } : { width: '288px' }"
    :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9]' : 'bg-white border-[#b4b4b4]'"
  >
    <!-- Sidebar header -->
    <div
      class="flex items-center px-4 h-10 min-h-[2.5rem] border-b text-xs font-bold uppercase tracking-wider transition-colors duration-200"
      :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-gray-300' : 'bg-gray-50 border-[#b4b4b4] text-gray-600'"
    >
      Tasks
    </div>

    <!-- Scrollable task list -->
    <div 
      class="flex-1 overflow-hidden transition-colors duration-200"
      :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a]' : 'bg-white'"
    >
      <div :style="{ transform: `translateY(${-scrollTop}px)` }">
        <div
          v-for="task in taskStore.tasks"
          :key="task.id"
          :style="{ height: `${ROW_HEIGHT}px` }"
          class="flex items-center px-4 border-b cursor-pointer transition-colors duration-150 group"
          :class="[
            taskStore.isDarkTheme ? 'border-[#A9A9A9] hover:bg-[#333333]' : 'border-[#b4b4b4] hover:bg-gray-50',
            taskStore.selectedTaskId === task.id ? (taskStore.isDarkTheme ? 'bg-[#3a3a3a]' : 'bg-blue-50') : ''
          ]"
          @click="selectTask(task)"
          @dblclick="emit('edit-task', task)"
        >
          <div class="flex-1 min-w-0">
            <!-- Task name -->
            <div 
              class="text-sm font-semibold truncate transition-colors"
              :class="taskStore.isDarkTheme ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'"
            >
              {{ task.title }}
            </div>
            <!-- Meta row -->
            <div class="flex items-center gap-2 mt-0.5">
              <!-- Status badge -->
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none border"
                :style="{
                  backgroundColor: getStatusColor(getTaskTimingResult(task)) + '15',
                  color: getStatusColor(getTaskTimingResult(task)),
                  borderColor: getStatusColor(getTaskTimingResult(task)) + '30',
                }"
              >
                {{ TIMING_LABELS[getTaskTimingResult(task)] }}
              </span>
              <!-- Assignee -->
              <span 
                class="text-xs font-medium truncate"
                :class="taskStore.isDarkTheme ? 'text-gray-400' : 'text-gray-500'"
              >
                {{ task.assignee }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Filler rows to match timeline grid if needed -->
        <div 
          v-for="i in Math.max(10 - taskStore.tasks.length, 0)" 
          :key="'empty-' + i"
          :style="{ height: `${ROW_HEIGHT}px` }"
          class="border-b transition-colors duration-200"
          :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"
        ></div>
      </div>
    </div>
  </div>
</template>
