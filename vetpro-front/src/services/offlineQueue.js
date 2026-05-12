const QUEUE_KEY = "vetpro_offline_queue";

function loadQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue || []));
}

export const addToQueue = (item) => {
  const queue = loadQueue();
  const safeItem = {
    ...item,
    queueId:
      item?.queueId ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    queuedAt: item?.queuedAt || new Date().toISOString(),
    attempts: Number(item?.attempts || 0),
  };
  queue.push(safeItem);
  persistQueue(queue);
  return safeItem;
};

export const getQueue = () => {
  return loadQueue();
};

export const replaceQueue = (items) => {
  persistQueue(Array.isArray(items) ? items : []);
};

export const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};
