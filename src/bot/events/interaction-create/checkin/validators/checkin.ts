import type { GrindRole } from '@config/discord'
import type { Prisma, PrismaClient } from '@generatedDB/client'
import type { CheckinAllowedEmojiType, CheckinColumn, CheckinStatusType, Checkin as CheckinType } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { User } from '@type/user'
import type { Attachment, EmbedBuilder, Guild, GuildMember, Interaction, Message } from 'discord.js'
import crypto from 'node:crypto'
import { CheckinError } from '@commands/checkin/handlers/checkin'
import { AURA_FARMING_CHANNEL, CHECKIN_CHANNEL, GRINDER_ROLE } from '@config/discord'
import { SubmittedCheckinError } from '@events/message-reaction-add/checkin/handlers/submitted-checkin'
import { createEmbed, decodeSnowflakes, encodeSnowflake, getCustomId } from '@utils/component'
import { isDateToday, isDateYesterday } from '@utils/date'
import { DiscordAssert, getChannel, sendAsBot } from '@utils/discord'
import { attachNewGrindRole, getGrindRoleByStreakCount } from '@utils/discord/roles'
import { DUMMY } from '@utils/placeholder'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js'
import { CHECKIN_APPROVE_BUTTON_ID } from '../handlers/checkin-approve-button'
import { CHECKIN_CUSTOM_BUTTON_ID } from '../handlers/checkin-custom-button'
import { CheckinCustomButtonModalError } from '../handlers/checkin-custom-button-modal'
import { CheckinModalError } from '../handlers/checkin-modal'
import { CHECKIN_REJECT_BUTTON_ID } from '../handlers/checkin-reject-button'
import { CheckinMessage } from '../messages/checkin'

export class Checkin extends CheckinMessage {
    static override BASE_PERMS = [
        ...DiscordAssert.BASE_PERMS,
        PermissionsBitField.Flags.UseApplicationCommands,
    ]

    static override ATTACHMENT_COUNT: number = 1

    static PUBLIC_ID_PREFIX = 'CHK-'

    static EMOJI_STATUS: Record<CheckinAllowedEmojiType, CheckinStatusType> = {
        '❌': 'REJECTED',
        '🔥': 'APPROVED',
    }

    static REVERSED_EMOJI_STATUS = Object.fromEntries(
        Object.entries(this.EMOJI_STATUS).map(([emoji, status]) => [status, emoji]),
    ) as Record<CheckinStatusType, CheckinAllowedEmojiType>

    static getModalId(interaction: Interaction, customId: string) {
        const [prefix, guildId, tempToken] = decodeSnowflakes(customId)

        if (!guildId)
            throw new CheckinModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinModalError(this.ERR.NotGuild)

        return { prefix, guildId, tempToken }
    }

    static getModalReviewId(interaction: Interaction, customId: string) {
        const [prefix, guildId, checkinId, messageId] = decodeSnowflakes(customId)
        const checkinIdNum = Number(checkinId)

        if (!guildId)
            throw new CheckinCustomButtonModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinCustomButtonModalError(this.ERR.NotGuild)
        if (!checkinId)
            throw new CheckinCustomButtonModalError(this.ERR.CheckinIdMissing)
        if (!messageId)
            throw new CheckinCustomButtonModalError(this.ERR.MessageIdMissing)

        return { prefix, guildId, checkinId: checkinIdNum, messageId }
    }

    static getButtonId(interaction: Interaction, customId: string) {
        const [prefix, guildId, checkinId] = decodeSnowflakes(customId)
        const checkinIdNum = Number(checkinId)

        if (!guildId)
            throw new CheckinError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinError(this.ERR.NotGuild)
        if (!checkinId)
            throw new CheckinError(this.ERR.CheckinIdMissing)
        if (Number.isNaN(checkinIdNum))
            throw new CheckinError(this.ERR.CheckinIdInvalid)

        return { prefix, guildId, checkinId: checkinIdNum }
    }

    static generatePublicId(): string {
        const random = crypto.randomBytes(3).toString('hex').toUpperCase()
        return `${this.PUBLIC_ID_PREFIX}${random}`
    }

    static async getPublicId(tx: Prisma.TransactionClient): Promise<string> {
        while (true) {
            const id = this.generatePublicId()
            const exists = await tx.checkin.findUnique({ where: { public_id: id } })

            if (!exists)
                return id
        }
    }

    static generateButtons(guildId: string, checkinId: string): ActionRowBuilder<ButtonBuilder> {
        const approveButtonId = getCustomId([CHECKIN_APPROVE_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId)])
        const approveButton = new ButtonBuilder()
            .setCustomId(approveButtonId)
            .setLabel('🔥 Approve')
            .setStyle(ButtonStyle.Success)

        const rejectButtonId = getCustomId([CHECKIN_REJECT_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId)])
        const rejectButton = new ButtonBuilder()
            .setCustomId(rejectButtonId)
            .setLabel('🙅 Reject')
            .setStyle(ButtonStyle.Danger)

        const customButtonId = getCustomId([CHECKIN_CUSTOM_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId)])
        const customButton = new ButtonBuilder()
            .setCustomId(customButtonId)
            .setLabel('⚙️ Review')
            .setStyle(ButtonStyle.Primary)

        return new ActionRowBuilder<ButtonBuilder>().addComponents(approveButton, rejectButton, customButton)
    }

    static getNewGrindRole(guild: Guild, streakCount: number) {
        return getGrindRoleByStreakCount(guild.roles, streakCount)
    }

    static async setMemberNewGrindRole(
        guild: Guild,
        member: GuildMember,
        newRole?: GrindRole,
    ) {
        if (!newRole)
            return

        const alreadyHasRole = member.roles.cache.has(newRole.id)
        const channel = await getChannel(guild, AURA_FARMING_CHANNEL)
        this.assertChannel(channel)

        if (!alreadyHasRole) {
            await attachNewGrindRole(member, newRole)
            await sendAsBot(null, channel, {
                content: `**Congratulations, <@${member.id}>** ${this.MSG.ReachNewGrindRole(newRole)}`,
                allowedMentions: { users: [member.id], roles: [] },
            })
        }
        else {
            const checkinChannel = await getChannel(guild, CHECKIN_CHANNEL)
            await sendAsBot(null, checkinChannel, {
                content: `Hey, <@${member.id}>. You already have <@&${newRole.id}>`,
                allowedMentions: { users: [member.id], roles: [] },
            }, true)
        }
    }

    static assertCheckinToday(user: User) {
        const latestStreak = user.checkin_streaks?.[0]
        const latestCheckin = user.checkins?.[0]

        const hasCheckedInToday = this.hasCheckinToday(latestStreak, latestCheckin)
        const checkinIsNonRejected = this.isNotRejectedCheckin(latestCheckin)

        if (hasCheckedInToday && checkinIsNonRejected)
            throw new CheckinModalError(this.ERR.AlreadyCheckinToday(latestCheckin!.link!))
    }

    static assertSubmittedCheckinToday(checkin: CheckinType) {
        const isCheckinToday = this.hasCheckinToday(checkin.checkin_streak, checkin)
        if (!isCheckinToday)
            throw new SubmittedCheckinError(this.ERR.SubmittedCheckinNotToday(checkin.link!))
    }

    static assertMemberGrindRoles(member: GuildMember) {
        const hasGrinderRole = this.isMemberHasRole(member, GRINDER_ROLE)

        if (!hasGrinderRole)
            throw new CheckinModalError(this.ERR.RoleMissing(GRINDER_ROLE))
    }

    static assertEmojis(emoji: string | null | undefined) {
        if (!emoji || !(emoji in this.EMOJI_STATUS)) {
            throw new SubmittedCheckinError(this.ERR.UnexpectedEmoji)
        }

        return emoji as CheckinAllowedEmojiType
    }

    static async getOrCreateUser(prisma: PrismaClient, discordUserId: string): Promise<User> {
        const select = {
            id: true,
            discord_id: true,
            created_at: true,
            updated_at: true,
            checkin_streaks: {
                take: 1,
                orderBy: { first_date: 'desc' },
                include: { checkins: true },
            },
            checkins: {
                orderBy: { created_at: 'desc' },
                take: 2,
            },
        } satisfies Prisma.UserSelect

        return prisma.user.upsert({
            where: { discord_id: discordUserId },
            create: { discord_id: discordUserId },
            update: {},
            select,
        })
    }

    static async getWaitingCheckin<T extends keyof Prisma.CheckinWhereInput>(
        prisma: PrismaClient,
        key: T,
        value: Prisma.CheckinWhereInput[T],
    ) {
        const checkin = await prisma.checkin.findFirst({
            where: {
                [key]: value,
                status: 'WAITING',
                reviewed_by: null,
            },
            include: { user: true, checkin_streak: true },
        }) as CheckinType

        if (!checkin)
            throw new SubmittedCheckinError(this.ERR.PlainMessage)

        return checkin
    }

    static determineStreak(lastStreak: CheckinStreak | undefined) {
        if (!lastStreak)
            return 'new'

        if (!lastStreak.last_date)
            return 'new'

        if (lastStreak.checkins?.[0]?.status === 'WAITING')
            return 'new'

        return this.isStreakContinuing(lastStreak.last_date) ? 'next' : 'new'
    }

    static isStreakContinuing(date: Date): boolean {
        return isDateToday(date) || isDateYesterday(date)
    }

    static isNotRejectedCheckin(checkin: CheckinType | undefined) {
        return checkin?.status && checkin.status !== 'REJECTED'
    }

    static hasCheckinToday(checkinStreak: CheckinStreak | undefined, checkin: CheckinType | undefined) {
        const streakWasToday = checkinStreak?.last_date
            ? isDateToday(checkinStreak.last_date)
            : false
        const checkinWasToday = checkin?.created_at
            ? isDateToday(checkin.created_at)
            : false

        return streakWasToday || checkinWasToday
    }

    static async upsertStreak(
        tx: Prisma.TransactionClient,
        userId: number,
        lastStreak: CheckinStreak | undefined,
        decision: 'new' | 'next',
    ): Promise<CheckinStreak> {
        if (decision === 'new') {
            return await tx.checkinStreak.create({
                data: {
                    user: {
                        connect: {
                            id: userId,
                        },
                    },
                },
            })
        }
        else {
            return await tx.checkinStreak.update({
                where: { id: lastStreak!.id },
                data: { last_date: new Date() },
            })
        }
    }

    static async createCheckin(
        tx: Prisma.TransactionClient,
        userId: number,
        streak: CheckinStreak,
        description: string,
    ): Promise<CheckinType> {
        return await tx.checkin.create({
            data: {
                public_id: await this.getPublicId(tx),
                user_id: userId,
                checkin_streak_id: streak.id,
                description,
                status: 'WAITING',
            },
        })
    }

    static async getPrevCheckin(
        tx: Prisma.TransactionClient,
        userId: number,
        streak: CheckinStreak,
        checkin: CheckinType,
    ): Promise<CheckinType> {
        return await tx.checkin.findFirst({
            where: {
                user_id: userId,
                checkin_streak_id: streak.id,
                id: { not: checkin.id },
            },
            orderBy: { created_at: 'desc' },
        }) as CheckinType
    }

    static async createAttachments(
        tx: Prisma.TransactionClient,
        checkin: CheckinType,
        attachments?: Attachment[],
    ) {
        if (attachments?.length) {
            return await tx.attachment.createMany({
                data: attachments.map(a => ({
                    name: a.name,
                    url: a.url,
                    type: a.contentType ?? '',
                    size: a.size,
                    module_id: checkin.id,
                    module_type: 'CHECKIN',
                })),
            })
        }
    }

    static async validateCheckinStreak(
        prisma: PrismaClient,
        userId: number,
        lastCheckinStreak: CheckinStreak | undefined,
        description: string,
        attachments?: Attachment[] | undefined,
    ) {
        const decision = this.determineStreak(lastCheckinStreak)

        return prisma.$transaction(async (tx) => {
            const checkinStreak = await this.upsertStreak(tx, userId, lastCheckinStreak, decision)
            const checkin = await this.createCheckin(tx, userId, checkinStreak, description)
            const prevCheckin = await this.getPrevCheckin(tx, userId, checkinStreak, checkin)

            await this.createAttachments(tx, checkin, attachments)

            return {
                checkinStreak,
                checkin,
                prevCheckin,
            }
        })
    }

    static async validateCheckin<K extends keyof Prisma.CheckinWhereInput>(
        prisma: PrismaClient,
        guild: Guild,
        flamewarden: GuildMember,
        opt: CheckinColumn<K>,
        message: Message,
        checkinStatus: CheckinStatusType,
        comment?: string | null,
    ) {
        const checkin = await this.getWaitingCheckin(prisma, opt.key, opt.value)
        this.assertSubmittedCheckinToday(checkin)
        const updatedCheckin = await this.updateCheckinStatus(prisma, flamewarden, checkin, checkinStatus, comment) as CheckinType

        const member = await guild.members.fetch(checkin.user!.discord_id)
        this.assertMember(member)
        const newGrindRole = this.getNewGrindRole(guild, updatedCheckin.checkin_streak!.streak)
        await this.setMemberNewGrindRole(guild, member, newGrindRole)

        await this.sendCheckinStatusToMember(flamewarden, member, updatedCheckin)
        await this.updateSubmittedCheckin(message, updatedCheckin.checkin_streak!.streak)
        await message.react(this.REVERSED_EMOJI_STATUS[checkinStatus])
    }

    static async updateCheckinMsgLink(prisma: PrismaClient, checkin: CheckinType, msgLink: string | null): Promise<CheckinType> {
        return prisma.checkin.update({
            where: { id: checkin.id },
            data: { link: msgLink },
        })
    }

    static async sendSuccessCheckinToMember(member: GuildMember, checkin: CheckinType) {
        const embed = createEmbed(
            `🎉 Check-in Berhasil`,
            this.MSG.CheckinSuccessToMember(checkin),
            DUMMY.COLOR,
            { text: DUMMY.FOOTER },
        )

        await member.send({ embeds: [embed] })
    }

    static async updateCheckinStatus(prisma: PrismaClient, member: GuildMember, checkin: CheckinType, checkinStatus: CheckinStatusType, comment?: string | null): Promise<CheckinType> {
        const updatedCheckin = await prisma.checkin.update({
            where: { id: checkin.id },
            data: {
                status: checkinStatus,
                reviewed_by: member.id,
                comment,
                updated_at: new Date(),
                checkin_streak: {
                    update: {
                        streak: {
                            increment: checkinStatus === 'APPROVED' ? 1 : 0,
                        },
                        last_date: new Date(),
                        updated_at: new Date(),
                    },
                },
            },
            include: {
                checkin_streak: true,
            },
        })

        return updatedCheckin
    }

    static async sendCheckinStatusToMember(flamewarden: GuildMember, member: GuildMember, checkin: CheckinType) {
        let embed: EmbedBuilder

        switch (checkin.status) {
            case 'REJECTED':
                embed = createEmbed(
                    `⚠️ Check-In Ditolak`,
                    this.MSG.CheckinRejected(flamewarden, checkin),
                    '#D9534F',
                    { text: DUMMY.FOOTER },
                )
                break

            case 'APPROVED':
                embed = createEmbed(
                    `🔥 Check-In Disetujui`,
                    this.MSG.CheckinApproved(flamewarden, checkin),
                    '#4CAF50',
                    { text: DUMMY.FOOTER },
                )
                break

            default:
                throw new SubmittedCheckinError(this.ERR.UnknownCheckinStatus)
        }

        await member.send({ embeds: [embed] })
    }

    static async updateSubmittedCheckin(message: Message, newStreak: number) {
        await message.edit(
            message.content.replace(
                /🔥\s*\*\*Current Streak:\*\*\s*\d+\s*day\(s\)/i,
                `🔥 **Current Streak:** ${newStreak} day(s)`,
            ),
        )
    }
}
