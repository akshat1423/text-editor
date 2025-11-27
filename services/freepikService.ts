import { ImageGenerationConfig, MysticAspectRatio } from "../types";

const FREEPIK_API_KEY = import.meta.env.VITE_FREEPIK_API_KEY || "";
const MYSTIC_BASE_URL = "https://api.freepik.com/v1/ai/mystic";
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 24;

type MysticStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED" | "ERROR" | "REJECTED" | "EXPIRED";

interface MysticTaskData {
  generated: string[];
  task_id: string;
  status: MysticStatus;
  has_nsfw?: boolean[];
}

interface MysticTaskResponse {
  data?: MysticTaskData;
  error?: { message?: string };
}

const ensureFreepikKey = () => {
  if (!FREEPIK_API_KEY) {
    throw new Error("Freepik API key is missing. Add VITE_FREEPIK_API_KEY to your environment.");
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "x-freepik-api-key": FREEPIK_API_KEY,
};

const requestMysticTask = async (prompt: string, aspectRatio: MysticAspectRatio): Promise<string> => {
  ensureFreepikKey();
  const response = await fetch(MYSTIC_BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to start Mystic task (${response.status}): ${detail}`);
  }

  const json = (await response.json()) as MysticTaskResponse;
  const taskId = json?.data?.task_id;
  if (!taskId) {
    throw new Error("Mystic API did not return a task id.");
  }
  return taskId;
};

const fetchMysticStatus = async (taskId: string): Promise<MysticTaskData> => {
  ensureFreepikKey();
  const response = await fetch(`${MYSTIC_BASE_URL}/${taskId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-freepik-api-key": FREEPIK_API_KEY,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Mystic status request failed (${response.status}): ${detail}`);
  }

  const json = (await response.json()) as MysticTaskResponse;
  if (!json?.data) {
    throw new Error("Mystic API returned an empty status payload.");
  }
  return json.data;
};

const summarizeStatusError = (data: MysticTaskData): string => {
  const nsfwFlag = data.has_nsfw?.some(Boolean) ? " Content flagged as NSFW." : "";
  return `Mystic request ended with status ${data.status}.${nsfwFlag}`;
};

export const generateMysticImage = async (
  prompt: string,
  config?: ImageGenerationConfig
): Promise<{ imageUrl: string; taskId: string }> => {
  const aspectRatio: MysticAspectRatio = config?.aspectRatio || "widescreen_16_9";
  const taskId = await requestMysticTask(prompt, aspectRatio);

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    const status = await fetchMysticStatus(taskId);

    if (status.status === "COMPLETED") {
      const imageUrl = status.generated?.[0];
      if (!imageUrl) {
        throw new Error("Mystic marked task complete but no image URL was returned.");
      }
      return { imageUrl, taskId };
    }

    if (["FAILED", "ERROR", "REJECTED", "EXPIRED"].includes(status.status)) {
      throw new Error(summarizeStatusError(status));
    }
  }

  throw new Error("Mystic image generation timed out. Please try again.");
};

export const generateMysticImageFromContext = async (
  context: string,
  config?: ImageGenerationConfig
): Promise<{ imageUrl: string; taskId: string }> => {
  const trimmed = context.trim();
  if (!trimmed) {
    throw new Error("Please provide some text before generating an image.");
  }

  const prompt = `Create a polished editorial-style illustration inspired by the following passage. Prioritize mood, tone, setting, and notable objects. Avoid literal typography.\n\n${trimmed}`;
  return generateMysticImage(prompt, config);
};
