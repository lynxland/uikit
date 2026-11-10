/**
 * CSS side-effect imports are processed by the consumer's bundler (Vite,
 * Rolldown, webpack, …); TypeScript only needs the ambient module shape.
 */
declare module "*.css";
