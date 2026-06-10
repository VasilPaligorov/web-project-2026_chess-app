type AsyncHandler<T extends unknown[]> = (...args: T) => Promise<void>;

export function safeHandler<T extends unknown[]>(handler: AsyncHandler<T>): (...args: T) => void {
  return (...args) => {
    handler(...args).catch((err) => {
      console.error('Socket handler error:', err);
    });
  };
}
