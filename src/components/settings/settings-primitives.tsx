import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function SectionHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

export function SettingsField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

export function SettingsToggle({
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
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-border bg-muted/40 p-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function SettingsCheckbox({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="rounded-md border border-border bg-muted/40 p-1.5">
            <Icon className="size-3.5 text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
    </label>
  )
}

export function SettingsRange({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  formatValue?: (value: number) => string
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? min)}
      />
    </div>
  )
}

export type SettingsChoiceOption<T extends string> = {
  value: T
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  preview?: string
}

export function SettingsChoice<T extends string>({
  value,
  onChange,
  options,
  variant = "compact",
}: {
  value: T
  onChange: (value: T) => void
  options: SettingsChoiceOption<T>[]
  variant?: "compact" | "card"
}) {
  if (variant === "card") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              )}
            >
              {option.icon && (
                <div
                  className={cn(
                    "mt-0.5 rounded-md border p-1.5",
                    selected
                      ? "border-primary/30 bg-primary/10"
                      : "border-border bg-muted/40"
                  )}
                >
                  <option.icon
                    className={cn(
                      "size-3.5",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
              )}
              <div>
                <div
                  className={cn(
                    "text-sm",
                    selected
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            aria-label={option.label}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.icon && <option.icon className="size-4" />}
            {option.preview ? (
              <span className="font-mono text-xs sm:text-sm">
                {option.preview}
              </span>
            ) : (
              option.label
            )}
          </button>
        )
      })}
    </div>
  )
}
