<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task.store'
import type { Task } from '@/stores/task.store'
import type { ViewMode } from '@/utils/date.utils'
import GanttToolbar from '@/components/gantt/GanttToolbar.vue'
import GanttSidebar from '@/components/gantt/GanttSidebar.vue'
import GanttTimeline from '@/components/gantt/GanttTimeline.vue'
import GanttSplitter from '@/components/gantt/GanttSplitter.vue'
import TaskDialog from '@/components/TaskDialog.vue'

const taskStore = useTaskStore()

// --- View mode ---
const viewMode = ref<ViewMode>('day')

// --- Scroll sync ---
const sidebarScrollTop = ref(0)

function onTimelineScroll(scrollTop: number) {
  sidebarScrollTop.value = scrollTop
}

// --- Task dialog ---
const dialogVisible = ref(false)
const editingTask = ref<Task | null>(null)

function openAddDialog() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEditDialog(task: Task) {
  editingTask.value = task
  dialogVisible.value = true
}

// Clear selection when clicking empty space
function handleOuterClick() {
  taskStore.selectedTaskId = null
}

// --- Splitter state ---
const mainContainerRef = ref<HTMLElement | null>(null)
const sidebarWidth = ref(288) // Default 288px (18rem)
const collapsedSide = ref<'none' | 'left' | 'right'>('none')
const minSidebarWidth = 240

function handleResizeWidth(newWidth: number) {
  sidebarWidth.value = newWidth
  collapsedSide.value = 'none'
}

function collapseLeft() {
  collapsedSide.value = collapsedSide.value === 'left' ? 'none' : 'left'
}

function collapseRight() {
  collapsedSide.value = collapsedSide.value === 'right' ? 'none' : 'right'
}
</script>

<template>
  <div 
    class="flex flex-col h-screen transition-colors duration-300"
    :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] text-gray-200' : 'bg-gray-50 text-gray-800'"
    @click="handleOuterClick"
  >
    <!-- Top Toolbar -->
    <GanttToolbar
      :view-mode="viewMode"
      @update:view-mode="viewMode = $event"
      @add-task="openAddDialog"
      @click.stop
    />

    <!-- Main content area -->
    <div ref="mainContainerRef" class="flex flex-1 overflow-hidden relative z-10" @click.stop>
      <!-- Left sidebar: Task list -->
      <GanttSidebar
        v-if="collapsedSide !== 'left'"
        :scroll-top="sidebarScrollTop"
        :width="collapsedSide === 'right' ? mainContainerRef?.clientWidth || sidebarWidth : sidebarWidth"
        @edit-task="openEditDialog"
      />

      <!-- Splitter -->
      <GanttSplitter
        :container-ref="mainContainerRef"
        :min-left-width="minSidebarWidth"
        :min-right-width="400"
        :collapsed-side="collapsedSide"
        @resize-width="handleResizeWidth"
        @collapse-left="collapseLeft"
        @collapse-right="collapseRight"
      />
      <!-- If collapsed, we still might want to show a button to expand it. The splitter logic provided actually hides handle when collapsed! But wait, their splitter has `showHandle` = isHovering || isDragging && !isCollapsed. This means if it's collapsed, handle is hidden. That's a bit odd, usually you want a way to uncollapse. I'll just keep the splitter present when collapsed and show it. -->
      <!-- Let me adjust: only render timeline if not collapsed right -->

      <!-- Right: Gantt Timeline -->
      <GanttTimeline
        v-if="collapsedSide !== 'right'"
        class="flex-1"
        :view-mode="viewMode"
        @scroll="onTimelineScroll"
        @edit-task="openEditDialog"
      />
    </div>

    <!-- Bottom: Charts section -->
    <div 
      class="border-t px-6 py-4 z-20 transition-colors duration-200"
      :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9]' : 'bg-white border-[#b4b4b4]'"
      @click.stop
    >
      <div class="flex items-center gap-8">
        <!-- Chart label -->
        <div class="text-sm font-bold opacity-80">Task Status Overview</div>

        <!-- Simple inline chart using colored bars -->
        <div class="flex items-center gap-6 flex-1">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-sm bg-slate-400"></div>
            <span class="text-xs font-semibold opacity-80">Not Started</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md border" :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-gray-100 border-[#b4b4b4]'">
              {{ taskStore.statusBreakdown['not_started'] }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-sm bg-blue-500"></div>
            <span class="text-xs font-semibold opacity-80">In Progress</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md border" :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-gray-100 border-[#b4b4b4]'">
              {{ taskStore.statusBreakdown['in_progress'] }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-sm bg-green-500"></div>
            <span class="text-xs font-semibold opacity-80">Completed</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md border" :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-gray-100 border-[#b4b4b4]'">
              {{ taskStore.statusBreakdown['completed'] }}
            </span>
          </div>
        </div>

        <!-- Total indicator -->
        <div class="w-32 text-right">
          <div class="text-sm font-bold">
            {{ taskStore.tasks.length }} <span class="font-medium opacity-60">Total Tasks</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Dialog -->
    <TaskDialog
      :visible="dialogVisible"
      :task="editingTask"
      @update:visible="dialogVisible = $event"
      @saved="editingTask = null"
    />
  </div>
</template>

<style>
/* Global dark theme scrollbar styling */
html.dark ::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
html.dark ::-webkit-scrollbar-track {
  background: #1f1f1f;
  border-left: 1px solid #A9A9A9;
  border-top: 1px solid #A9A9A9;
}
html.dark ::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 6px;
  border: 3px solid #1f1f1f;
}
html.dark ::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}
</style>
