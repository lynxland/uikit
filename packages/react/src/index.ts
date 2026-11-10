/**
 * @lynxland/uikit-react
 *
 * v3 L4 bindings: data (collection/record/lookup), command, stream, scope.
 * Router/URL bindings live under `@lynxland/uikit-react/router` only.
 */

export type {
  CollectionHandle,
  CollectionStatus,
  EmptyReason,
  LookupHandle,
  LookupStatus,
  RecordHandle,
  RecordStatus,
} from "./bindings";
export { useCollection, useLookup, useRecord } from "./bindings";

export {
  applyEffects,
  type CommandEntity,
  type CommandFormApi,
  type CommandFormField,
  type CommandFormHandle,
  type CommandHandle,
  type CommandOptions,
  type FormSpec,
  type InvalidateAfterCommandOptions,
  invalidateAfterCommand,
  useCommand,
  useCommandForm,
} from "./command";

export {
  type FrameStream,
  type UseInvalidateOnFrameOptions,
  useInvalidateOnFrame,
} from "./invalidate";

export {
  type CollectionQueryConfig,
  type CollectionQueryOptions,
  collectionQueryOptions,
  type LookupQueryConfig,
  type LookupQueryOptions,
  lookupQueryOptions,
  type QueryEngineOptions,
  type RecordQueryConfig,
  type RecordQueryOptions,
  recordQueryOptions,
} from "./options";

export {
  type CanHandle,
  type IdentityLike,
  type PermissionState,
  permissionState,
  useCan,
} from "./permissions";

export {
  decodePreference,
  type PreferenceCodec,
  usePreference,
} from "./preferences";

export {
  missingScopeKeys,
  resolveScope,
  ScopeProvider,
  type ScopeProviderProps,
  scopeReady,
  useScope,
} from "./scope";

export {
  type StreamBinding,
  type UseStreamOptions,
  useStream,
} from "./subscription";
