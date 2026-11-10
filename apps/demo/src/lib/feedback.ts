import { toast } from "@lynxland/uikit-surfaces";

/**
 * Typed demo feedback helpers. Keep honest wording here so the toast text is
 * stable for Playwright assertions and so pages never invent success states.
 */
export const notify = {
  saved(message: string): string {
    return toast.success(message);
  },
  info(message: string): string {
    return toast.info(message);
  },
  error(message: string): string {
    return toast.error(message);
  },
  placeholder(action: string): string {
    return toast.info(`${action} is a demo placeholder.`);
  },
  savedLocally(what: string): string {
    return toast.success(`${what} saved locally — no command was issued.`);
  },
};
