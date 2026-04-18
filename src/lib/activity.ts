import { generateClient } from 'aws-amplify/data';

const _client = generateClient();

/** Fire-and-forget activity event logger. Never throws. */
export function logActivity(
  type: string,
  title: string,
  opts?: { description?: string; entityType?: string; entityId?: string }
) {
  (_client as any).models.ActivityEvent.create({ type, title, ...opts }).catch(() => {});
}
