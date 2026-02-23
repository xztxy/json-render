// Minimal process.env typing so dev-only warnings compile without a bundler define plugin.
declare const process: { readonly env: { readonly NODE_ENV?: string } };
