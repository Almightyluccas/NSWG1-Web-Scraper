import { DbConnectionManager } from './DbConnectionManager';
import { EncryptionService } from '../EncryptionService';
import { Session, Player, DailyActivity, RaidActivity } from '../../types';
import { TimeService } from '../TimeService';
import { Pool, QueryResult } from 'pg';

export class DatabaseService {
    constructor(
        private dbManager: DbConnectionManager,
        private encryption: EncryptionService
    ) {}

    private async withConnection<T>(operation: (conn: Pool) => Promise<T>): Promise<T> {
        const conn = await this.dbManager.getConnection();
        try {
            const result = await operation(conn);
            return result;
        } catch (error) {
            console.error('Database operation error:', error);
            throw error;
        }
    }

    public async saveSession(cookies: string): Promise<number> {
        return this.withConnection<number>(async (conn) => {
            try {
                const encryptedCookies = this.encryption.encrypt(cookies);
                const result: QueryResult = await conn.query(
                    'INSERT INTO Sessions (cookies, created_at) VALUES ($1, $2) RETURNING id',
                    [encryptedCookies, TimeService.getESTTimestamp()]
                );
                
                if (!result?.rows?.[0]?.id) {
                    throw new Error('Failed to insert session - no id returned');
                }
                
                return result.rows[0].id;
            } catch (error) {
                console.error('Error saving session:', error);
                throw error;
            }
        });
    }

    public async getLatestSession(): Promise<Session | null> {
        return this.withConnection<Session | null>(async (conn) => {
            try {
                const result: QueryResult = await conn.query(
                    'SELECT * FROM Sessions ORDER BY created_at DESC LIMIT 1'
                );
                
                if (!result?.rows?.[0]) {
                    console.log('No existing session found');
                    return null;
                }

                const row = result.rows[0];
                if (!row.id || !row.cookies || !row.created_at) {
                    console.error('Invalid session data:', row);
                    return null;
                }

                return {
                    id: row.id,
                    cookies: this.encryption.decrypt(row.cookies),
                    created_at: row.created_at 
                };
            } catch (error) {
                console.error('Error retrieving latest session:', error);
                return null;
            }
        });
    }

    public async putPlayer(player: Player): Promise<void> {
        await this.withConnection<void>(async (conn) => {
            try {
                await conn.query(
                    'INSERT INTO Players (name, is_active_raider) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET is_active_raider = EXCLUDED.is_active_raider',
                    [player.name, player.is_active_raider]
                );
                console.log(`Player ${player.name} upserted successfully`);
            } catch (error) {
                console.error(`Error upserting player ${player.name}:`, error);
                throw error;
            }
        });
    }

    public async putDailyActivity(activity: DailyActivity): Promise<void> {
        await this.withConnection<void>(async (conn) => {
            try {
                await conn.query('BEGIN');

                const result: QueryResult = await conn.query(
                    'SELECT COUNT(*) as count FROM DailyActivity WHERE date = $1 AND player = $2 AND session_start = $3',
                    [activity.date, activity.player, activity.session_start]
                );

                if (!result?.rows?.[0]?.count) {
                    console.log('No duplicate activity found, proceeding with insert');
                } else if (parseInt(result.rows[0].count) > 0) {
                    console.log(`[DB] Skipping duplicate session for ${activity.player}:`, {
                        date: TimeService.formatESTTime(activity.date),
                        start: TimeService.formatESTTime(activity.session_start),
                        end: TimeService.formatESTTime(activity.session_end)
                    });
                    await conn.query('ROLLBACK');
                    return;
                }

                console.log(`[DB] Recording new activity for ${activity.player}:`, {
                    date: TimeService.formatESTTime(activity.date),
                    start: TimeService.formatESTTime(activity.session_start),
                    end: TimeService.formatESTTime(activity.session_end),
                    minutes: activity.minutes
                });
                
                await conn.query(
                    'INSERT INTO DailyActivity (date, player, session_start, session_end, minutes) VALUES ($1, $2, $3, $4, $5)',
                    [activity.date, activity.player, activity.session_start, activity.session_end, activity.minutes]
                );

                await conn.query('COMMIT');
                console.log(`[DB] Activity recorded successfully for ${activity.player}`);
            } catch (error) {
                await conn.query('ROLLBACK');
                console.error(`Error recording activity for ${activity.player}:`, error);
                throw error;
            }
        });
    }

    public async putRaidActivity(activity: RaidActivity): Promise<void> {
        await this.withConnection<void>(async (conn) => {
            try {
                await conn.query(
                    'INSERT INTO RaidActivity (date, player, minutes, raid_type, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (date, player) DO UPDATE SET minutes = EXCLUDED.minutes, status = EXCLUDED.status',
                    [activity.date, activity.player, activity.minutes, activity.raid_type, activity.status]
                );
                console.log(`Raid activity recorded for ${activity.player}`);
            } catch (error) {
                console.error(`Error recording raid activity for ${activity.player}:`, error);
                throw error;
            }
        });
    }

    public async close(): Promise<void> {
        await this.dbManager.end();
    }
}