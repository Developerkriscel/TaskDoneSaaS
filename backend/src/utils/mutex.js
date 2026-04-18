const lockMap = new Map();

export async function withLock(key, fn) {
  const current = lockMap.get(key) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });

  lockMap.set(key, current.then(() => next));
  await current;

  try {
    return await fn();
  } finally {
    release();
    if (lockMap.get(key) === next) {
      lockMap.delete(key);
    }
  }
}
