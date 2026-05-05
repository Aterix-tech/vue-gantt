<template>
  <div class="ghost-splitter" :class="{ dragging: isDragging }" @mouseenter="isHovering = true" @mouseleave="isHovering = false">
    <div class="ghost-line" :class="{ visible: showGhost }"></div>

    <div class="ghost-hitbox" @mousedown="startDrag"></div>

    <div class="ghost-handle" :class="{ visible: showHandle }">
      <!-- When left is collapsed, show expand right arrow -->
      <button v-if="collapsedSide === 'left'" class="ghost-icon-btn" type="button" title="Show left pane" @click.stop="emit('collapse-left')">
        <ChevronRight :size="11" class="ghost-icon" />
      </button>

      <!-- When not collapsed, show both collapse arrows -->
      <template v-if="collapsedSide === 'none'">
        <button class="ghost-icon-btn" type="button" title="Hide left pane" @click.stop="emit('collapse-left')">
          <ChevronLeft :size="11" class="ghost-icon" />
        </button>
        <button class="ghost-icon-btn" type="button" title="Hide right pane" @click.stop="emit('collapse-right')">
          <ChevronRight :size="11" class="ghost-icon" />
        </button>
      </template>

      <!-- When right is collapsed, show expand left arrow -->
      <button v-if="collapsedSide === 'right'" class="ghost-icon-btn" type="button" title="Show right pane" @click.stop="emit('collapse-right')">
        <ChevronLeft :size="11" class="ghost-icon" />
      </button>
    </div>
  </div>

  <div v-if="isDragging" class="drag-shield" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  containerRef: {
    type: Object as PropType<HTMLElement | null | any>,
    required: true,
  },
  minLeftWidth: {
    type: Number,
    default: 460,
  },
  minRightWidth: {
    type: Number,
    default: 420,
  },
  splitterWidth: {
    type: Number,
    default: 4,
  },
  collapsedSide: {
    type: String,
    default: 'none',
  },
})

const emit = defineEmits(['resize-width', 'drag-start', 'drag-end', 'collapse-left', 'collapse-right'])

const isDragging = ref(false)
const isHovering = ref(false)
const isCollapsed = computed(() => props.collapsedSide !== 'none')
const showGhost = computed(() => isHovering.value || isDragging.value || isCollapsed.value)
const showHandle = computed(() => isHovering.value || isDragging.value)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getContainerRect = () => {
  const host = props.containerRef?.value || props.containerRef
  return host?.getBoundingClientRect?.() || null
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return

  const rect = getContainerRect()
  if (!rect) return

  const maxLeft = Math.max(props.minLeftWidth, rect.width - props.minRightWidth - props.splitterWidth)
  const nextLeft = clamp(event.clientX - rect.left, props.minLeftWidth, maxLeft)
  emit('resize-width', nextLeft)
}

const stopDrag = () => {
  isDragging.value = false
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  emit('drag-end')
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

const startDrag = (event: MouseEvent) => {
  const rect = getContainerRect()
  if (!rect) return

  isDragging.value = true
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  emit('drag-start')
  event.preventDefault()
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}
</script>

<style scoped>
.ghost-splitter {
  position: relative;
  width: 2px;
  user-select: none;
  z-index: 20;
}

.ghost-hitbox {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  cursor: col-resize;
}

.ghost-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  left: 50%;
  transform: translateX(-50%);
  background: #d1d5db;
  transition: opacity 0.2s ease-in-out;
  opacity: 0;
}

.ghost-line.visible {
  opacity: 1;
}

.ghost-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  box-shadow: 0 4px 8px rgba(15, 23, 42, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  z-index: 2;
}

.ghost-handle.visible {
  opacity: 1;
}

.ghost-icon-btn {
  width: 12px;
  height: 18px;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.ghost-icon {
  color: #64748b;
  width: 11px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.drag-shield {
  position: fixed;
  inset: 0;
  z-index: 15;
  background: transparent;
  cursor: col-resize;
}
</style>
