export async function safeKvGet(
  kv: KVNamespace,
  key: string,
  options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }
): Promise<string | null> {
  try {
    const res = await kv.get(key, options as any);
    return res as string | null;
  } catch (error) {
    console.warn(`[safeKv] get failed for key: ${key}`, error);
    return null;
  }
}

export async function safeKvPut(
  kv: KVNamespace,
  key: string,
  value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
  options?: KVNamespacePutOptions
): Promise<void> {
  try {
    await kv.put(key, value, options);
  } catch (error) {
    console.warn(`[safeKv] put failed for key: ${key}`, error);
    // Gracefully degrade: do not throw to caller
  }
}
