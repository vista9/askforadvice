const { createPool } = require('mysql');

const min = 10000;
const max = 999999999; // 999
function generateID(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Database {
    constructor(connectionDetails) {
        this.conn = createPool(connectionDetails);
    }

    runQuery(query = "SHOW TABLES", subarguments = []) {
        return new Promise((resolve, reject) =>
            this.conn.query(query, subarguments, (error, callback) => {
                if (error) return reject(error);
                return resolve(callback);
            })
        );
    }

    async initUsersCache(botID) {
        const isCreated = await this.runQuery("INSERT INTO cache SET ?", { id: botID, json: '{}' });
        if (!isCreated) return { error: true, stack: isCreated.stack };

        return true;
    }

    async setUsersCache(botID, cache) {
        const isUpdated = await this.runQuery("UPDATE cache SET json = ? WHERE id = ?", [JSON.stringify(cache), botID]);
        if (!isUpdated) return { error: true, stack: isUpdated.stack };

        return true;
    }

    async getUsersCache(botID) {
        const cache = await this.runQuery("SELECT * FROM cache WHERE id = ?", [botID]);
        if (!cache[0]) return await this.initUsersCache(botID).catch(() => null);

        return JSON.parse(cache[0].json);
    }


    async getUserById(id) {
        const users = await this.runQuery("SELECT * FROM users WHERE id = ?", [id]);
        if (!users[0]) return null;

        const userData = users[0];
        userData.domains = await this.runQuery("SELECT * FROM domains WHERE ownerID = ?", [users[0].id]);

        return userData;
    }

    async getUserByReceiveId(receive_id) {
        const users = await this.runQuery("SELECT * FROM users WHERE receive_id = ?", [receive_id]);
        if (!users[0]) return null;

        const userData = users[0];
        userData.domains = await this.runQuery("SELECT * FROM domains WHERE ownerID = ?", [users[0].id]);

        return userData;
    }

    async getUserByTelegram(telegram) {
        const users = await this.runQuery("SELECT * FROM users WHERE telegram = ?", [telegram]);
        if (!users[0]) return null;

        const userData = users[0];
        userData.domains = await this.runQuery("SELECT * FROM domains WHERE ownerID = ?", [users[0].id]);

        return userData;
    }

    async getUserByDomain(domain) {
        const domains = await this.runQuery("SELECT * FROM domains WHERE domain = ?", [domain]);
        if (!domains[0]) return null;

        const users = await this.runQuery("SELECT * FROM users WHERE id = ?", [domains[0].ownerID]);
        if (!users[0]) return null;

        const userData = users[0];
        userData.domains = await this.runQuery("SELECT * FROM domains WHERE ownerID = ?", [users[0].id]);

        return userData;
    }

    async createUser(telegram) {
        const receive_id = generateID(min, max);
        const isCreated = await this.runQuery("INSERT INTO users SET ?", { telegram, receive_id });
        if (!isCreated) return { error: true, stack: isCreated.stack };

        return { id: isCreated.insertId, receive_enabled: 1, receive_id, telegram };
    }

    async updateUserReceiveStatus(id, status) {
        const isUpdated = await this.runQuery("UPDATE users SET receive_enabled = ? WHERE id = ?", [status, id]);
        if (!isUpdated) return { error: true, stack: isUpdated.stack };

        return true;
    }

    async addUserDomain(domain, ownerID, paymentID) {
        const isAdded = await this.runQuery("INSERT INTO domains SET ?", { domain, ownerID, paymentID });
        if (!isAdded) return { error: true, stack: isAdded.stack };

        return true;
    }

    async removeUserDomain(domain, ownerID) {
        const isRemoved = await this.runQuery("DELETE FROM domains WHERE domain = ? AND ownerID = ?", [domain, ownerID]);
        if (!isRemoved) return { error: true, stack: isRemoved.stack };

        return true;
    }
}

module.exports = { Database };