<script setup lang="ts">
import { useTaskStore } from '@/stores/task.store'
import type { Task, DependencyEdgeType } from '@/stores/task.store'

const props = defineProps<{
  tasks: Task[]
  getTaskCenter: (task: Task) => { x: number; y: number }
  getTaskStart: (task: Task) => { x: number; y: number }
  totalWidth: number
  totalHeight: number
}>()

const taskStore = useTaskStore()

/**
 * Build dependency edges as array of { from, to, type } points
 */
function getDependencyEdges() {
  const taskMap = new Map(props.tasks.map(t => [t.id, t]))
  const edges: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; type: DependencyEdgeType }> = []

  for (const task of props.tasks) {
    for (const depId of task.dependencies) {
      const depTask = taskMap.get(depId)
      if (!depTask) continue

      const from = props.getTaskCenter(depTask) // right side of dependency task
      const to = props.getTaskStart(task)        // left side of dependent task
      const type = task.dependencyEdgeType || 'smoothstep'

      edges.push({ from, to, type })
    }
  }
  return edges
}

/**
 * Create an SVG path for a dependency arrow (Finish → Start)
 */
function createPath(from: { x: number; y: number }, to: { x: number; y: number }, type: DependencyEdgeType): string {
  const midX = from.x + Math.max((to.x - from.x) / 2, 10)
  
  if (type === 'straight') {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  } else if (type === 'step') {
    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`
  } else {
    // smoothstep
    const radius = Math.min(Math.abs(to.y - from.y) / 2, 10)
    
    // If moving straight horizontally, just a line
    if (Math.abs(to.y - from.y) < 2) {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    }

    const dirY = to.y > from.y ? 1 : -1
    
    return `M ${from.x} ${from.y} 
            L ${midX - radius} ${from.y} 
            Q ${midX} ${from.y} ${midX} ${from.y + radius * dirY} 
            L ${midX} ${to.y - radius * dirY} 
            Q ${midX} ${to.y} ${midX + radius} ${to.y} 
            L ${to.x} ${to.y}`
  }
}
</script>

<template>
  <svg
    class="absolute inset-0 z-[25] pointer-events-none"
    :width="totalWidth"
    :height="totalHeight"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <marker
        id="arrowhead-solid"
        markerWidth="6"
        markerHeight="6"
        refX="5"
        refY="3"
        orient="auto"
      >
        <polygon points="0 1, 6 3, 0 5" :fill="taskStore.isDarkTheme ? '#A9A9A9' : '#b4b4b4'" />
      </marker>
    </defs>

    <g v-for="(edge, i) in getDependencyEdges()" :key="i">
      <!-- Outer stroke for border effect -->
      <path
        :d="createPath(edge.from, edge.to, edge.type)"
        fill="none"
        :stroke="taskStore.isDarkTheme ? '#1f1f1f' : '#ffffff'"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <!-- Inner solid line -->
      <path
        :d="createPath(edge.from, edge.to, edge.type)"
        fill="none"
        :stroke="taskStore.isDarkTheme ? '#A9A9A9' : '#b4b4b4'"
        :stroke-width="edge.type === 'straight' ? 1.5 : 2"
        stroke-linejoin="round"
        marker-end="url(#arrowhead-solid)"
      />
    </g>
  </svg>
</template>
