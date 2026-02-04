import type { CSSProperties } from 'react'
import { Box } from '@mui/material'

export type PieSlice = {
  label: string
  value: number
  color: string
}

type PieChartProps = {
  slices: PieSlice[]
  size?: number
  className?: string
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

export function PieChart({ slices, size = 180, className }: PieChartProps) {
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

  let startAngle = -90
  const center = size / 2
  const radius = size / 2

  const paths = slices.map((slice) => {
    const sweep = (slice.value / total) * 360
    const endAngle = startAngle + sweep
    const path = describeArc(center, radius, startAngle, endAngle)
    const midAngle = startAngle + sweep / 2
    const percent = (slice.value / total) * 100
    const labelPos = polarToCartesian(center, radius * 0.62, midAngle)
    const result = {
      path,
      color: slice.color,
      percent,
      labelPos,
      label: slice.label,
    }
    startAngle = endAngle
    return result
  })

  const style: CSSProperties = { width: size, height: size }

  return (
    <Box className={className} sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={style}>
        {paths.map((slice, index) => (
          <path
            key={`${slice.label}-${index}`}
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth={1}
          />
        ))}
        {paths.map((slice, index) =>
          slice.percent >= 6 ? (
            <text
              key={`${slice.label}-label-${index}`}
              x={slice.labelPos.x}
              y={slice.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: 'white', fontSize: 12, fontWeight: 700 }}
            >
              {slice.percent.toFixed(0)}%
            </text>
          ) : null,
        )}
      </svg>
    </Box>
  )
}
