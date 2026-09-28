// 自动"她在"：官方客户端没有钩子，他在窗口里又常常忘了调 xinchao_event。
// 开了 XINCHAO_AUTO_PRESENCE 之后，他调任何工具都视为"她正在跟我说话"，
// 每 N 分钟最多替他记一次陪伴（companionship）。他自己刚记过 xinchao_event 就不重复记。
// 默认关：ChatGPT Agent 这类会在她不在时自己跑的客户端，开了会误判成她在。

export function autoPresenceConfig(env = process.env) {
  const raw = String(env.XINCHAO_AUTO_PRESENCE ?? '').trim().toLowerCase();
  const minutes = Number(env.XINCHAO_AUTO_PRESENCE_MINUTES ?? 30);
  return {
    enabled: ['1', 'true', 'yes', 'on'].includes(raw),
    minutes: Number.isFinite(minutes) ? Math.max(5, Math.min(240, minutes)) : 30,
  };
}

export class AutoPresence {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.minutes = Number(options.minutes) || 30;
    this.lastAt = 0; // 上次自动记或他自己记 xinchao_event 的时间
  }

  // 这笔没生效（例如当天上限已满）时调用：不占用窗口，下一次调用工具就再试。
  release() { this.lastAt = 0; }

  // 返回 null = 这次不记；否则返回要交给 recordConversationEvent 的事件。
  decide(toolName, sessionId, now = new Date()) {
    if (!this.enabled) return null;
    const name = String(toolName ?? '');
    const nowMs = now.getTime();
    if (!name) return null;
    if (name === 'xinchao_event') { this.lastAt = nowMs; return null; }
    if (nowMs - this.lastAt < this.minutes * 60_000) return null;
    this.lastAt = nowMs;
    // 每次决定记一笔都用全新的 event_id。之前按 30 分钟分桶，被上限挡下的那笔会占住整个桶，
    // 同一桶里的下一次就被当成重复事件丢掉。去重交给上面的时间窗，不靠 event_id。
    this.seq = (this.seq ?? 0) + 1;
    return {
      eventId: `auto-presence-${nowMs}-${this.seq}`,
      sessionId: sessionId || undefined,
      interactionType: 'companionship',
    };
  }
}
