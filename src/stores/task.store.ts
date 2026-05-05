import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

export type TaskStatus = 'not_started' | 'in_progress' | 'completed'

export type DependencyEdgeType = 'smoothstep' | 'step' | 'straight'

export interface Task {
  id: string
  title: string
  plannedStartDateTime: string // ISO format or YYYY-MM-DD HH:mm
  plannedEndDateTime: string // ISO format or YYYY-MM-DD HH:mm
  actualStartDateTime?: string // undefined if not started
  actualEndDateTime?: string // undefined if not completed
  status: TaskStatus
  assignee: string
  dependencies: string[]
  dependencyEdgeType?: DependencyEdgeType
}

export type TimingResult = 'not_started' | 'in_progress' | 'finished_early' | 'finished_on_time' | 'finished_late' | 'late_not_finished'

/** Generate a simple unique ID */
function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useTaskStore = defineStore('tasks', () => {
  // --- State ---
  const tasks = ref<Task[]>(createMockTasks())
  
  // Initialize theme based on system preference
  const prefersDarkMedia = window.matchMedia('(prefers-color-scheme: dark)')
  const isDarkTheme = ref<boolean>(prefersDarkMedia.matches)
  
  function applyThemeClass(isDark: boolean) {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }
  
  applyThemeClass(isDarkTheme.value)

  // Listen for system theme changes
  prefersDarkMedia.addEventListener('change', (e) => {
    isDarkTheme.value = e.matches
    applyThemeClass(e.matches)
  })

  const selectedTaskId = ref<string | null>(null)
  const taskToScrollTo = ref<string | null>(null)

  // --- Getters ---
  const taskMap = computed(() => {
    const map = new Map<string, Task>()
    for (const task of tasks.value) {
      map.set(task.id, task)
    }
    return map
  })

  const timelineStart = computed(() => {
    if (tasks.value.length === 0) return dayjs().format('YYYY-MM-DDTHH:mm')
    const earliest = tasks.value.reduce((min, t) =>
      t.plannedStartDateTime < min ? t.plannedStartDateTime : min, tasks.value[0]!.plannedStartDateTime)
    // Add 2 day buffer before
    return dayjs(earliest).subtract(2, 'day').format('YYYY-MM-DDTHH:mm')
  })

  const timelineEnd = computed(() => {
    if (tasks.value.length === 0) return dayjs().add(14, 'day').format('YYYY-MM-DDTHH:mm')
    const latest = tasks.value.reduce((max, t) =>
      t.plannedEndDateTime > max ? t.plannedEndDateTime : max, tasks.value[0]!.plannedEndDateTime)
    // Add 5 day buffer after
    return dayjs(latest).add(5, 'day').format('YYYY-MM-DDTHH:mm')
  })

  /** Status breakdown for charts */
  const statusBreakdown = computed(() => {
    const counts: Record<TaskStatus, number> = { not_started: 0, in_progress: 0, completed: 0 }
    for (const task of tasks.value) {
      counts[task.status]++
    }
    return counts
  })

  // --- Actions ---
  function toggleTheme() {
    isDarkTheme.value = !isDarkTheme.value
    if (isDarkTheme.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function addTask(taskData: Omit<Task, 'id'>) {
    tasks.value.push({ ...taskData, id: generateId() })
  }

  function updateTask(id: string, taskData: Partial<Omit<Task, 'id'>>) {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index]!, ...taskData }
    }
  }

  function deleteTask(id: string) {
    const taskToDelete = getTask(id)
    if (!taskToDelete) return

    // Find all tasks that depend on the deleted task (outgoing)
    const dependentTasks = tasks.value.filter(t => t.dependencies.includes(id))
    
    // The deleted task's dependencies (incoming)
    const incomingDeps = taskToDelete.dependencies

    // For each task that depended on the deleted task, 
    // remove the deleted task from its dependencies,
    // and add the deleted task's incoming dependencies (reconnect A -> C)
    for (const depTask of dependentTasks) {
      // Remove deleted task ID
      depTask.dependencies = depTask.dependencies.filter(depId => depId !== id)
      
      // Add incoming dependencies from deleted task, avoiding duplicates and self-references
      for (const incomingDep of incomingDeps) {
        if (incomingDep !== depTask.id && !depTask.dependencies.includes(incomingDep)) {
          depTask.dependencies.push(incomingDep)
        }
      }
    }

    // Finally, remove the task itself
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  function getTask(id: string): Task | undefined {
    return taskMap.value.get(id)
  }

  return {
    tasks,
    taskMap,
    timelineStart,
    timelineEnd,
    statusBreakdown,
    isDarkTheme,
    selectedTaskId,
    taskToScrollTo,
    toggleTheme,
    addTask,
    updateTask,
    deleteTask,
    getTask,
  }
})

/** Create initial mock data for demonstration */
function createMockTasks(): Task[] {
  const today = dayjs()
  return [
    {
      id: 'task-1',
      title: 'Project Kickoff',
      plannedStartDateTime: today.subtract(2, 'day').format('YYYY-MM-DDTHH:mm'),
      plannedEndDateTime: today.subtract(1, 'day').format('YYYY-MM-DDTHH:mm'),
      status: 'completed',
      actualStartDateTime: today.subtract(2, 'day').format('YYYY-MM-DDTHH:mm'),
      actualEndDateTime: today.subtract(1, 'day').format('YYYY-MM-DDTHH:mm'),
      assignee: 'Alice',
      dependencies: [],
      dependencyEdgeType: 'smoothstep'
    },
    {
      id: 'task-2',
      title: 'Requirements Gathering',
      plannedStartDateTime: today.subtract(1, 'day').format('YYYY-MM-DDTHH:mm'),
      plannedEndDateTime: today.add(2, 'day').format('YYYY-MM-DDTHH:mm'),
      status: 'in_progress',
      actualStartDateTime: today.subtract(1, 'day').format('YYYY-MM-DDTHH:mm'),
      assignee: 'Bob',
      dependencies: ['task-1'],
      dependencyEdgeType: 'step'
    },
    {
      id: 'task-3',
      title: 'UI/UX Design',
      plannedStartDateTime: today.add(1, 'day').format('YYYY-MM-DDTHH:mm'),
      plannedEndDateTime: today.add(5, 'day').format('YYYY-MM-DDTHH:mm'),
      status: 'not_started',
      assignee: 'Carol',
      dependencies: ['task-1'],
      dependencyEdgeType: 'smoothstep'
    },
    {
      id: 'task-4',
      title: 'Backend API Development',
      plannedStartDateTime: today.add(3, 'day').format('YYYY-MM-DDTHH:mm'),
      plannedEndDateTime: today.add(9, 'day').format('YYYY-MM-DDTHH:mm'),
      status: 'not_started',
      assignee: 'Dave',
      dependencies: ['task-2'],
      dependencyEdgeType: 'straight'
    },
    {
      id: 'task-5',
      title: 'Frontend Implementation',
      plannedStartDateTime: today.add(4, 'day').format('YYYY-MM-DDTHH:mm'),
      plannedEndDateTime: today.add(10, 'day').format('YYYY-MM-DDTHH:mm'),
      status: 'not_started',
      assignee: 'Eve',
      dependencies: ['task-3', 'task-2'],
      dependencyEdgeType: 'smoothstep'
    },
    {
      id: 'task-6',
      title: 'Testing & QA',
      plannedStartDateTime: today.add(10, 'day').format('YYYY-MM-DDTHH:mm'),
      plannedEndDateTime: today.add(13, 'day').format('YYYY-MM-DDTHH:mm'),
      status: 'not_started',
      assignee: 'Frank',
      dependencies: ['task-4', 'task-5'],
      dependencyEdgeType: 'step'
    },
  ]
}

/** Utility to generate automated review */
export function generateAutomatedReview(task: Task): string {
  if (!task.actualStartDateTime) {
    return "Task has not started yet."
  }
  if (!task.actualEndDateTime) {
    return "Task is currently in progress."
  }

  const plannedStart = dayjs(task.plannedStartDateTime)
  const actualStart = dayjs(task.actualStartDateTime)
  const plannedEnd = dayjs(task.plannedEndDateTime)
  const actualEnd = dayjs(task.actualEndDateTime)

  const startDiff = actualStart.diff(plannedStart, 'minute')
  const endDiff = actualEnd.diff(plannedEnd, 'minute')

  const isStartEarly = startDiff <= -5
  const isStartLate = startDiff >= 5
  const isStartOnTime = !isStartEarly && !isStartLate

  const isEndEarly = endDiff <= -5
  const isEndLate = endDiff >= 5
  const isEndOnTime = !isEndEarly && !isEndLate

  if (isStartOnTime && isEndOnTime) return "Perfect. The task started and ended on time."
  if (isStartEarly && isEndOnTime) return "Started early and finished on time."
  if (isStartEarly && isEndEarly) return "Excellent. Started early and finished early."
  if (isStartEarly && isEndLate) return "Started early but finished later than planned."
  if (isStartLate && isEndOnTime) return "Started late but still finished on time."
  if (isStartLate && isEndLate) return "Started late and finished late."
  if (isStartOnTime && isEndEarly) return "Started on time and finished early."
  if (isStartOnTime && isEndLate) return "Started on time but finished late."

  return "Review unavailable."
}

export function getTaskTimingResult(task: Task): TimingResult {
  if (!task.actualStartDateTime) return 'not_started'
  if (!task.actualEndDateTime) return 'in_progress'

  const plannedEnd = dayjs(task.plannedEndDateTime)
  const actualEnd = dayjs(task.actualEndDateTime)
  const endDiff = actualEnd.diff(plannedEnd, 'minute')

  if (endDiff <= -5) return 'finished_early'
  if (endDiff >= 5) return 'finished_late'
  return 'finished_on_time'
}
