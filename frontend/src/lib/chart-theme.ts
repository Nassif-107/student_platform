import React from 'react'

// Chart colors that adapt to light/dark mode
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
}

// Shared chart config for consistent styling
export const CHART_CONFIG = {
  // Grid: very subtle, dashed
  grid: {
    strokeDasharray: '3 3',
    stroke: 'hsl(var(--border))',
    strokeOpacity: 0.5,
  },
  // Axis text
  axis: {
    fontSize: 12,
    fill: 'hsl(var(--muted-foreground))',
    tickLine: false,
    axisLine: false,
  },
  // Custom tooltip
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '12px',
      boxShadow: '0 10px 25px hsl(var(--foreground) / 0.08)',
      padding: '12px 16px',
      fontSize: '13px',
    },
    labelStyle: {
      fontWeight: 600,
      marginBottom: '4px',
      color: 'hsl(var(--foreground))',
    },
    itemStyle: {
      color: 'hsl(var(--muted-foreground))',
      padding: '2px 0',
    },
  },
}

// Gradient definitions for chart areas/bars
export function ChartGradients() {
  return React.createElement(
    'defs',
    null,
    React.createElement(
      'linearGradient',
      { id: 'gradientPrimary', x1: '0', y1: '0', x2: '0', y2: '1' },
      React.createElement('stop', { offset: '0%', stopColor: 'hsl(var(--primary))', stopOpacity: 0.3 }),
      React.createElement('stop', { offset: '100%', stopColor: 'hsl(var(--primary))', stopOpacity: 0.02 }),
    ),
    React.createElement(
      'linearGradient',
      { id: 'gradientSuccess', x1: '0', y1: '0', x2: '0', y2: '1' },
      React.createElement('stop', { offset: '0%', stopColor: 'hsl(var(--success))', stopOpacity: 0.3 }),
      React.createElement('stop', { offset: '100%', stopColor: 'hsl(var(--success))', stopOpacity: 0.02 }),
    ),
    React.createElement(
      'linearGradient',
      { id: 'gradientInfo', x1: '0', y1: '0', x2: '0', y2: '1' },
      React.createElement('stop', { offset: '0%', stopColor: 'hsl(var(--info))', stopOpacity: 0.3 }),
      React.createElement('stop', { offset: '100%', stopColor: 'hsl(var(--info))', stopOpacity: 0.02 }),
    ),
  )
}
