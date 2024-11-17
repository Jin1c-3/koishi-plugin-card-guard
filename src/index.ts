import { Context, Schema, h } from "koishi";
import {} from "koishi-plugin-adapter-onebot";

export const name = "card-guard";

export interface Config {
  chance: number;
  no_title: boolean;
  regex_str: string;
}

export const Config: Schema<Config> = Schema.object({
  chance: Schema.number()
    .role("slider")
    .min(0)
    .max(1)
    .step(0.05)
    .default(0.35)
    .description("检查群名片的概率"),
  no_title: Schema.boolean()
    .default(true)
    .description("是否不检查带头衔的群友"),
  regex_str: Schema.string()
    .required()
    .description("群名片的正则表达式，错误的表达式会导致插件不断报错"),
});

export function apply(ctx: Context, { chance, no_title, regex_str }: Config) {
  ctx.i18n.define("zh-CN", require("./locales/zh_CN"));
  const logger = ctx.logger("card-guard");
  ctx = ctx.platform("onebot").guild();
  ctx.on("message", async (session) => {
    // never respond to messages from self
    if (ctx.bots[session.uid]) return;
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
    if ((title && no_title) || role !== "member") return;
    if (regex.test(card)) return;
    return session.send(
      session.text("commands.card-guard.messages.alert", [
        session.userId,
        card,
        regex_str,
      ])
    );
  });
}
