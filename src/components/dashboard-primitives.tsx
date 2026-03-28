import * as React from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

export function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <div className="rounded-full border border-border bg-muted/40 p-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      <div className="max-w-xs text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToggleRow
// ---------------------------------------------------------------------------

export function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-border bg-muted/40 p-2">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// CheckboxRow
// ---------------------------------------------------------------------------

export function CheckboxRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="space-y-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}

// ---------------------------------------------------------------------------
// SliderField
// ---------------------------------------------------------------------------

export function SliderField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <Slider
        min={-100}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? 0)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// RangeField
// ---------------------------------------------------------------------------

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? min)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusPill
// ---------------------------------------------------------------------------

export function StatusPill({
  label,
  active,
  activeLabel = "Ready",
  inactiveLabel = "Offline",
}: {
  label: string
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            "size-2 rounded-full",
            active ? "bg-primary" : "bg-muted-foreground/40"
          )}
        />
        {active ? activeLabel : inactiveLabel}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs tracking-[0.18em] uppercase">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VoiceMeta
// ---------------------------------------------------------------------------

export function VoiceMeta({
  voiceKey,
  voices,
}: {
  voiceKey: string
  voices: Array<{
    shortName: string
    locale: string
    gender: string
    personalities: string[]
  }>
}) {
  const voice = voices.find((item) => item.shortName === voiceKey)

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      {voice ? (
        <div className="space-y-1">
          <div>{voice.locale}</div>
          <div>{voice.gender}</div>
          <div>{voice.personalities.join(", ") || "General"}</div>
        </div>
      ) : (
        <div>Voice metadata unavailable.</div>
      )}
    </div>
  )
}
