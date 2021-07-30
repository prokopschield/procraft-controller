import { ConfigField, getConfig } from 'doge-config';
import { hash, verify } from 'doge-passwd';
import { PublicKey } from 'ssh2';
import UserSession from './UserSession';

const userdata = getConfig('users');

export default class User {
	data: ConfigField;
	sessions = new Set<UserSession>();
	constructor(name: string) {
		this.data = userdata.__getField(name);
	}
	setPublicKey(key: PublicKey) {
		return this.data.__set('pubkey', hash(key.data));
	}
	verifyPublicKey(key: PublicKey): boolean {
		return verify(key.data, this.data.str.pubkey);
	}
	setPassword(password: string) {
		return this.data.__set('passwd', hash(password));
	}
	verifyPassword(password: string): boolean {
		return verify(password, this.data.str.passwd);
	}
	addSession(session: UserSession) {
		return this.sessions.add(session);
	}
	removeSession(session: UserSession) {
		return this.sessions.delete(session);
	}
}

export const users = new Map<string, User>();

function initUser(name: string): User {
	const user = new User(name);
	users.set(name, user);
	return user;
}

export function getUser(name: string): User {
	return users.get(name) || initUser(name);
}
