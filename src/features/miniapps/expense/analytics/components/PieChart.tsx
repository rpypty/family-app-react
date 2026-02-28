import type { CSSProperties } from 'react'
import { Box } from '@mui/material'

export type PieSlice = {
  id?: string
  label: string
  emoji?: string
  value: number
  color: string
}

type PieChartProps = {
  slices: PieSlice[]
  size?: number
  className?: string
  activeSliceId?: string | null
  onSliceClick?: (slice: PieSlice, index: number) => void
  centerValue?: string
  centerLabel?: string
  holeRatio?: number
}

const polarToCartesian = (center: number, radius: number, angleDegrees: number) => {
  const angle = (angleDegrees * Math.PI) / 180
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  }
}

const describeDonutArc = (
  center: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) => {
  const startOuter = polarToCartesian(center, outerRadius, startAngle)
  const endOuter = polarToCartesian(center, outerRadius, endAngle)
  const startInner = polarToCartesian(center, innerRadius, startAngle)
  const endInner = polarToCartesian(center, innerRadius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

const describePieArc = (center: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(center, radius, startAngle)
  const end = polarToCartesian(center, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

export function PieChart({
  slices,
  size = 180,
  className,
  activeSliceId,
  onSliceClick,
  centerValue,
  centerLabel,
  holeRatio = 0.58,
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
  const outerRadius = size / 2
  const normalizedHoleRatio = Math.min(0.8, Math.max(0, holeRatio))
  const isDonut = normalizedHoleRatio > 0.05
  const innerRadius = isDonut ? outerRadius * normalizedHoleRatio : 0
  const ringWidth = isDonut ? outerRadius - innerRadius : outerRadius

  const paths = slices.reduce<{
    nextStartAngle: number
    items: Array<{
      path: string
      color: string
      percent: number
      labelPos: { x: number; y: number }
      label: string
      emoji?: string
      id?: string
      offsetPoint: { x: number; y: number }
    }>
  }>((acc, slice) => {
    const sweep = (slice.value / total) * 360
    const adjustedSweep = sweep >= 360 ? 359.999 : sweep
    const endAngle = acc.nextStartAngle + adjustedSweep
    const path = isDonut
      ? describeDonutArc(
          center,
          outerRadius,
          innerRadius,
          acc.nextStartAngle,
          endAngle,
        )
      : describePieArc(center, outerRadius, acc.nextStartAngle, endAngle)
    const midAngle = acc.nextStartAngle + sweep / 2
    const percent = (slice.value / total) * 100
    const labelPos = isDonut
      ? polarToCartesian(center, innerRadius + ringWidth * 0.5, midAngle)
      : polarToCartesian(center, outerRadius * 0.62, midAngle)
    const offset = 6
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
          emoji: slice.emoji,
          id: slice.id,
          offsetPoint,
        },
      ],
    }
  }, { nextStartAngle: -90, items: [] }).items

  const style: CSSProperties = { width: size, height: size }

  const isInteractive = Boolean(onSliceClick)
  const resolvedCenterValue = centerValue ?? String(Math.round(total))
  const valueFontSize = resolvedCenterValue.length > 10 ? 12 : 16
  const shouldShowCenterValue = isDonut
  const shouldShowCenterLabel = isDonut && Boolean(centerLabel)

  return (
    <Box
      className={className}
      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'text.primary' }}
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
        {paths.map((slice, index) => {
          if (slice.percent < 6) return null
          const showEmoji = Boolean(slice.emoji) && slice.percent >= 13
          const percentY = showEmoji ? slice.labelPos.y + 6 : slice.labelPos.y
          return (
            <g key={`${slice.label}-label-${index}`} onClick={() => onSliceClick?.(slices[index], index)}>
              {showEmoji ? (
                <text
                  x={slice.labelPos.x}
                  y={slice.labelPos.y - 7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 12,
                    opacity: 0.9,
                    cursor: isInteractive ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  {slice.emoji}
                </text>
              ) : null}
              <text
                x={slice.labelPos.x}
                y={percentY}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fill: 'rgba(255,255,255,0.82)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: isInteractive ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {slice.percent.toFixed(0)}%
              </text>
            </g>
          )
        })}
        {shouldShowCenterValue ? (
          <text
            x={center}
            y={shouldShowCenterLabel ? center - 6 : center}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fill: 'currentColor',
              fontSize: valueFontSize,
              fontWeight: 700,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {resolvedCenterValue}
          </text>
        ) : null}
        {shouldShowCenterLabel ? (
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fill: 'currentColor',
              fontSize: 11,
              opacity: 0.65,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {centerLabel}
          </text>
        ) : null}
      </svg>
    </Box>
  )
}
