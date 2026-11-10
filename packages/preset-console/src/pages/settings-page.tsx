import type { PreferenceCodec } from "@lynxland/uikit-react";
import { usePreference } from "@lynxland/uikit-react";
import { PageLayout, type PageLayoutProps, SectionCard } from "@lynxland/uikit-surfaces";
import type { ReactNode } from "react";

/**
 * Settings page (design.md §6.4): `PageLayout + SectionCard × n`.
 *
 * Preference controls are ordinary controlled nodes. Use `PreferenceItem` to
 * bind one item to `usePreference`; keeping the hook in a component (instead of
 * a loop in the page) keeps the hook count stable when sections change.
 */
export interface SettingsItem {
  key: string;
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
}

export interface SettingsSection {
  key: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Label/control rows; ignored when `content` is provided. */
  items?: readonly SettingsItem[];
  /**
   * Free-form section body for grids, danger zones, invitations or provider
   * rows. When present it replaces the label/control list.
   */
  content?: ReactNode;
}

export interface SettingsPageProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  sections: readonly SettingsSection[];
  width?: PageLayoutProps["width"];
  breadcrumb?: ReactNode;
  className?: string;
}

export interface PreferenceItemState<T> {
  value: T;
  setValue: (next: T | ((prev: T) => T)) => void;
}

export interface PreferenceItemProps<T> {
  /** localStorage key. */
  storageKey: string;
  fallback: T;
  codec?: PreferenceCodec<T>;
  children: (state: PreferenceItemState<T>) => ReactNode;
}

/** Controlled preference slot backed by `usePreference`. */
export function PreferenceItem<T>({
  storageKey,
  fallback,
  codec,
  children,
}: PreferenceItemProps<T>) {
  const [value, setValue] = usePreference(storageKey, fallback, codec);
  return <>{children({ value, setValue })}</>;
}

export function SettingsPage({
  title,
  description,
  actions,
  sections,
  width,
  breadcrumb,
  className,
}: SettingsPageProps) {
  return (
    <PageLayout
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
      width={width ?? "narrow"}
      {...(breadcrumb !== undefined ? { breadcrumb } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      <div className="ui-settings-page">
        {sections.map((section) => (
          <SectionCard
            key={section.key}
            {...(section.title !== undefined ? { title: section.title } : {})}
            {...(section.description !== undefined ? { description: section.description } : {})}
            {...(section.actions !== undefined ? { actions: section.actions } : {})}
          >
            {section.content !== undefined ? (
              section.content
            ) : (
              <ul className="ui-settings-page__items">
                {(section.items ?? []).map((item) => (
                  <li key={item.key} className="ui-settings-page__item" data-setting={item.key}>
                    <div className="ui-settings-page__text">
                      <span className="ui-settings-page__label">{item.label}</span>
                      {item.description !== undefined ? (
                        <span className="ui-settings-page__description">{item.description}</span>
                      ) : null}
                    </div>
                    <div className="ui-settings-page__control">{item.control}</div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        ))}
      </div>
    </PageLayout>
  );
}
