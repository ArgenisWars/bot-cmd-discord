// bot.js
// Bot Floripa SC – integração Discord -> RCON (FiveM)

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField
} = require("discord.js");

const Q3RCon = require("quake3-rcon");

// ======== CONFIG .ENV ========

const DISCORD_TOKEN   = process.env.DISCORD_TOKEN;
const PREFIX          = process.env.DISCORD_PREFIX || "!";
const RCON_HOST       = process.env.RCON_HOST || "127.0.0.1";
const RCON_PORT       = parseInt(process.env.RCON_PORT || "30120", 10);
const RCON_PASSWORD   = process.env.RCON_PASSWORD || "";

const ALLOWED_ROLE_IDS = (process.env.ALLOWED_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// Só pra logar e ajudar debug
console.log("RCON CONFIG:", {
  host: RCON_HOST,
  port: RCON_PORT,
  hasPassword: !!RCON_PASSWORD,
  allowedRoles: ALLOWED_ROLE_IDS
});

// ======== FUNÇÃO RCON (Quake3/FiveM) ========

function sendRcon(command) {
  return new Promise((resolve, reject) => {
    const rcon = new Q3RCon({
      address: RCON_HOST,
      port: RCON_PORT,
      password: RCON_PASSWORD
    });

    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      console.error("RCON timeout (sem resposta do servidor)");
      reject(new Error("RCON timeout (sem resposta do servidor)"));
    }, 7000); // 7s pra dar tempo de responder

    rcon.send(command, (response) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      console.log(`[RCON] ${command} -> ${response || "OK (sem retorno)"}`);
      resolve(response);
    });
  });
}

// ======== CLIENT DISCORD ========

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`✅ Bot logado como ${client.user.tag}`);
  client.user.setActivity("Floripa SC | !help", { type: 0 });
});

// ======== PERMISSÃO ========

function canUseCommands(message) {
  if (!message.guild) return false;

  // Admin do Discord SEMPRE pode
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }

  // Se tiver cargos configurados no .env
  if (ALLOWED_ROLE_IDS.length > 0) {
    const hasAllowedRole = ALLOWED_ROLE_IDS.some((roleId) =>
      message.member.roles.cache.has(roleId)
    );
    if (hasAllowedRole) return true;
    return false;
  }

  // Se não configurou nada e não é admin → bloqueia
  return false;
}

// ======== HANDLER DE COMANDOS ========

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    if (!canUseCommands(message)) {
      return message.reply("❌ Você não tem permissão para usar os comandos do bot.");
    }

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    // -------- HELP --------
    if (cmd === "help" || cmd === "ajuda") {
      const helpText = [
        `**Prefixo:** \`${PREFIX}\``,
        "",
        "**ADMIN / STAFF (via RCON)**",
        `\`${PREFIX}car <id> <modelo>\` – puxa carro para o passaporte.`,
        `\`${PREFIX}dv <id>\` – deleta veículo do jogador.`,
        `\`${PREFIX}dvall\` – remove veículos desocupados.`,
        `\`${PREFIX}addcar <id> <modelo>\` – addcarfloripa.`,
        `\`${PREFIX}addvehs <id> <modelo>\` – addvehs (garage).`,
        `\`${PREFIX}anunciar <cor> <tempo_ms> <mensagem>\` – anunciar no servidor.`,
        `\`${PREFIX}tppraca <id>\` – teleporta o passaporte para a praça.`,
        `\`${PREFIX}tpmazebank <id>\` – teleporta o passaporte para o Maze Bank.`,
        "",
        `\`${PREFIX}god <id>\` – revive/recupera o jogador (comando god).`,
        `\`${PREFIX}ban <id> <dias>\` – banir jogador.`,
        `\`${PREFIX}unban <id>\` – desbanir.`,
        `\`${PREFIX}kick <id>\` – kickar.`,
        `\`${PREFIX}gg <id>\` – forçar óbito (GG).`,
        "",
        `\`${PREFIX}group <id> <grupo> <nivel>\` – adicionar grupo.`,
        `\`${PREFIX}ungroup <id> <grupo>\` – remover grupo.`,
        "",
        `\`${PREFIX}item2 <id> <item> <quantidade>\` – item2floripa.`,
        `\`${PREFIX}clearinv <id>\` – limpar inventário.`,
        `\`${PREFIX}clearchest <nome>\` – limpar baú.`,
        "",
        "⚠️ Todos esses comandos são enviados via RCON para o servidor FiveM."
      ].join("\n");
      return message.reply(helpText);
    }

    // --------- COMANDOS ADMIN ---------


        if (cmd === "tpmazebank" || cmd === "tpmaze") {
          const id = parseInt(args[0], 10);
    
          if (!id) {
            return message.reply(`Uso correto: \`${PREFIX}tpmazebank <id>\``);
          }
    
          await sendRcon(`tpmazebank ${id}`);
    
          return message.reply(
            `🏢 Comando enviado: teleportar passaporte **${id}** para o Maze Bank.`
          );
        }
    

        if (cmd === "tppraca") {
          const id = parseInt(args[0], 10);
    
          if (!id) {
            return message.reply(`Uso correto: \`${PREFIX}tppraca <id>\``);
          }
    
          await sendRcon(`tppraca ${id}`);
    
          return message.reply(
            `📍 Comando enviado: teleportar passaporte **${id}** para a praça.`
          );
        }
    

    // !anunciar ffff 1000 MENSAGEM DE TESTE ...
    if (cmd === "anunciar") {
      const color = args[0]; // ex: "vermelho", "ffff", "police"
      const timeArg = parseInt(args[1], 10);
      const hasTime = !isNaN(timeArg);
      const tempoMs = hasTime ? timeArg : 5000; // default 5s se não passar tempo

      // se tiver tempo, msg começa do índice 2; se não, começa do 1
      const msg = args.slice(hasTime ? 2 : 1).join(" ");

      if (!color || !msg) {
        return message.reply(
          `Uso correto: \`${PREFIX}anunciar <cor> <tempo_ms opcional> <mensagem>\`\n` +
          `Exemplo: \`${PREFIX}anunciar vermelho 8000 Servidor reiniciando em 10 minutos!\``
        );
      }

      // monta comando sem aspas (o servidor junta de novo com args)
      const command = `anunciar ${color} ${tempoMs} ${msg}`;

      // log pra ver o tamanho em bytes que vai pro RCON
      console.log(
        "[DISCORD->RCON anunciar]",
        command,
        "bytes=",
        Buffer.from(command, "utf8").length
      );

      await sendRcon(command);

      return message.reply(
        `📣 Anúncio enviado para o servidor:\n` +
        `Cor: **${color}** | Tempo: **${tempoMs}ms**\n` +
        `Mensagem: **${msg}**`
      );
    }



    // !car 123 sultan
    if (cmd === "car") {
      const id = parseInt(args[0], 10);
      const model = args.slice(1).join(" ");
      if (!id || !model) {
        return message.reply(`Uso correto: \`${PREFIX}car <id> <modelo>\``);
      }
      await sendRcon(`car ${id} ${model}`);
      return message.reply(`🚗 Comando enviado: spawn do veículo **${model}** para passaporte **${id}**.`);
    }

    // !dv 123
    if (cmd === "dv") {
      const id = parseInt(args[0], 10);
      if (!id) {
        return message.reply(`Uso correto: \`${PREFIX}dv <id>\``);
      }
      await sendRcon(`dv ${id}`);
      return message.reply(`🗑️ Comando enviado: DV no passaporte **${id}**.`);
    }

    // !dvall
    if (cmd === "dvall") {
      await sendRcon("dvall");
      return message.reply("🧹 Comando enviado: limpeza de veículos desocupados (dvall).");
    }

    // !addcar 123 sultan   (server: addcarfloripa [id] [modelo])
    if (cmd === "addcar") {
      const id = parseInt(args[0], 10);
      const model = args.slice(1).join(" ");
      if (!id || !model) {
        return message.reply(`Uso correto: \`${PREFIX}addcar <id> <modelo>\``);
      }
      await sendRcon(`addcarfloripa ${id} ${model}`);
      return message.reply(`🚘 Comando enviado: addcarfloripa **${model}** para ID **${id}**.`);
    }

    // !addvehs 123 sultan  (server: addvehs [veículo] [passaporte])
    if (cmd === "addvehs") {
      const id = parseInt(args[0], 10);
      const model = args.slice(1).join(" ");
      if (!id || !model) {
        return message.reply(`Uso correto: \`${PREFIX}addvehs <id> <modelo>\``);
      }
      await sendRcon(`addvehs ${model} ${id}`);
      return message.reply(`🚘 Comando enviado: addvehs **${model}** para ID **${id}**.`);
    }

    // !god 123  -> usa o RegisterCommand("god") que você mandou
    if (cmd === "god") {
      const id = parseInt(args[0], 10);
      if (!id) {
        return message.reply(`Uso correto: \`${PREFIX}god <id>\``);
      }
      await sendRcon(`god ${id}`);
      return message.reply(`✨ Comando enviado: god no passaporte **${id}**.`);
    }

    // !ban 123 7
    if (cmd === "ban") {
      const id = parseInt(args[0], 10);
      const days = parseInt(args[1], 10);
      if (!id || !days) {
        return message.reply(`Uso correto: \`${PREFIX}ban <id> <dias>\``);
      }
      await sendRcon(`ban ${id} ${days}`);
      return message.reply(`🔨 Comando enviado: ban **${id}** por **${days}** dias.`);
    }

    // !unban 123
    if (cmd === "unban") {
      const id = parseInt(args[0], 10);
      if (!id) {
        return message.reply(`Uso correto: \`${PREFIX}unban <id>\``);
      }
      await sendRcon(`unban ${id}`);
      return message.reply(`✅ Comando enviado: unban do passaporte **${id}**.`);
    }

    // !kick 123
    if (cmd === "kick") {
      const id = parseInt(args[0], 10);
      if (!id) {
        return message.reply(`Uso correto: \`${PREFIX}kick <id>\``);
      }
      await sendRcon(`kick ${id}`);
      return message.reply(`👢 Comando enviado: kick no passaporte **${id}**.`);
    }

    // !group 123 Admin 1
    if (cmd === "group") {
      const id = parseInt(args[0], 10);
      const group = args[1];
      const level = parseInt(args[2], 10);
      if (!id || !group || !level) {
        return message.reply(`Uso correto: \`${PREFIX}group <id> <grupo> <nivel>\``);
      }
      await sendRcon(`group ${id} ${group} ${level}`);
      return message.reply(`📌 Comando enviado: group **${group} ${level}** para passaporte **${id}**.`);
    }

    // !ungroup 123 Admin
    if (cmd === "ungroup") {
      const id = parseInt(args[0], 10);
      const group = args[1];
      if (!id || !group) {
        return message.reply(`Uso correto: \`${PREFIX}ungroup <id> <grupo>\``);
      }
      await sendRcon(`ungroup ${id} ${group}`);
      return message.reply(`📌 Comando enviado: ungroup **${group}** do passaporte **${id}**.`);
    }

    // !gg 123
    if (cmd === "gg") {
      const id = parseInt(args[0], 10);
      if (!id) {
        return message.reply(`Uso correto: \`${PREFIX}gg <id>\``);
      }
      await sendRcon(`gg ${id}`);
      return message.reply(`💀 Comando enviado: GG no passaporte **${id}**.`);
    }

    // !item2 123 radio 1  (server: item2floripa [item] [qtd] [id])
    if (cmd === "item2") {
      const id = parseInt(args[0], 10);
      const item = args[1];
      const amount = parseInt(args[2], 10);
      if (!id || !item || !amount) {
        return message.reply(`Uso correto: \`${PREFIX}item2 <id> <item> <quantidade>\``);
      }
      await sendRcon(`item2floripa ${item} ${amount} ${id}`);
      return message.reply(`🎁 Comando enviado: **${amount}x ${item}** para passaporte **${id}**.`);
    }

    // !clearinv 123
    if (cmd === "clearinv") {
      const id = parseInt(args[0], 10);
      if (!id) {
        return message.reply(`Uso correto: \`${PREFIX}clearinv <id>\``);
      }
      await sendRcon(`clearinv ${id}`);
      return message.reply(`🧺 Comando enviado: clearinv no passaporte **${id}**.`);
    }

    // !clearchest hospital
    if (cmd === "clearchest") {
      const chest = args[0];
      if (!chest) {
        return message.reply(`Uso correto: \`${PREFIX}clearchest <nomeDoBau>\``);
      }
      await sendRcon(`clearchest ${chest}`);
      return message.reply(`📦 Comando enviado: clearchest **${chest}**.`);
    }

    // Se nada bateu:
    if (cmd.length > 0) {
      return message.reply("❓ Comando não reconhecido. Use `!help` para ver a lista.");
    }
  } catch (err) {
    console.error("Erro no comando:", err);
    return message.reply("❌ Ocorreu um erro ao executar o comando. Veja o console do bot.");
  }
});

// ======== LOGIN ========

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN não encontrado no .env");
  process.exit(1);
}

client.login(DISCORD_TOKEN);
