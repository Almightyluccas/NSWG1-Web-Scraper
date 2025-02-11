import { DbConnectionManager } from './DbConnectionManager';
import { EncryptionService } from '../EncryptionService';
import { Session, Player, DailyActivity, RaidActivity } from '../../types';
import { TimeService } from '../TimeService';

export class DatabaseService {
    constructor(
        private dbManager: DbConnectionManager,
        private encryption: EncryptionService
    ) {}

    public async saveSession(cookies: string): Promise<number> {
        const conn = await this.dbManager.getConnection();
        try {
            const encryptedCookies = this.encryption.encrypt(cookies);
            const [result] = await conn.query(
                'INSERT INTO Sessions (cookies, created_at) VALUES (?, ?)',
                [encryptedCookies, TimeService.getESTTimestamp()]
            );
            return (result as any).insertId;
        } finally {
            await conn.release();
        }
    }

    public async getLatestSession(): Promise<Session | null> {
        const conn = await this.dbManager.getConnection();
        try {
            const [rows] = await conn.query(
                'SELECT * FROM Sessions ORDER BY created_at DESC LIMIT 1'
            );
            if (!(rows as any[]).length) return null;

            const row = (rows as any[])[0];
            return {
                id: row.id,
                cookies: this.encryption.decrypt(row.cookies),
                created_at: row.created_at 
            };
        } finally {
            await conn.release();
        }
    }

    public async putPlayer(player: Player): Promise<void> {
        const conn = await this.dbManager.getConnection();
        try {
            await conn.query(
                'INSERT INTO Players (name, is_active_raider) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_active_raider = VALUES(is_active_raider)',
                [player.name, player.is_active_raider]
            );
        } finally {
            await conn.release();
        }
    }

    public async putDailyActivity(activity: DailyActivity): Promise<void> {
        const conn = await this.dbManager.getConnection();
        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                'SELECT COUNT(*) as count FROM DailyActivity WHERE date = ? AND player = ? AND session_start = ?',
                [activity.date, activity.player, activity.session_start]
            );

            if ((rows as any[])[0].count > 0) {
                console.log(`[DB] Skipping duplicate session for ${activity.player}:`, {
                    date: TimeService.formatESTTime(activity.date),
                    start: TimeService.formatESTTime(activity.session_start),
                    end: TimeService.formatESTTime(activity.session_end)
                });
                await conn.rollback();
                return;
            }

            console.log(`[DB] Recording new activity for ${activity.player}:`, {
                date: TimeService.formatESTTime(activity.date),
                start: TimeService.formatESTTime(activity.session_start),
                end: TimeService.formatESTTime(activity.session_end),
                minutes: activity.minutes
            });
            
            await conn.query(
                'INSERT INTO DailyActivity (date, player, session_start, session_end, minutes) VALUES (?, ?, ?, ?, ?)',
                [activity.date, activity.player, activity.session_start, activity.session_end, activity.minutes]
            );

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            await conn.release();
        }
    }

    public async putRaidActivity(activity: RaidActivity): Promise<void> {
        const conn = await this.dbManager.getConnection();
        try {
            await conn.query(
                'INSERT INTO RaidActivity (date, player, minutes, raid_type, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE minutes = VALUES(minutes), status = VALUES(status)',
                [activity.date, activity.player, activity.minutes, activity.raid_type, activity.status]
            );
        } finally {
            await conn.release();
        }
    }

    public async close(): Promise<void> {
        await this.dbManager.end();
    }
}