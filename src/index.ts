import { Context, Schema, h } from "koishi";
import {} from "koishi-plugin-adapter-onebot";

export const name = "card-guard";

export interface Config {
  chance: number;
  regex_str: string;
  prompt: string;
}

export const Config: Schema<Config> = Schema.object({
  chance: Schema.number().role("slider").min(0).max(1).step(0.05).default(0.35),
  regex_str: Schema.string().required(),
  prompt: Schema.string()
    .role("textarea")
    .default(
      "不合规范，请更改为：\n【本科入学年份-本科学校-保研学校（可以不填）-昵称】"
    ),
});

export function apply(ctx: Context, { chance, regex_str, prompt }: Config) {
  const logger = ctx.logger("card-guard");
  ctx = ctx.guild();
  ctx.on("message", async (session) => {
    let regex: RegExp;
    try {
      regex = new RegExp(regex_str);
    } catch (e) {
      logger.error("Invalid regex: " + regex_str);
      return;
    }
    if (Math.random() > chance) return;
    const member_info = await session.onebot.getGroupMemberInfo(
      session.channelId,
      session.userId,
      true
    );
    const title = member_info.title;
    const card = member_info.card;
    const role = member_info.role;
    if (title || role !== "member") return;
    if (regex.test(card)) return;
    return session.send([
      h("at", { id: session.userId }),
      ` 的群名片为【${card}】\n${prompt}`,
    ]);
  });
}
