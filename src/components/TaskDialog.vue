<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTaskStore, generateAutomatedReview } from '@/stores/task.store'
import type { Task, TaskStatus, DependencyEdgeType } from '@/stores/task.store'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  task: Task | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const taskStore = useTaskStore()

const isEdit = computed(() => props.task !== null)
const dialogTitle = computed(() => isEdit.value ? 'Edit Task' : 'Add Task')

// Form data
const form = ref({
  title: '',
  plannedStartDateTime: '',
  plannedEndDateTime: '',
  status: 'not_started' as TaskStatus,
  assignee: '',
  dependencies: [] as string[],
  dependencyEdgeType: 'smoothstep' as DependencyEdgeType
})

// Readonly or action data
const actualStartDateTime = ref<string | undefined>(undefined)
const actualEndDateTime = ref<string | undefined>(undefined)

// Available tasks for dependency selection (exclude self)
const availableDeps = computed(() => {
  return taskStore.tasks.filter(t => t.id !== props.task?.id)
})

// Reset form when dialog opens
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.task) {
      form.value = {
        title: props.task.title,
        plannedStartDateTime: props.task.plannedStartDateTime,
        plannedEndDateTime: props.task.plannedEndDateTime,
        status: props.task.status,
        assignee: props.task.assignee,
        dependencies: [...props.task.dependencies],
        dependencyEdgeType: props.task.dependencyEdgeType || 'smoothstep'
      }
      actualStartDateTime.value = props.task.actualStartDateTime
      actualEndDateTime.value = props.task.actualEndDateTime
    } else {
      const today = dayjs().startOf('hour')
      const nextWeek = today.add(7, 'day')
      form.value = {
        title: '',
        plannedStartDateTime: today.format('YYYY-MM-DDTHH:mm'),
        plannedEndDateTime: nextWeek.format('YYYY-MM-DDTHH:mm'),
        status: 'not_started',
        assignee: '',
        dependencies: [],
        dependencyEdgeType: 'smoothstep'
      }
      actualStartDateTime.value = undefined
      actualEndDateTime.value = undefined
    }
  }
})

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const edgeTypes: Array<{ value: DependencyEdgeType; label: string }> = [
  { value: 'smoothstep', label: 'Smooth Step' },
  { value: 'step', label: 'Step (Right Angle)' },
  { value: 'straight', label: 'Straight Line' },
]

// Actions
function handleStartWork() {
  actualStartDateTime.value = dayjs().format('YYYY-MM-DDTHH:mm')
  form.value.status = 'in_progress'
}

function handleEndWork() {
  actualEndDateTime.value = dayjs().format('YYYY-MM-DDTHH:mm')
  form.value.status = 'completed'
}

const automatedReview = computed(() => {
  if (!isEdit.value) return 'Save the task first to track work.'
  
  // Create a temporary task to feed to the review generator
  const tempTask: Task = {
    ...props.task!,
    plannedStartDateTime: form.value.plannedStartDateTime,
    plannedEndDateTime: form.value.plannedEndDateTime,
    actualStartDateTime: actualStartDateTime.value,
    actualEndDateTime: actualEndDateTime.value
  }
  return generateAutomatedReview(tempTask)
})

function onSave() {
  if (!form.value.title.trim()) return

  const dataToSave = {
    ...form.value,
    actualStartDateTime: actualStartDateTime.value,
    actualEndDateTime: actualEndDateTime.value,
  }

  if (isEdit.value && props.task) {
    taskStore.updateTask(props.task.id, dataToSave)
  } else {
    taskStore.addTask(dataToSave)
  }
  emit('update:visible', false)
  emit('saved')
}

function onDelete() {
  if (props.task) {
    taskStore.deleteTask(props.task.id)
    if (taskStore.selectedTaskId === props.task.id) {
      taskStore.selectedTaskId = null
    }
    emit('update:visible', false)
    emit('saved')
  }
}

function onClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="onClose"
        ></div>

        <!-- Dialog -->
        <div 
          class="relative w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden transition-colors duration-200 flex flex-col max-h-full border"
          :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9] text-gray-200' : 'bg-white border-[#b4b4b4] text-gray-800'"
        >
          <!-- Header -->
          <div 
            class="flex items-center justify-between px-6 py-4 border-b transition-colors duration-200"
            :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-gray-50 border-[#b4b4b4]'"
          >
            <h2 class="text-lg font-bold">{{ dialogTitle }}</h2>
            <button
              class="hover:opacity-70 transition-opacity p-1"
              @click="onClose"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Form body -->
          <div class="px-6 py-5 overflow-y-auto space-y-6">
            <!-- Title -->
            <div>
              <label class="block text-sm font-bold mb-1.5 opacity-80">Title</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="Enter task title"
                class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-white placeholder-gray-500' : 'bg-white border-[#b4b4b4] text-gray-900 placeholder-gray-400'"
              />
            </div>

            <!-- Planned Dates -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold mb-1.5 opacity-80">Planned Start</label>
                <input
                  v-model="form.plannedStartDateTime"
                  type="datetime-local"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-white' : 'bg-white border-[#b4b4b4] text-gray-900'"
                />
              </div>
              <div>
                <label class="block text-sm font-bold mb-1.5 opacity-80">Planned End</label>
                <input
                  v-model="form.plannedEndDateTime"
                  type="datetime-local"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-white' : 'bg-white border-[#b4b4b4] text-gray-900'"
                />
              </div>
            </div>

            <!-- Status & Assignee row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold mb-1.5 opacity-80">Status</label>
                <select
                  v-model="form.status"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-white' : 'bg-white border-[#b4b4b4] text-gray-900'"
                >
                  <option
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold mb-1.5 opacity-80">Assignee</label>
                <input
                  v-model="form.assignee"
                  type="text"
                  placeholder="Name"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-white' : 'bg-white border-[#b4b4b4] text-gray-900'"
                />
              </div>
            </div>

            <!-- Dependencies & Edge Type -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold mb-1.5 opacity-80">Dependencies</label>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="dep in availableDeps"
                    :key="dep.id"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border"
                    :class="[
                      form.dependencies.includes(dep.id)
                        ? (taskStore.isDarkTheme ? 'bg-blue-900 text-blue-200 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-300')
                        : (taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] hover:bg-[#333333]' : 'bg-white text-gray-600 border-[#b4b4b4] hover:bg-gray-50')
                    ]"
                  >
                    <input
                      type="checkbox"
                      :checked="form.dependencies.includes(dep.id)"
                      class="sr-only"
                      @change="
                        form.dependencies.includes(dep.id)
                          ? form.dependencies = form.dependencies.filter(d => d !== dep.id)
                          : form.dependencies.push(dep.id)
                      "
                    />
                    {{ dep.title }}
                  </label>
                </div>
                <p v-if="availableDeps.length === 0" class="text-xs opacity-50 mt-1 font-medium">
                  No other tasks available
                </p>
              </div>

              <div>
                <label class="block text-sm font-bold mb-1.5 opacity-80">Dependency Style</label>
                <select
                  v-model="form.dependencyEdgeType"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9] text-white' : 'bg-white border-[#b4b4b4] text-gray-900'"
                >
                  <option
                    v-for="opt in edgeTypes"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Work Time & Review Section -->
            <div 
              class="border rounded-xl p-4 mt-4"
              :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-blue-50/50 border-[#b4b4b4]'"
            >
              <h3 class="text-sm font-bold mb-4">Work Tracking & Review</h3>
              
              <div class="flex items-center gap-6 mb-4">
                <button
                  class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm"
                  :class="actualStartDateTime ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-700'"
                  :disabled="!!actualStartDateTime"
                  @click="handleStartWork"
                >
                  Start Work
                </button>

                <button
                  class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm"
                  :class="(!actualStartDateTime || actualEndDateTime) ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 border border-blue-700'"
                  :disabled="!actualStartDateTime || !!actualEndDateTime"
                  @click="handleEndWork"
                >
                  End Work
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span class="font-semibold opacity-70">Actual Start:</span>
                  <div class="mt-1 font-mono text-xs">{{ actualStartDateTime ? dayjs(actualStartDateTime).format('MMM DD, YYYY HH:mm') : 'Not started' }}</div>
                </div>
                <div>
                  <span class="font-semibold opacity-70">Actual End:</span>
                  <div class="mt-1 font-mono text-xs">{{ actualEndDateTime ? dayjs(actualEndDateTime).format('MMM DD, YYYY HH:mm') : 'Not finished' }}</div>
                </div>
              </div>

              <div 
                class="p-3 rounded-lg border text-sm font-medium"
                :class="taskStore.isDarkTheme ? 'bg-[#2a2a2a] border-[#A9A9A9]' : 'bg-white border-[#b4b4b4]'"
              >
                <span class="opacity-70 mr-2">Automated Review:</span>
                <span :class="taskStore.isDarkTheme ? 'text-yellow-400' : 'text-blue-700'">{{ automatedReview }}</span>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div 
            class="flex items-center justify-between px-6 py-4 border-t transition-colors duration-200"
            :class="taskStore.isDarkTheme ? 'bg-[#1f1f1f] border-[#A9A9A9]' : 'bg-gray-50 border-[#b4b4b4]'"
          >
            <button
              v-if="isEdit"
              class="px-4 py-2 text-sm font-bold text-red-500 hover:text-white hover:bg-red-600 border border-red-500 rounded-lg transition-all"
              @click="onDelete"
            >
              Delete Task
            </button>
            <div v-else></div>

            <div class="flex items-center gap-3">
              <button
                class="px-4 py-2 text-sm font-bold border rounded-lg transition-all"
                :class="taskStore.isDarkTheme ? 'text-gray-300 border-[#A9A9A9] hover:bg-[#333333]' : 'text-gray-600 border-[#b4b4b4] hover:bg-gray-100'"
                @click="onClose"
              >
                Cancel
              </button>
              <button
                class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-sm border border-blue-700"
                @click="onSave"
              >
                {{ isEdit ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
