const QUEUE_KEY = "vetpro_offline_queue";

export const addToQueue = (item) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = () => {
  return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
};

export const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};
