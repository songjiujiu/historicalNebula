/** Same-origin read API. Source documents are no longer copied into the web build. */
export const corpusApiUrl = (path: string) => `${import.meta.env.BASE_URL}api/v1/data/${path}`;
