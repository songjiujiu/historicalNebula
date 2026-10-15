/** Production uses the read API; the explicit demo build carries static JSON. */
export const corpusApiUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${import.meta.env.MODE === 'demo' ? 'data/' : 'api/v1/data/'}${path}`;
