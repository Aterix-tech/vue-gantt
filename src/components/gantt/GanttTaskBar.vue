<script setup lang="ts">
import { useTaskStore, getTaskTimingResult } from '@/stores/task.store'
import type { Task } from '@/stores/task.store'

const props = defineProps<{
  task: Task
  left: number
  width: number
}>()

const emit = defineEmits<{
  'drag-start': [event: MouseEvent, task: Task]
  'resize-start': [event: MouseEvent, task: Task, direction: 'left' | 'right']
}>()

const taskStore = useTaskStore()

function getStatusColor(timingResult: string): string {
  if (timingResult === 'not_started') return '#94a3b8' // slate-400
  if (timingResult === 'in_progress') return '#3b82f6' // blue-500
  if (timingResult === 'finished_early') return '#10b981' // emerald-500
  if (timingResult === 'finished_on_time') return '#22c55e' // green-500
  if (timingResult === 'finished_late') return '#eab308' // yellow-500
  return '#ef4444' // red-500
}
</script>

<template>
  <div class="absolute top-0 h-full flex items-center group w-full pointer-events-none">
    <div
      class="relative h-[32px] rounded-md cursor-grab active:cursor-grabbing transition-shadow duration-150 pointer-events-auto border"
      :class="[
        taskStore.selectedTaskId === task.id ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg z-20' : 'hover:shadow-md z-10',
        taskStore.isDarkTheme && taskStore.selectedTaskId === task.id ? 'ring-offset-[#1f1f1f]' : ''
      ]"
      :style="{
        left: `${left}px`,
        width: `${Math.max(width, 40)}px`,
        backgroundColor: getStatusColor(getTaskTimingResult(task)) + 'E6', // slightly transparent
        borderColor: getStatusColor(getTaskTimingResult(task)),
      }"
      @mousedown.prevent="emit('drag-start', $event, task)"
    >
      <!-- Connection Handles (Dependency) -->
      <!-- Left dependency handle -->
      <div 
        class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 border-2"
        :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9] hover:border-gray-400 hover:bg-[#333333]' : 'bg-white border-[#b4b4b4] hover:border-gray-500 hover:bg-gray-50'"
        title="Incoming dependencies"
      ></div>
      <!-- Right dependency handle -->
      <div 
        class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 border-2"
        :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9] hover:border-gray-400 hover:bg-[#333333]' : 'bg-white border-[#b4b4b4] hover:border-gray-500 hover:bg-gray-50'"
        title="Outgoing dependencies"
      ></div>

      <!-- Left resize handle -->
      <div
        class="absolute left-0 top-0 w-3 h-full cursor-col-resize rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
        @mousedown.stop.prevent="emit('resize-start', $event, task, 'left')"
      >
        <div class="w-1 h-3 bg-white/60 rounded-full"></div>
      </div>

      <!-- Task bar content -->
      <div class="flex items-center h-full px-2.5 overflow-hidden select-none">
        <span class="text-xs font-bold text-white truncate leading-none drop-shadow-sm">
          {{ task.title }}
        </span>
      </div>

      <!-- Right resize handle -->
      <div
        class="absolute right-0 top-0 w-3 h-full cursor-col-resize rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
        @mousedown.stop.prevent="emit('resize-start', $event, task, 'right')"
      >
        <div class="w-1 h-3 bg-white/60 rounded-full"></div>
      </div>
    </div>
  </div>
</template>
