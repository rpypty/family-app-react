import type { CSSProperties } from 'react'
import { Box } from '@mui/material'

export type PieSlice = {
  id?: string
  label: string
  value: number
  color: string
}

type PieChartProps = {
  slices: PieSlice[]
  size?: number
  className?: string
  activeSliceId?: string | null
  onSliceClick?: (slice: PieSlice, index: number) => void
}

const polarToCartesian = (center: number, radius: number, angleDegrees: number) => {
  const angle = (angleDegrees * Math.PI) / 180
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  }
}

const describeArc = (center: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(center, radius, endAngle)
  const end = polarToCartesian(center, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

export function PieChart({
  slices,
  size = 180,
  className,
  activeSliceId,
  onSliceClick,
}: PieChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  if (total <= 0) {
    return (
      <Box
        className={className}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px dashed',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          color: 'text.secondary',
          bgcolor: 'background.paper',
        }}
      >
        0
      </Box>
    )
  }

  const center = size / 2
  const radius = size / 2

  const paths = slices.reduce<{
    nextStartAngle: number
    items: Array<{
      path: string
      color: string
      percent: number
      labelPos: { x: number; y: number }
      label: string
      id?: string
      offsetPoint: { x: number; y: number }
    }>
  }>((acc, slice) => {
    const sweep = (slice.value / total) * 360
    const endAngle = acc.nextStartAngle + sweep
    const path = describeArc(center, radius, acc.nextStartAngle, endAngle)
    const midAngle = acc.nextStartAngle + sweep / 2
    const percent = (slice.value / total) * 100
    const labelPos = polarToCartesian(center, radius * 0.62, midAngle)
    const offset = 8
    const angleRad = (midAngle * Math.PI) / 180
    const offsetPoint = {
      x: Math.cos(angleRad) * offset,
      y: Math.sin(angleRad) * offset,
    }

    return {
      nextStartAngle: endAngle,
      items: [
        ...acc.items,
        {
          path,
          color: slice.color,
          percent,
          labelPos,
          label: slice.label,
          id: slice.id,
          offsetPoint,
        },
      ],
    }
  }, { nextStartAngle: -90, items: [] }).items

  const style: CSSProperties = { width: size, height: size }

  const isInteractive = Boolean(onSliceClick)

  return (
    <Box
      className={className}
      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={style}>
        {paths.map((slice, index) => {
          const isActive = activeSliceId ? slice.id === activeSliceId : false
          const isDimmed = activeSliceId ? !isActive : false
          return (
            <path
              key={`${slice.label}-${index}`}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth={isActive ? 2 : 1}
              onClick={() => onSliceClick?.(slices[index], index)}
              style={{
                cursor: isInteractive ? 'pointer' : 'default',
                opacity: isDimmed ? 0.6 : 1,
                filter: isActive ? 'drop-shadow(0px 4px 6px rgba(0,0,0,0.25))' : 'none',
                transform: isActive
                  ? `translate(${slice.offsetPoint.x}px, ${slice.offsetPoint.y}px)`
                  : 'translate(0px, 0px)',
                transition: 'transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease',
              }}
            />
          )
        })}
        {paths.map((slice, index) =>
          slice.percent >= 6 ? (
            <text
              key={`${slice.label}-label-${index}`}
              x={slice.labelPos.x}
              y={slice.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              onClick={() => onSliceClick?.(slices[index], index)}
              style={{
                fill: 'white',
                fontSize: 12,
                fontWeight: 700,
                cursor: isInteractive ? 'pointer' : 'default',
                userSelect: 'none',
              }}
            >
              {slice.percent.toFixed(0)}%
            </text>
          ) : null,
        )}
      </svg>
    </Box>
  )
}
