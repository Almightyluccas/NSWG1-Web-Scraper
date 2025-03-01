import { Pool } from 'pg';
import { DatabaseConfig } from '../../config/config';
import { DbConnectionManager } from './DbConnectionManager';

export class DatabaseInitializer {
    private dbManager: DbConnectionManager;
    private dbConfig: DatabaseConfig;

    constructor(dbConfig: DatabaseConfig) {
        this.dbConfig = dbConfig;
        this.dbManager = DbConnectionManager.getInstance(dbConfig);
    }

    private async tableExists(client: Pool, tableName: string): Promise<boolean> {
        const result = await client.query(
            'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
            ['public', tableName]
        );
        return result.rows[0].exists;
    }

    public async initialize(): Promise<void> {
        try {
            const client = await this.dbManager.getConnection();

            const tables = ['Players', 'Sessions', 'DailyActivity', 'RaidActivity'];
            for (const table of tables) {
                const exists = await this.tableExists(client, table);
                console.log(`Table ${table}: ${exists ? 'Already exists' : 'Will be created'}`);
            }

            await client.query("SET TIME ZONE 'UTC'");

            await client.query(`
                CREATE TABLE IF NOT EXISTS Players (
                    name VARCHAR(255) PRIMARY KEY,
                    is_active_raider BOOLEAN DEFAULT FALSE
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS Sessions (
                    id BIGSERIAL PRIMARY KEY,
                    cookies TEXT NOT NULL,
                    created_at BIGINT NOT NULL
                )
            `);

            await client.query('CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON Sessions(created_at)');

            await client.query(`
                CREATE TABLE IF NOT EXISTS DailyActivity (
                    date BIGINT NOT NULL,
                    player VARCHAR(255) NOT NULL REFERENCES Players(name) ON DELETE CASCADE,
                    session_start BIGINT NOT NULL,
                    session_end BIGINT NOT NULL,
                    minutes INTEGER NOT NULL,
                    PRIMARY KEY (date, player, session_start)
                )
            `);

            await client.query('CREATE INDEX IF NOT EXISTS daily_activity_player_idx ON DailyActivity(player)');
            await client.query('CREATE INDEX IF NOT EXISTS daily_activity_date_idx ON DailyActivity(date)');

            // Update the raid_type enum to use THU and SUN
            await client.query(`
                DO $$ BEGIN
                    DROP TYPE IF EXISTS raid_type CASCADE;
                    CREATE TYPE raid_type AS ENUM ('THU', 'SUN');
                    
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
                        CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');
                    END IF;
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS RaidActivity (
                    date BIGINT NOT NULL,
                    player VARCHAR(255) NOT NULL REFERENCES Players(name) ON DELETE CASCADE,
                    minutes INTEGER NOT NULL,
                    raid_type raid_type NOT NULL,
                    status attendance_status NOT NULL,
                    PRIMARY KEY (date, player)
                )
            `);

            await client.query('CREATE INDEX IF NOT EXISTS raid_activity_player_idx ON RaidActivity(player)');
            await client.query('CREATE INDEX IF NOT EXISTS raid_activity_date_idx ON RaidActivity(date)');

            const timeZoneResult = await client.query('SHOW timezone');
            console.log('Database timezone configuration:', {
                timezone: timeZoneResult.rows[0].TimeZone
            });

            console.log('Database initialization completed with GMT time zone configuration');
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }
}