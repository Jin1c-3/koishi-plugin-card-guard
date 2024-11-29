import { Context, Dict, Schema, h } from "koishi";
import {} from "koishi-plugin-adapter-onebot";

export const name = "card-guard";

export const reusable = true; // 声明此插件可重用

export const usage = `插件支持多份配置，请使用koishi原生的**过滤器**进行操作。

在 OneBot 平台下， \`频道ID\` 就是 \`群号\` ，通过设置不同群号的过滤器，可以实现在不同群中使用不同正则约束的效果

⬇️ 这就是过滤器`;

export interface Config {
  chance: number;
  no_title: boolean;
  regex_str: string;
  delete_message: DeleteMessage | Dict;
}

interface DeleteMessage {
  enable: boolean;
  delay: number;
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
  delete_message: Schema.intersect([
    Schema.object({
      enable: Schema.boolean()
        .default(false)
        .description("是否撤回bot发出的提示消息"),
    }).description("撤回提示信息设置"),
    Schema.union([
      Schema.object({
        enable: Schema.const(true).required(),
        delay: Schema.number()
          .role("slider")
          .min(5)
          .max(120)
          .step(1)
          .default(60)
          .description("多少秒后撤回提示消息"),
      }),
      Schema.object({}),
    ]),
  ]),
});

export function apply(
  ctx: Context,
  { chance, no_title, regex_str, delete_message }: Config
) {
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
    const alert_message = await session.send(
      session.text("commands.card-guard.messages.alert", [
        session.userId,
        card,
        regex_str,
      ])
    );
    if (delete_message.enable) {
      ctx.setTimeout(async () => {
        try {
          for (let am of alert_message)
            await session.bot.deleteMessage(session.channelId, am);
        } catch (e) {
          logger.warn("Failed to delete message: " + e);
        }
      }, delete_message.delay * 1000);
    }
  });
}
