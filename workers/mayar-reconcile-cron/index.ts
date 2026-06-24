interface Env {
  RECONCILE_URL: string;
  MAYAR_WEBHOOK_TOKEN: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const response = await fetch(env.RECONCILE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.MAYAR_WEBHOOK_TOKEN}` },
      });
      const body = await response.json();
      if (!response.ok) {
        console.error("Mayar reconcile cron failed:", response.status, body);
        return;
      }
      console.log("Mayar reconcile cron ran:", body);
    } catch (err) {
      console.error("Mayar reconcile cron error:", err);
    }
  },
};
