/**
 * @lynxland/uikit — one-install meta entry.
 *
 * The default opinionated path is the console preset (surfaces + ui-shadcn +
 * pages). Advanced consumers import the subpackages directly; this barrel
 * deliberately forwards only the preset plus the small set of core types a
 * page author is likely to name.
 */

export * from "@lynxland/uikit-preset-console";

export type {
  ApiError,
  CollectionPage,
  CollectionRequest,
  CollectionSearch,
  CollectionSource,
  CollectionState,
  Command,
  Effect,
  FilterValue,
  Outcome,
  Predicate,
  RecordSource,
  Scope,
  Sort,
  StreamSource,
  StreamStatus,
} from "@lynxland/uikit-core";
