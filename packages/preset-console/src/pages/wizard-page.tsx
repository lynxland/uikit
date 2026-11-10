import {
  PageLayout,
  type PageLayoutProps,
  Stepper,
  type StepperStep,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { type ReactNode, useState } from "react";

/**
 * Wizard page (design.md §6.4): `PageLayout + Stepper + step slots`.
 *
 * Steps are render slots, so a step can hold a `FormView`, a stream wait state
 * or plain content. `current`/`onCurrentChange` make the step index controlled;
 * omitting them keeps local state. The page owns only navigation, never the
 * form engines inside steps.
 */
export interface WizardStepContext {
  readonly index: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  back(): void;
  next(): void;
  goTo(index: number): void;
}

export interface WizardStep {
  key: string;
  label: ReactNode;
  description?: ReactNode;
  render?(context: WizardStepContext): ReactNode;
}

export interface WizardPageProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  steps: readonly WizardStep[];
  /** Controlled step index. */
  current?: number;
  defaultCurrent?: number;
  onCurrentChange?: (index: number) => void;
  /** Replaces the built-in Back/Next footer. */
  footer?: (context: WizardStepContext) => ReactNode;
  width?: PageLayoutProps["width"];
  breadcrumb?: ReactNode;
  className?: string;
}

function clampStep(index: number, count: number): number {
  if (count === 0) return 0;
  return Math.min(Math.max(0, index), count - 1);
}

export function WizardPage({
  title,
  description,
  actions,
  steps,
  current,
  defaultCurrent = 0,
  onCurrentChange,
  footer,
  width,
  breadcrumb,
  className,
}: WizardPageProps) {
  const ui = useUiAdapter();
  const [localCurrent, setLocalCurrent] = useState(defaultCurrent);
  const active = clampStep(current ?? localCurrent, steps.length);

  const goTo = (index: number): void => {
    const next = clampStep(index, steps.length);
    if (current === undefined) setLocalCurrent(next);
    onCurrentChange?.(next);
  };

  const context: WizardStepContext = {
    index: active,
    isFirst: active === 0,
    isLast: steps.length === 0 || active === steps.length - 1,
    back: () => goTo(active - 1),
    next: () => goTo(active + 1),
    goTo,
  };

  const stepperSteps: readonly StepperStep[] = steps.map((step) => ({
    key: step.key,
    label: step.label,
    ...(step.description !== undefined ? { description: step.description } : {}),
  }));

  const step = steps[active];
  const footerNode =
    footer?.(context) ??
    (steps.length > 0 ? (
      <div className="ui-wizard-page__footer">
        <ui.Button
          type="button"
          variant="outline"
          disabled={context.isFirst}
          onClick={context.back}
        >
          Back
        </ui.Button>
        <ui.Button type="button" disabled={context.isLast} onClick={context.next}>
          Next
        </ui.Button>
      </div>
    ) : null);

  return (
    <PageLayout
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
      width={width ?? "wide"}
      {...(breadcrumb !== undefined ? { breadcrumb } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      <Stepper steps={stepperSteps} current={active} onChange={goTo}>
        {step?.render?.(context)}
      </Stepper>
      {footerNode}
    </PageLayout>
  );
}
