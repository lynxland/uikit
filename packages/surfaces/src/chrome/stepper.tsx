import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/**
 * Controlled wizard progress skeleton (design.md §6.3). The page owns
 * `current`; clicking a step only reports the requested index.
 */

export interface StepperStep {
  key: string;
  label: ReactNode;
  description?: ReactNode;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  current: number;
  onChange: (index: number) => void;
  orientation?: "horizontal" | "vertical";
  /** Optional current-step content rendered under the indicator list. */
  children?: ReactNode;
  "aria-label"?: string;
  className?: string;
}

function stepState(index: number, current: number): "done" | "current" | "pending" {
  if (index < current) return "done";
  if (index === current) return "current";
  return "pending";
}

export function Stepper({
  steps,
  current,
  onChange,
  orientation = "horizontal",
  children,
  "aria-label": ariaLabel = "Progress",
  className,
}: StepperProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  return (
    <div
      className={merge("ui-stepper", `ui-stepper--${orientation}`, className)}
      data-testid="stepper"
      data-orientation={orientation}
    >
      <ol className="ui-stepper__list" aria-label={ariaLabel}>
        {steps.map((step, index) => {
          const state = stepState(index, current);
          return (
            <li key={step.key} className="ui-stepper__item" data-step-index={index}>
              <button
                type="button"
                className="ui-stepper__step"
                data-state={state}
                onClick={() => onChange(index)}
                {...(state === "current" ? { "aria-current": "step" as const } : {})}
              >
                <span className="ui-stepper__indicator" aria-hidden="true">
                  {state === "done" ? <ui.icons.Check size={12} /> : index + 1}
                </span>
                <span className="ui-stepper__text">
                  <span className="ui-stepper__label">{step.label}</span>
                  {step.description !== undefined ? (
                    <span className="ui-stepper__description">{step.description}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {children !== undefined ? (
        <div className="ui-stepper__content" data-testid="stepper-content">
          {children}
        </div>
      ) : null}
    </div>
  );
}
