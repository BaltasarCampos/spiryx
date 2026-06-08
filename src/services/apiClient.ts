import { InvalidPayloadError, NetworkError, RateLimitError } from "./errors";

export interface RequestJsonOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | null;
  query?: Record<string, string | number | boolean | null | undefined>;
}

function buildUrl(input: string | URL, query?: RequestJsonOptions["query"]): string {
  const url = new URL(input.toString());

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function requestJson<T>(input: string | URL, options: RequestJsonOptions = {}): Promise<T> {
  const { headers, query, ...requestInit } = options;
  const url = buildUrl(input, query);

  let response: Response;

  try {
    response = await fetch(url, {
      ...requestInit,
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
  } catch (error) {
    throw new NetworkError(`Request failed for ${url}`, { cause: error });
  }

  if (response.status === 429) {
    throw new RateLimitError(`Rate limit reached for ${url}`);
  }

  if (!response.ok) {
    throw new NetworkError(`Request failed with status ${response.status} for ${url}`, {
      status: response.status,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new InvalidPayloadError(`Response body was not valid JSON for ${url}`, { cause: error });
  }
}
