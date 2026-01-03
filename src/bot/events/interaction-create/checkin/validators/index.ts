import type { GrindRole } from '@config/discord'
import type { Prisma, PrismaClient } from '@generatedDB/client'
import type { Attachment as AttachmentType } from '@type/attachment'
import type { CheckinAllowedEmojiType, CheckinColumn, CheckinStatusType, Checkin as CheckinType } from '@type/checkin'
import type { CheckinStreak } from '@type/checkin-streak'
import type { User } from '@type/user'
import type { ActionRow, Attachment, ButtonComponent, Client, EmbedBuilder, Guild, GuildMember, Interaction, Message, TextChannel } from 'discord.js'
import crypto from 'node:crypto'
import { CheckinError } from '@commands/checkin/handlers'
import { AURA_FARMING_CHANNEL, CHECKIN_CHANNEL, GRINDER_ROLE } from '@config/discord'
import { SubmittedCheckinError } from '@events/message-reaction-add/checkin/handlers/submitted'
import { createEmbed, decodeSnowflakes, encodeSnowflake, getCustomId } from '@utils/component'
import { isDateToday, isDateYesterday } from '@utils/date'
import { DiscordAssert, getChannel, getMember, sendAsBot } from '@utils/discord'
import { attachNewGrindRole, getGrindRoleByStreakCount } from '@utils/discord/roles'
import { DUMMY } from '@utils/placeholder'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, messageLink, PermissionsBitField } from 'discord.js'
import { CHECKIN_APPROVE_BUTTON_ID } from '../handlers/approve-button'
import { CHECKIN_CUSTOM_BUTTON_ID } from '../handlers/custom-button'
import { CheckinCustomButtonModalError } from '../handlers/custom-button-modal'
import { CHECKIN_DETAIL_BUTTON_ID } from '../handlers/detail-button'
import { CheckinModalError } from '../handlers/modal'
import { CHECKIN_REJECT_BUTTON_ID } from '../handlers/reject-button'
import { CheckinMessage } from '../messages'

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

    static readonly CHECKIN_DELETED_BUTTONS = [
        CHECKIN_APPROVE_BUTTON_ID,
        CHECKIN_REJECT_BUTTON_ID,
        CHECKIN_CUSTOM_BUTTON_ID,
    ]

    static REVERSED_EMOJI_STATUS = Object.fromEntries(
        Object.entries(this.EMOJI_STATUS).map(([emoji, status]) => [status, emoji]),
    ) as Record<CheckinStatusType, CheckinAllowedEmojiType>

    static getCheckinIdRegex() {
        return new RegExp(`${this.PUBLIC_ID_PREFIX}[A-Z0-9]+`, 'i')
    }

    static getModalId(interaction: Interaction, customId: string) {
        const [prefix, guildId, tempToken] = decodeSnowflakes(customId)

        if (!guildId)
            throw new CheckinModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinModalError(this.ERR.NotGuild)

        return { prefix, guildId, tempToken }
    }

    static getModalReviewId(interaction: Interaction, customId: string) {
        const [prefix, guildId, checkinId, checkinTs] = decodeSnowflakes(customId)

        if (!guildId)
            throw new CheckinCustomButtonModalError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinCustomButtonModalError(this.ERR.NotGuild)
        if (!checkinId)
            throw new CheckinCustomButtonModalError(this.ERR.CheckinIdMissing)
        if (!checkinTs)
            throw new CheckinCustomButtonModalError(this.ERR.CheckinDateMissing)

        const checkinIdNum = Number(checkinId)
        if (Number.isNaN(checkinIdNum))
            throw new CheckinError(this.ERR.CheckinIdInvalid)

        const checkinCreatedAt = new Date(Number(checkinTs))
        if (!checkinCreatedAt)
            throw new CheckinCustomButtonModalError(this.ERR.CheckinDateInvalid)

        return { prefix, guildId, checkinId: checkinIdNum, checkinCreatedAt }
    }

    static getButtonId(interaction: Interaction, customId: string) {
        const [prefix, guildId, checkinId, checkinTs] = decodeSnowflakes(customId)

        if (!guildId)
            throw new CheckinError(this.ERR.GuildMissing)
        if (interaction.guildId !== guildId)
            throw new CheckinError(this.ERR.NotGuild)
        if (!checkinId)
            throw new CheckinError(this.ERR.CheckinIdMissing)
        if (!checkinTs)
            throw new CheckinError(this.ERR.CheckinDateMissing)

        const checkinIdNum = Number(checkinId)
        if (Number.isNaN(checkinIdNum))
            throw new CheckinError(this.ERR.CheckinIdInvalid)

        const checkinCreatedAt = new Date(Number(checkinTs))
        if (!checkinCreatedAt)
            throw new CheckinError(this.ERR.CheckinDateInvalid)

        return { prefix, guildId, checkinId: checkinIdNum, checkinCreatedAt }
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

    static generateButtons(guildId: string, checkinId: string, checkinCreatedAt: Date): ActionRowBuilder<ButtonBuilder> {
        const detailButtonId = getCustomId([CHECKIN_DETAIL_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId), checkinCreatedAt.getTime().toString()])
        const detailButton = new ButtonBuilder()
            .setCustomId(detailButtonId)
            .setLabel('🔍 Detail')
            .setStyle(ButtonStyle.Primary)

        const approveButtonId = getCustomId([CHECKIN_APPROVE_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId), checkinCreatedAt.getTime().toString()])
        const approveButton = new ButtonBuilder()
            .setCustomId(approveButtonId)
            .setLabel('🔥 Approve')
            .setStyle(ButtonStyle.Success)

        const rejectButtonId = getCustomId([CHECKIN_REJECT_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId), checkinCreatedAt.getTime().toString()])
        const rejectButton = new ButtonBuilder()
            .setCustomId(rejectButtonId)
            .setLabel('🙅 Reject')
            .setStyle(ButtonStyle.Danger)

        const customButtonId = getCustomId([CHECKIN_CUSTOM_BUTTON_ID, encodeSnowflake(guildId), encodeSnowflake(checkinId), checkinCreatedAt.getTime().toString()])
        const customButton = new ButtonBuilder()
            .setCustomId(customButtonId)
            .setLabel('⚙️ Review')
            .setStyle(ButtonStyle.Secondary)

        return new ActionRowBuilder<ButtonBuilder>().addComponents(detailButton, approveButton, rejectButton, customButton)
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

        const hasGrindRole = this.isMemberHasRole(member, newRole.id)
        const channel = await getChannel(guild, AURA_FARMING_CHANNEL) as TextChannel

        if (!hasGrindRole) {
            await attachNewGrindRole(member, newRole)
            await sendAsBot(null, channel, {
                content: `**Congratulations, <@${member.id}>** ${this.MSG.ReachNewGrindRole(newRole)}`,
                allowedMentions: { users: [member.id], roles: [] },
            })
        }
    }

    static assertCheckinToday(user: User) {
        const latestStreak = user.checkin_streaks?.[0]
        const latestCheckin = latestStreak?.checkins?.[0]

        const hasCheckedInToday = this.hasCheckinToday(latestStreak, latestCheckin)
        const checkinIsNonRejected = this.isNotRejectedCheckin(latestCheckin)

        if (hasCheckedInToday && checkinIsNonRejected)
            throw new CheckinModalError(this.ERR.AlreadyCheckinToday(latestCheckin!.link!))
    }

    static async assertSubmittedCheckinToday<K extends keyof Prisma.CheckinWhereInput>(prisma: PrismaClient, opt: CheckinColumn<K>) {
        const checkin = await this.getWaitingCheckin(prisma, opt.key, opt.value)

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

    static async getOrCreateUser(prisma: PrismaClient, userDiscordId: string): Promise<User> {
        const select = {
            id: true,
            discord_id: true,
            created_at: true,
            updated_at: true,
            checkin_streaks: {
                orderBy: { first_date: 'desc' },
                take: 1,
                include: {
                    checkins: {
                        orderBy: { created_at: 'desc' },
                        take: 1,
                    },
                },
            },
        } satisfies Prisma.UserSelect

        return prisma.user.upsert({
            where: { discord_id: userDiscordId },
            create: { discord_id: userDiscordId },
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

        await this.setAttachments(prisma, checkin)

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

    static async getCheckin(
        prisma: PrismaClient,
        checkinId: number,
    ): Promise<CheckinType> {
        const checkin = await prisma.checkin.findUnique({
            where: { id: checkinId },
            include: {
                checkin_streak: true,
                user: true,
            },
        }) as CheckinType

        if (!checkin)
            throw new SubmittedCheckinError(this.ERR.PlainMessage)

        await this.setAttachments(prisma, checkin)

        return checkin
    }

    static async createAttachments(
        prisma: PrismaClient,
        checkin: CheckinType,
        attachments: Attachment[],
    ) {
        await prisma.$transaction(async (tx) => {
            await tx.attachment.createMany({
                data: attachments.map(a => ({
                    name: a.name,
                    url: a.url,
                    type: a.contentType ?? '',
                    size: a.size,
                    module_id: checkin.id,
                    module_type: 'CHECKIN',
                })),
            })
        })
    }

    static async setAttachments(prisma: PrismaClient, checkin: CheckinType | undefined) {
        if (!checkin)
            return

        const attachments = await prisma.attachment.findMany({
            where: {
                module_id: checkin.id,
                module_type: 'CHECKIN',
            },
            orderBy: { created_at: 'asc' },
        }) as AttachmentType[]

        checkin.attachments = attachments
    }

    static async validateCheckinStreak(
        prisma: PrismaClient,
        userId: number,
        lastCheckinStreak: CheckinStreak | undefined,
        description: string,
    ) {
        const decision = this.determineStreak(lastCheckinStreak)

        return prisma.$transaction(async (tx) => {
            const checkinStreak = await this.upsertStreak(tx, userId, lastCheckinStreak, decision)
            const checkin = await this.createCheckin(tx, userId, checkinStreak, description)

            return { checkinStreak, checkin }
        })
    }

    static async validateCheckin<K extends keyof Prisma.CheckinWhereInput>(
        client: Client,
        guild: Guild,
        reviewer: GuildMember,
        opt: CheckinColumn<K>,
        checkinCreatedAt: Date,
        checkinStatus: CheckinStatusType,
        comment?: string | null,
        isAudit: boolean = false,
    ): Promise<CheckinType> {
        if (!isAudit)
            await this.assertSubmittedCheckinToday(client.prisma, opt)
        const updatedCheckin = await this.updateCheckinStatus(client.prisma, reviewer, opt, checkinCreatedAt, checkinStatus, comment, isAudit) as CheckinType

        const checkinChannel = await getChannel(guild, CHECKIN_CHANNEL) as TextChannel
        const { messageId } = this.getMessageFromLink(updatedCheckin.link!)
        const message = await checkinChannel.messages.fetch(messageId)

        await this.validateCheckinHandleToUser(guild, reviewer, updatedCheckin.user!.discord_id, updatedCheckin)
        await this.editSubmittedCheckinMessage(message, checkinStatus)

        return updatedCheckin
    }

    static async validateCheckinHandleToUser(guild: Guild, reviewer: GuildMember, userDiscordId: string, updatedCheckin: CheckinType) {
        const member = await getMember(guild, userDiscordId)
        this.assertMember(member)

        const hasGrinderRole = this.isMemberHasRole(member, GRINDER_ROLE)
        if (!hasGrinderRole)
            await member.roles.add(GRINDER_ROLE)

        const newGrindRole = this.getNewGrindRole(guild, updatedCheckin.checkin_streak!.streak)
        await this.setMemberNewGrindRole(guild, member, newGrindRole)
        await this.sendCheckinStatusToMember(reviewer, member, updatedCheckin)
    }

    static async editSubmittedCheckinMessage(message: Message, checkinStatus: CheckinStatusType) {
        await message.react(this.REVERSED_EMOJI_STATUS[checkinStatus])

        const newRows = this.getNewButtons(message.components as ActionRow<ButtonComponent>[])
        await message.edit({ components: newRows })
    }

    static getNewButtons(components: readonly ActionRow<ButtonComponent>[]): ActionRowBuilder<ButtonBuilder>[] {
        return components
            .map((row) => {
                const buttons = row.components
                    .filter(btn => btn.customId && !this.CHECKIN_DELETED_BUTTONS.some(id => btn.customId!.startsWith(id)))
                    .map(btn => ButtonBuilder.from(btn))
                const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)

                return buttons.length ? newRow : null
            })
            .filter((row): row is ActionRowBuilder<ButtonBuilder> => row !== null)
    }

    static async updateCheckinMsgLink(interaction: Interaction, prisma: PrismaClient, checkin: CheckinType, msg: Message): Promise<CheckinType> {
        const msgLink = messageLink(interaction.channelId!, msg.id, interaction.guildId!)

        return prisma.checkin.update({
            where: { id: checkin.id },
            data: { link: msgLink },
        })
    }

    static async updateCheckinStatus<K extends keyof Prisma.CheckinWhereInput>(
        prisma: PrismaClient,
        member: GuildMember,
        opt: CheckinColumn<K>,
        checkinCreatedAt: Date,
        checkinStatus: CheckinStatusType,
        comment: string | null = null,
        isAudit: boolean = false,
    ): Promise<CheckinType> {
        const updatedDate = isAudit ? checkinCreatedAt : new Date()

        const updatedCheckin = await prisma.checkin.update({
            where: {
                [opt.key!]: opt.value!,
            } as Prisma.CheckinWhereUniqueInput,
            data: {
                status: checkinStatus,
                reviewed_by: member.id,
                comment,
                updated_at: updatedDate,
                checkin_streak: {
                    update: {
                        streak: {
                            increment: checkinStatus === 'APPROVED' ? 1 : 0,
                        },
                        last_date: updatedDate,
                        updated_at: updatedDate,
                        streak_broken_at: null,
                    },
                },
            },
            include: { user: true, checkin_streak: true },
        })

        return updatedCheckin
    }

    static async sendSuccessCheckinToMember(member: GuildMember, checkin: CheckinType) {
        const embed = createEmbed(
            `🎉 *Check-In* Berhasil`,
            this.MSG.CheckinSuccessToMember(checkin),
            DUMMY.COLOR,
            { text: DUMMY.FOOTER(member.guild.name) },
        )

        await member.send({ embeds: [embed] })
    }

    static async sendCheckinStatusToMember(reviewer: GuildMember, member: GuildMember, checkin: CheckinType) {
        let embed: EmbedBuilder

        switch (checkin.status) {
            case 'REJECTED':
                embed = createEmbed(
                    `⚠️ *Check-In* Ditolak`,
                    this.MSG.CheckinRejected(reviewer, checkin),
                    '#D9534F',
                    { text: DUMMY.FOOTER(member.guild.name) },
                )
                break

            case 'APPROVED':
                embed = createEmbed(
                    `🔥 *Check-In* Disetujui`,
                    this.MSG.CheckinApproved(reviewer, checkin),
                    '#4CAF50',
                    { text: DUMMY.FOOTER(member.guild.name) },
                )
                break

            default:
                throw new SubmittedCheckinError(this.ERR.UnknownCheckinStatus)
        }

        await member.send({ embeds: [embed] })
    }
}
