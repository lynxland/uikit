/**
 * @lynxland/uikit-preset-console
 *
 * Default runnable console pages (v3). Each page is a thin composition root
 * over the official bindings, surfaces views and chrome; every layer can be
 * replaced by hand-wiring the same parts. No v2 page/panel/field APIs.
 */

export {
  columnFromField,
  columnsFromFields,
  filterFieldsFromSpec,
  filterFieldsOf,
} from "./columns";

export {
  CommandDialog,
  type CommandDialogProps,
  CommandDrawer,
  type CommandDrawerProps,
  type CommandFormHostOptions,
  ConfirmCommandDialog,
  type ConfirmCommandDialogProps,
} from "./hosts/command-host";

export {
  CollectionPage,
  type CollectionPageProps,
} from "./pages/collection-page";
export {
  type CrudCreateConfig,
  type CrudDeleteConfig,
  CrudPage,
  type CrudPageProps,
  type CrudUpdateConfig,
} from "./pages/crud-page";
export { EventsPage, type EventsPageLabels, type EventsPageProps } from "./pages/events-page";
export { FormPage, type FormPageProps } from "./pages/form-page";
export { RecordPage, type RecordPageProps } from "./pages/record-page";
export {
  PreferenceItem,
  type PreferenceItemProps,
  type PreferenceItemState,
  type SettingsItem,
  SettingsPage,
  type SettingsPageProps,
  type SettingsSection,
} from "./pages/settings-page";
export {
  WizardPage,
  type WizardPageProps,
  type WizardStep,
  type WizardStepContext,
} from "./pages/wizard-page";
export { PresetProvider, type PresetProviderProps, shadcnAdapter } from "./provider";
