<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { useTaskStore } from '@/stores/task.store'
import type { Task } from '@/stores/task.store'
import type { ViewMode } from '@/utils/date.utils'
import {
  getTimelineColumns,
  getDateOffset,
  getTaskWidth,
  getColumnWidth,
  isWeekend,
  isToday,
} from '@/utils/date.utils'
import GanttTaskBar from './GanttTaskBar.vue'
import GanttDependencies from './GanttDependencies.vue'

const props = defineProps<{
  viewMode: ViewMode
}>()

const emit = defineEmits<{
  'scroll': [scrollTop: number]
  'edit-task': [task: Task]
}>()

const taskStore = useTaskStore()
const timelineRef = ref<HTMLElement | null>(null)

const ROW_HEIGHT = 52

// --- Columns ---
const columns = computed(() => {
  return getTimelineColumns(taskStore.timelineStart, taskStore.timelineEnd, props.viewMode)
})

const colWidth = computed(() => getColumnWidth(props.viewMode))

const totalWidth = computed(() => columns.value.length * colWidth.value)

// Ensure calendar takes up at least 10 rows height
const gridHeight = computed(() => Math.max(taskStore.tasks.length * ROW_HEIGHT, 10 * ROW_HEIGHT))

// --- Today indicator offset ---
const todayOffset = computed(() => {
  const offset = getDateOffset(dayjs().format('YYYY-MM-DDTHH:mm'), taskStore.timelineStart, props.viewMode)
  if (offset >= 0 && offset <= totalWidth.value) return offset
  return -1
})

// --- Scroll sync ---
function onScroll(e: Event) {
  const target = e.target as HTMLElement
  emit('scroll', target.scrollTop)
}

// --- Drag & Resize ---
const isDragging = ref(false)
const dragTask = ref<Task | null>(null)
const dragStartX = ref(0)
const dragOriginalStart = ref('')
const dragOriginalEnd = ref('')
const resizeDirection = ref<'left' | 'right' | null>(null)

function onDragStart(event: MouseEvent, task: Task) {
  isDragging.value = true
  dragTask.value = task
  dragStartX.value = event.clientX
  dragOriginalStart.value = task.plannedStartDateTime
  dragOriginalEnd.value = task.plannedEndDateTime
  resizeDirection.value = null
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onResizeStart(event: MouseEvent, task: Task, direction: 'left' | 'right') {
  isDragging.value = true
  dragTask.value = task
  dragStartX.value = event.clientX
  dragOriginalStart.value = task.plannedStartDateTime
  dragOriginalEnd.value = task.plannedEndDateTime
  resizeDirection.value = direction
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(event: MouseEvent) {
  if (!isDragging.value || !dragTask.value) return

  const deltaX = event.clientX - dragStartX.value
  let minutesDelta = 0

  if (props.viewMode === 'hour') {
    // Snap to 15 min intervals -> 1/4 of colWidth
    const quarterWidth = colWidth.value / 4
    const steps = Math.round(deltaX / quarterWidth)
    minutesDelta = steps * 15
  } else if (props.viewMode === 'day') {
    minutesDelta = Math.round(deltaX / colWidth.value) * 24 * 60
  } else if (props.viewMode === 'week') {
    minutesDelta = Math.round(deltaX / colWidth.value) * 7 * 24 * 60
  } else if (props.viewMode === 'month') {
    minutesDelta = Math.round(deltaX / colWidth.value) * 30 * 24 * 60
  } else if (props.viewMode === 'quarter') {
    minutesDelta = Math.round(deltaX / colWidth.value) * 90 * 24 * 60
  } else if (props.viewMode === 'year') {
    minutesDelta = Math.round(deltaX / colWidth.value) * 365 * 24 * 60
  }

  const dragOriginalStartDayjs = dayjs(dragOriginalStart.value)
  const dragOriginalEndDayjs = dayjs(dragOriginalEnd.value)

  if (resizeDirection.value === 'left') {
    const newStart = dragOriginalStartDayjs.add(minutesDelta, 'minute')
    if (newStart.isBefore(dragOriginalEndDayjs) || newStart.isSame(dragOriginalEndDayjs)) {
      taskStore.updateTask(dragTask.value.id, {
        plannedStartDateTime: newStart.format('YYYY-MM-DDTHH:mm'),
      })
    }
  } else if (resizeDirection.value === 'right') {
    const newEnd = dragOriginalEndDayjs.add(minutesDelta, 'minute')
    if (newEnd.isAfter(dragOriginalStartDayjs) || newEnd.isSame(dragOriginalStartDayjs)) {
      taskStore.updateTask(dragTask.value.id, {
        plannedEndDateTime: newEnd.format('YYYY-MM-DDTHH:mm'),
      })
    }
  } else {
    // Move entire task
    const newStart = dragOriginalStartDayjs.add(minutesDelta, 'minute').format('YYYY-MM-DDTHH:mm')
    const newEnd = dragOriginalEndDayjs.add(minutesDelta, 'minute').format('YYYY-MM-DDTHH:mm')
    taskStore.updateTask(dragTask.value.id, {
      plannedStartDateTime: newStart,
      plannedEndDateTime: newEnd,
    })
  }
}

function onDragEnd() {
  isDragging.value = false
  dragTask.value = null
  resizeDirection.value = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

// --- Task position calculations ---
function getTaskLeft(task: Task): number {
  return getDateOffset(task.plannedStartDateTime, taskStore.timelineStart, props.viewMode)
}

function getTaskBarWidth(task: Task): number {
  return getTaskWidth(task.plannedStartDateTime, task.plannedEndDateTime, props.viewMode)
}

// --- Task center position for dependency lines ---
function getTaskCenter(task: Task): { x: number; y: number } {
  const index = taskStore.tasks.findIndex(t => t.id === task.id)
  const left = getTaskLeft(task)
  const width = getTaskBarWidth(task)
  return {
    x: left + width,
    y: index * ROW_HEIGHT + ROW_HEIGHT / 2,
  }
}

function getTaskStart(task: Task): { x: number; y: number } {
  const index = taskStore.tasks.findIndex(t => t.id === task.id)
  const left = getTaskLeft(task)
  return {
    x: left,
    y: index * ROW_HEIGHT + ROW_HEIGHT / 2,
  }
}

function getColumnLabel(col: dayjs.Dayjs): string {
  if (props.viewMode === 'hour') return `${col.format('ddd DD, HH:mm')}`
  if (props.viewMode === 'day') return col.format('ddd DD')
  if (props.viewMode === 'week') return `Week ${col.isoWeek()}`
  if (props.viewMode === 'month') return col.format('MMM YYYY')
  if (props.viewMode === 'quarter') return `Q${col.quarter()} ${col.format('YYYY')}`
  if (props.viewMode === 'year') return col.format('YYYY')
  return ''
}

function selectTask(task: Task) {
  taskStore.selectedTaskId = task.id
}

// Watch taskToScrollTo to scroll to its position from sidebar clicks
watch(() => taskStore.taskToScrollTo, (newId) => {
  if (newId && timelineRef.value) {
    const task = taskStore.getTask(newId)
    if (task) {
      const taskIndex = taskStore.tasks.findIndex(t => t.id === newId)
      const left = getTaskLeft(task)
      const top = taskIndex * ROW_HEIGHT
      
      // Center the task horizontally and vertically in the view if possible
      const containerWidth = timelineRef.value.clientWidth
      const containerHeight = timelineRef.value.clientHeight
      const taskWidth = getTaskBarWidth(task)
      
      const scrollLeft = Math.max(0, left - containerWidth / 2 + taskWidth / 2)
      const scrollTop = Math.max(0, top - containerHeight / 2 + ROW_HEIGHT / 2)

      timelineRef.value.scrollTo({
        left: scrollLeft,
        top: scrollTop,
        behavior: 'smooth'
      })
      
      // Reset the scroll trigger
      taskStore.taskToScrollTo = null
    }
  }
})

// --- Timeline Panning (Click & Drag to Scroll) ---
const isPanning = ref(false)
const panStartX = ref(0)
const panStartY = ref(0)
const panScrollLeft = ref(0)
const panScrollTop = ref(0)

function onPanStart(event: MouseEvent) {
  // Prevent panning if we are clicking on a task or task resize handle
  if (isDragging.value || (event.target as HTMLElement).closest('.group')) return
  
  isPanning.value = true
  panStartX.value = event.clientX
  panStartY.value = event.clientY
  
  if (timelineRef.value) {
    panScrollLeft.value = timelineRef.value.scrollLeft
    panScrollTop.value = timelineRef.value.scrollTop
    timelineRef.value.style.cursor = 'grabbing'
    timelineRef.value.style.userSelect = 'none'
  }
}

function onPanMove(event: MouseEvent) {
  if (!isPanning.value || !timelineRef.value) return
  
  const dx = event.clientX - panStartX.value
  const dy = event.clientY - panStartY.value
  
  timelineRef.value.scrollLeft = panScrollLeft.value - dx
  timelineRef.value.scrollTop = panScrollTop.value - dy
}

function onPanEnd() {
  if (!isPanning.value) return
  isPanning.value = false
  if (timelineRef.value) {
    timelineRef.value.style.cursor = ''
    timelineRef.value.style.userSelect = ''
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  // Clean up pan listeners if we used document listeners
})
</script>

<template>
  <div
    ref="timelineRef"
    class="flex-1 overflow-auto transition-colors duration-200"
    :class="[
      taskStore.isDarkTheme ? 'bg-[#1f1f1f]' : 'bg-gray-50/50',
      isPanning ? 'cursor-grabbing' : 'cursor-grab'
    ]"
    @scroll="onScroll"
    @mousedown="onPanStart"
    @mousemove="onPanMove"
    @mouseup="onPanEnd"
    @mouseleave="onPanEnd"
  >
    <div :style="{ width: `${totalWidth}px`, minHeight: '100%' }" class="relative">
      <!-- Column headers -->
      <div 
        class="sticky top-0 z-20 flex h-10 border-b transition-colors duration-200"
        :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9]' : 'bg-white border-[#b4b4b4]'"
      >
        <div
          v-for="(col, i) in columns"
          :key="i"
          class="relative flex items-center justify-center text-xs font-semibold border-r transition-colors duration-200"
          :style="{ width: `${colWidth}px`, minWidth: `${colWidth}px` }"
          :class="[
            taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]',
            viewMode === 'day' && isToday(col)
              ? (taskStore.isDarkTheme ? 'text-blue-400 bg-[#2c3e50]' : 'text-blue-600 bg-blue-50')
              : viewMode === 'day' && isWeekend(col)
                ? (taskStore.isDarkTheme ? 'text-gray-400 bg-[#333333]' : 'text-gray-500 bg-gray-100')
                : (taskStore.isDarkTheme ? 'text-gray-300' : 'text-gray-700')
          ]"
        >
          <span class="truncate px-1 text-center w-full">{{ getColumnLabel(col) }}</span>
          
          <!-- 15 min subdivisions for hour view in header (small ticks at bottom) -->
          <div v-if="viewMode === 'hour'" class="absolute bottom-0 left-0 right-0 flex h-1.5 pointer-events-none opacity-50">
            <div class="flex-1 border-r" :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"></div>
            <div class="flex-1 border-r" :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"></div>
            <div class="flex-1 border-r" :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"></div>
            <div class="flex-1"></div>
          </div>
        </div>
      </div>

      <!-- Grid body -->
      <div class="relative" :style="{ height: `${gridHeight}px` }">
        <!-- Grid columns (background) -->
        <div class="absolute inset-0 flex pointer-events-none">
          <div
            v-for="(col, i) in columns"
            :key="'bg-' + i"
            class="relative h-full border-r transition-colors duration-200"
            :style="{ width: `${colWidth}px`, minWidth: `${colWidth}px` }"
            :class="[
              taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]',
              viewMode === 'day' && isWeekend(col) ? (taskStore.isDarkTheme ? 'bg-[#242424]' : 'bg-gray-100/50') : (taskStore.isDarkTheme ? 'bg-[#1f1f1f]' : 'bg-white'),
            ]"
          >
            <!-- 15 min subdivisions for hour view in grid body -->
            <div v-if="viewMode === 'hour'" class="absolute inset-0 flex pointer-events-none">
              <div class="flex-1 border-r border-dashed opacity-30" :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"></div>
              <div class="flex-1 border-r border-dashed opacity-30" :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"></div>
              <div class="flex-1 border-r border-dashed opacity-30" :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"></div>
              <div class="flex-1"></div>
            </div>
          </div>
        </div>

        <!-- Row lines -->
        <div class="absolute inset-0 pointer-events-none flex flex-col">
          <div
            v-for="i in Math.max(taskStore.tasks.length, 10)"
            :key="'row-' + i"
            :style="{ height: `${ROW_HEIGHT}px` }"
            class="w-full border-b transition-colors duration-200"
            :class="taskStore.isDarkTheme ? 'border-[#A9A9A9]' : 'border-[#b4b4b4]'"
          ></div>
        </div>

        <!-- Today indicator line -->
        <div
          v-if="todayOffset >= 0"
          class="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none opacity-80"
          :style="{ left: `${todayOffset}px` }"
        >
          <div class="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>

        <!-- Empty State -->
        <div v-if="taskStore.tasks.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div 
            class="px-4 py-2 rounded-lg border shadow-sm text-sm font-medium transition-colors"
            :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a]/90 border-[#A9A9A9] text-gray-300' : 'bg-white/80 border-[#b4b4b4] text-gray-500'"
          >
            No tasks yet. Click Add Task to get started.
          </div>
        </div>

        <!-- Dependency lines (SVG layer) -->
        <GanttDependencies
          v-if="taskStore.tasks.length > 0"
          :tasks="taskStore.tasks"
          :get-task-center="getTaskCenter"
          :get-task-start="getTaskStart"
          :total-width="totalWidth"
          :total-height="gridHeight"
        />

        <!-- Task bars -->
        <div
          v-for="(task, index) in taskStore.tasks"
          :key="task.id"
          class="absolute w-full"
          :style="{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }"
          @click.stop="selectTask(task)"
          @dblclick.stop="emit('edit-task', task)"
        >
          <GanttTaskBar
            :task="task"
            :left="getTaskLeft(task)"
            :width="getTaskBarWidth(task)"
            @drag-start="onDragStart"
            @resize-start="onResizeStart"
          />
        </div>
      </div>
    </div>
  </div>
</template>
