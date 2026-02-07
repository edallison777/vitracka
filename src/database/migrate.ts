/**
 * Database Migration Runner
 * Handles database schema migrations and seeding
 */

import * as fs from 'fs';
import * as path from 'path';
import DatabaseConnection from './connection';

export class MigrationRunner {
    private db = DatabaseConnection.getInstance();

    async runMigrations(): Promise<void> {
        console.log('Starting database migrations...');

        // Create migrations table if it doesn't exist
        await this.createMigrationsTable();

        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            const migrationName = path.basename(file, '.sql');

            // Check if migration has already been run
            const hasRun = await this.hasMigrationRun(migrationName);
            if (hasRun) {
                console.log(`Migration ${migrationName} already applied, skipping...`);
                continue;
            }

            console.log(`Running migration: ${migrationName}`);

            const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

            try {
                await this.db.query(migrationSQL);
                await this.recordMigration(migrationName);
                console.log(`Migration ${migrationName} completed successfully`);
            } catch (error) {
                console.error(`Migration ${migrationName} failed:`, error);
                throw error;
            }
        }

        console.log('All migrations completed successfully');
    }

    async seedDatabase(): Promise<void> {
        console.log('Starting database seeding...');

        const seedsDir = path.join(__dirname, 'seeds');
        if (!fs.existsSync(seedsDir)) {
            console.log('No seeds directory found, skipping seeding');
            return;
        }

        const seedFiles = fs.readdirSync(seedsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of seedFiles) {
            console.log(`Running seed: ${file}`);

            const seedSQL = fs.readFileSync(path.join(seedsDir, file), 'utf8');

            try {
                await this.db.query(seedSQL);
                console.log(`Seed ${file} completed successfully`);
            } catch (error) {
                console.error(`Seed ${file} failed:`, error);
                throw error;
            }
        }

        console.log('Database seeding completed successfully');
    }

    private async createMigrationsTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await this.db.query(query);
    }

    private async hasMigrationRun(migrationName: string): Promise<boolean> {
        const query = 'SELECT COUNT(*) as count FROM migrations WHERE name = $1';
        const result = await this.db.query(query, [migrationName]);
        return parseInt(result.rows[0].count) > 0;
    }

    private async recordMigration(migrationName: string): Promise<void> {
        const query = 'INSERT INTO migrations (name) VALUES ($1)';
        await this.db.query(query, [migrationName]);
    }
}

// CLI runner
if (require.main === module) {
    const runner = new MigrationRunner();

    const command = process.argv[2];

    switch (command) {
        case 'migrate':
            runner.runMigrations()
                .then(() => {
                    console.log('Migrations completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Migration failed:', error);
                    process.exit(1);
                });
            break;

        case 'seed':
            runner.seedDatabase()
                .then(() => {
                    console.log('Seeding completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Seeding failed:', error);
                    process.exit(1);
                });
            break;

        case 'reset':
            runner.runMigrations()
                .then(() => runner.seedDatabase())
                .then(() => {
                    console.log('Database reset completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Database reset failed:', error);
                    process.exit(1);
                });
            break;

        default:
            console.log('Usage: ts-node migrate.ts [migrate|seed|reset]');
            process.exit(1);
    }
}